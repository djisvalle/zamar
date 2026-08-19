# Sheet Music (PDF & MusicXML) — Design

## Status quo

`SongSource`/`SheetMode` (`src/data/types.ts`) already distinguish `'pdf' | 'musicxml' | 'type'`, and both `AddSongScreen` and `SheetView` already branch on them — but neither does anything real:

- `AddSongScreen`'s PDF/MusicXML `Dropzone` is decorative: it renders instructional text but has no `onPress`, no file picker, nothing is stored.
- `SheetView`'s `'pdf'` branch is a static `Card` with an icon and the caption "Rendered as-is... no transposition, no relayout." No PDF is ever loaded.
- `SheetView`'s `'musicxml'` branch (`StaffGraphic`) draws five staff lines and a clef glyph — it doesn't parse or draw any actual notes. It's a mockup, not a renderer.

This spec makes both paths real.

## Goals

- Picking a PDF or `.musicxml`/`.mxl` file in `AddSongScreen` actually stores it and attaches it to the song.
- Sheet tab shows the real PDF (paginated/scrollable, pinch-zoom) with freehand pen annotation.
- Sheet tab shows real engraved notation from the MusicXML, including lyrics under the staff, and **re-engraves live** when the user changes transpose (Key/Transpose in Settings) or clef — matching the promise already printed in the current placeholder copy ("fully transposable notation — re-engraves on key or clef change").

## Non-goals

- Persisting the `Song` record itself across app reloads. The store is seeded fresh from `mockSongs.ts` on every load today (`@react-native-async-storage/async-storage` is an unwired dependency) and this feature doesn't change that. The imported *file* is written to disk via `expo-file-system` (so it's viewable for the life of the app session, including navigating away and back), but the `Song.sheetFileUri` pointer to it is only as durable as the rest of the in-memory store.
- Highlighter, sticky-note text annotations, or any annotation tool beyond a single freehand pen (draw, undo-last-stroke, clear-page).
- A part-picker UI for multi-part MusicXML files — always render the first `<part>`.
- Editing MusicXML content (adding/removing notes). Display + transpose + re-clef only.
- PDF text layer, search, or text selection.

## Architecture: WebView + bundled libraries

Both renderers are implemented as a `react-native-webview` loaded via `source={{ html }}` with a mature JS engraving/rendering library inlined as a string constant — not fetched from a CDN, so sheet music renders **offline** (a live-performance app can't depend on venue wifi). `react-native-webview` works inside Expo Go on SDK 57 (confirmed against the versioned docs), so this needs no custom dev client.

- **PDF → `pdf.js`**: renders each page to an HTML `<canvas>` inside the WebView, RN controls layout.
- **MusicXML → OpenSheetMusicDisplay (OSMD)**: full engraving (beaming, ties, accidentals, lyrics-under-notes) for free.

**Why not point the WebView straight at the PDF file (`source={{ uri }}`) and let the platform's native PDF viewer render it?** That's simpler, but the native viewer owns its own pan/zoom state, which leaves no coordinate system to anchor annotation strokes to — a stroke drawn at a screen position won't stay registered with the page content once the user scrolls or zooms. Rendering pages to canvas ourselves via pdf.js means annotation strokes are stored in **page-space coordinates**, so they redraw correctly at any zoom level. This mirrors the reasoning for using OSMD instead of a hand-rolled MusicXML renderer: reuse a proven library instead of re-deriving rendering/engraving logic.

RN → WebView communication is one-directional at load (`postMessage` after `onLoadEnd`) plus event callbacks back:
- **PDF**: RN posts `{ base64, annotateMode, strokes }`. WebView posts back `{ type: 'strokeComplete', page, stroke }` and `{ type: 'height', value }` for autosizing.
- **MusicXML**: RN posts `{ base64, isCompressed, transposeSemi, clef }`. WebView posts back `{ type: 'height', value }` and `{ type: 'error', message }` if parsing/rendering fails.

## Data model changes (`src/data/types.ts`)

```ts
export interface Stroke {
  color: string;
  width: number;
  points: { x: number; y: number }[]; // page-space coordinates (unscaled PDF points)
}

export interface Song {
  ...
  sheetFileUri: string | null;              // persisted copy of the picked PDF/MusicXML/.mxl file
  sheetFileName: string | null;             // original filename, shown in SheetView's source label
  pdfAnnotations: Record<number, Stroke[]>; // page number -> strokes, empty {} by default
}
```

`mockSongs.ts`'s `seed()` helper gets `sheetFileUri: null, sheetFileName: null, pdfAnnotations: {}` defaults. `sheetMode` continues to be derived from `source` on import (as today: `pdf` source → `pdf` mode, everything else → `musicxml` mode) and stays user-overridable via the existing Settings sheet segmented control.

`store.tsx`'s `addSong` reducer case takes the new file fields as part of `NewSongInput`; a new `updateSong`-based patch is enough for annotation writes (`updateSong(id, { pdfAnnotations: { ...song.pdfAnnotations, [page]: [...strokes, newStroke] } })`) — no new reducer action needed since `updateSong` already does a generic patch merge.

## Import flow (`AddSongScreen`)

`Dropzone` becomes a real control:

1. `onPress` calls `expo-document-picker`'s `getDocumentAsync` with `type: 'application/pdf'` for the PDF tab, or `['application/vnd.recordare.musicxml+xml', 'application/vnd.recordare.musicxml', 'application/zip']` (`.mxl` files are zip containers, often reported with a generic/zip MIME type by OS pickers) for the MusicXML tab.
2. On success, copy the picked asset into `expo-file-system`'s persistent document directory using the new `File`/`Directory` API (`new File(picked.uri)` → `.copy(new File(Paths.document, picked.name))`), so the file survives even though the cache-directory copy `expo-document-picker` makes is not guaranteed to persist.
3. Store the resulting `File`'s `uri` and the original filename in local component state; `handleSave` passes them through to `store.addSong` as `sheetFileUri`/`sheetFileName`.
4. Picker cancellation is a no-op (stays on the current tab, nothing saved). A copy/read failure shows an inline error message under the dropzone and leaves `canSave` conditions unaffected by the broken file (title still required, but a PDF/MusicXML song without a successfully-copied file cannot be saved — `canSave` becomes `title.trim().length > 0 && (source === 'type' || fileReady)`).

New dependencies: `expo-document-picker`, `expo-file-system`, `react-native-webview`. `fflate` (pure-JS, no native deps) is inlined into the MusicXML WebView bundle to unzip `.mxl` client-side inside the WebView — RN itself never unzips anything.

## PDF viewer + annotation (`src/screens/live-stage/PdfViewer.tsx`)

Replaces the current placeholder `Card` in `SheetView`'s `'pdf'` branch.

- Reads `song.sheetFileUri` via `expo-file-system`, base64-encodes it, posts it into the WebView.
- WebView renders each PDF page to a `<canvas>` via pdf.js, stacked vertically, native scroll/pinch-zoom active by default.
- A header toggle (new `PenIcon`, added to `src/ui/icons.tsx` alongside the existing icon set) switches **annotate mode**:
  - **Off** (default): WebView handles scroll/zoom normally; the SVG overlay is `pointerEvents: 'none'`.
  - **On**: an `react-native-svg`-based overlay captures pan gestures to draw strokes with a fixed default pen (single color/width — no color picker, per scope), and the WebView's own scrolling is suspended (`scrollEnabled={false}` equivalent inside the injected page — avoids ambiguous gesture ownership between "drawing" and "scrolling the PDF"). Undo-last-stroke and clear-current-page buttons sit next to the pen toggle.
  - Completed strokes are converted from screen coordinates to page-space coordinates (dividing out the current pdf.js render scale) before being saved via `updateSong`, so they redraw correctly regardless of zoom level next time the page renders.
- `sourceLabel` in `SheetView` changes from the hardcoded `'Uploaded PDF — static'` to include the filename: `` `${song.sheetFileName} — static` ``, falling back to the old copy if `sheetFileName` is null (legacy/seed songs).

## MusicXML viewer (`src/screens/live-stage/MusicXmlViewer.tsx`)

Replaces `StaffGraphic` in `SheetView`'s `'musicxml'` branch (the `StaffGraphic` component and its clef-glyph-only rendering are deleted).

1. RN reads `song.sheetFileUri` as base64 via `expo-file-system`, posts `{ base64, isCompressed: uri.endsWith('.mxl'), transposeSemi: song.transposeSemi, clef: song.clef }` into the WebView after load.
2. Inside the WebView: decode base64 → if `isCompressed`, unzip with `fflate` and pull the root MusicXML entry (per the MusicXML container spec, via `META-INF/container.xml`; falling back to "the only/largest `.xml`/`.musicxml` entry" if no container file is present, which covers the common single-song `.mxl` case) → parse with the browser's native `DOMParser`.
3. Transform the DOM before rendering:
   - **Transpose**: shift every pitched `<note>`'s `<pitch><step>/<alter>/<octave>` by `transposeSemi` semitones, spelled per the same sharp/flat convention `notes.ts` already uses app-wide (reads `store.settings.enharmonic`, passed through alongside `transposeSemi`).
   - **Clef**: overwrite the first part's `<clef><sign>/<line>` to match `song.clef` (`treble`→G/2, `alto`→C/3, `bass`→F/4). Because clef only changes which staff position a given absolute pitch maps to, swapping the clef element and re-rendering with OSMD produces a musically-correct re-engraving without touching note pitches.
   - Only the first `<part>` (and its corresponding `<part-list>` entry) is kept if the file has more than one, per the non-goals above.
4. Serialize the mutated DOM back to XML with `XMLSerializer` and hand it to OSMD (`osmd.load(xmlString)` → `osmd.render()`).
5. WebView re-runs steps 1–4 (and reports a new height back to RN) whenever RN posts an updated `{ transposeSemi, clef }` — i.e., whenever the user changes Key/Transpose or Clef in Settings while the Sheet tab is open, giving the "re-engraves on key or clef change" behavior.
6. Parse/render failure (malformed XML, zero parts, unsupported structure) → WebView posts `{ type: 'error', message }`; `MusicXmlViewer` shows an inline error state ("Couldn't render this file" + the filename) instead of a blank/crashed WebView.

`sourceLabel` similarly becomes `` `${song.sheetFileName} — transposable` `` with the same legacy fallback.

## Error handling summary

| Failure | Behavior |
|---|---|
| Picker cancelled | No-op, stays on current source tab |
| File copy fails (disk error) | Inline error under the dropzone, file not attached, song can't be saved as pdf/musicxml until resolved |
| MusicXML fails to parse / 0 parts | Inline error state in `MusicXmlViewer`, filename shown |
| `.mxl` has no recognizable XML entry | Same inline error state, treated like a parse failure |
| PDF fails to render in pdf.js | Inline error state in `PdfViewer`, filename shown |

## Testing

No test runner beyond the recently-added `jest`/`jest-expo` infra (from the chord-detector work) exists yet. This feature's WebView-internal rendering (pdf.js/OSMD output) isn't practically unit-testable and needs manual verification in the running app per the project's UI-testing guidance. What *is* unit-testable and should get `jest` coverage:

- The MusicXML DOM transform logic (transpose + clef-swap), factored into a plain function that's both unit-tested directly and stringified into the WebView HTML bundle at build time — so the tested code and the shipped code are the same source, not a hand-kept-in-sync copy.
- `AddSongScreen`'s file-picking/copy flow, with `expo-document-picker` and `expo-file-system` mocked, covering: successful pick+save, cancel, and copy failure.
