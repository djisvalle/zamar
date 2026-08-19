# Sheet Music (PDF & MusicXML) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the already-scaffolded PDF and MusicXML sheet-music paths real: pick and persist a file in `AddSongScreen`, render an actual PDF (with freehand pen annotation) in `SheetView`, and render actual engraved notation from MusicXML (re-engraving live on transpose/clef change).

**Architecture:** Both renderers run inside a `react-native-webview` loaded from a self-contained HTML string with a mature JS library inlined (pdf.js for PDF, OpenSheetMusicDisplay for MusicXML) — no CDN, no network dependency at runtime. The HTML strings are produced by a Node generator script that reads the prebuilt library files out of `node_modules` plus two hand-written "driver" scripts, and are checked into the repo as generated `.ts` modules so Metro just bundles them like any other source file (no custom Metro config). RN and the WebView talk over `postMessage`/`onMessage`.

**Tech Stack:** Expo SDK 57 (managed), `expo-document-picker`, `expo-file-system` (new `File`/`Directory` API), `react-native-webview`, `fflate` (`.mxl` unzip, runs inside the WebView), `pdfjs-dist` and `opensheetmusicdisplay` (used only as a source of prebuilt browser bundles at generate-time, never imported into the RN/Metro bundle directly), `jest`/`jest-expo` (existing), `jest-environment-jsdom` (new devDependency, for the one test file that needs `DOMParser`/`XMLSerializer`).

## Global Constraints

- Read the versioned Expo SDK 57 docs (`https://docs.expo.dev/versions/v57.0.0/`) before touching any Expo API — this project's `AGENTS.md` requires it, and SDK 57's `expo-file-system` uses the new `File`/`Directory` class API, not the older `readAsStringAsync`-style functions.
- No Claude/Anthropic co-authorship or mentions in commits or code comments (`CLAUDE.md`).
- Commit subjects state what changed and why, specifically — no `fix:`/`feat:` prefixes, no vague messages (`CLAUDE.md`).
- Sheet music must render fully offline once imported — no runtime CDN/network fetch for pdf.js, OSMD, or fflate (per the approved spec, `docs/superpowers/specs/2026-08-19-sheet-music-design.md`).
- Only the first `<part>` of a MusicXML file is ever rendered; no part-picker UI (spec non-goal).
- Only a single freehand pen annotation tool (draw, undo-last-stroke, clear-page) — no highlighter, no text notes, no color picker (spec non-goal).
- `Song` records themselves still don't persist across app reloads (unchanged existing behavior); only the imported file on disk persists for the life of the app session.
- Run `npx tsc --noEmit` after every task that touches `.ts`/`.tsx` files — it must stay clean (strict mode is on).

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`, `package-lock.json` (via install commands, not hand-edited)

**Interfaces:**
- Produces: `expo-document-picker`, `expo-file-system`, `react-native-webview`, `fflate`, `pdfjs-dist`, `opensheetmusicdisplay` as installed `dependencies`; `jest-environment-jsdom` and `typescript`'s existing install as `devDependencies` available to later tasks.

- [ ] **Step 1: Install Expo-managed packages at SDK-57-compatible versions**

Run:
```bash
npx expo install expo-document-picker expo-file-system react-native-webview
```
Expected: `package.json` gains these three under `dependencies` at whatever versions `expo install` resolves for SDK 57 (it pins compatible versions automatically — don't hand-edit the versions afterward).

- [ ] **Step 2: Install the plain npm dependencies**

Run:
```bash
npm install fflate pdfjs-dist opensheetmusicdisplay
npm install --save-dev jest-environment-jsdom@~29.7.0
```
Expected: all four appear in `package.json` (first three under `dependencies`, the last under `devDependencies`, pinned to the `29.7.0` line to match the project's installed `jest@~29.7.0`).

- [ ] **Step 3: Verify the vendored files this plan depends on actually exist at these paths**

Run:
```bash
node -e "['node_modules/fflate/umd/index.js','node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js','node_modules/pdfjs-dist/legacy/build/pdf.min.mjs','node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'].forEach(p => console.log(p, require('fs').existsSync(p)))"
```
Expected: all four print `true`. If any prints `false`, the installed package version has moved the file — find its new relative path (e.g. `node -e "console.log(require('fs').readdirSync('node_modules/pdfjs-dist/legacy/build'))"`) and use that path in Task 6 instead.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add sheet-music dependencies: document picker, file system, webview, pdf.js, OSMD, fflate"
```

---

### Task 2: Data model — new Song fields

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/data/mockSongs.ts`
- Modify: `src/data/store.tsx`
- Create: `src/data/store.test.ts`

**Interfaces:**
- Produces: `Stroke` type, `Song.sheetFileUri: string | null`, `Song.sheetFileName: string | null`, `Song.pdfAnnotations: Record<number, Stroke[]>`; `NewSongInput` gains `sheetFileUri` and `sheetFileName`; `reducer` becomes an exported named export of `store.tsx` (was previously module-private) so it's unit-testable without rendering React.

- [ ] **Step 1: Add the new types to `src/data/types.ts`**

Add above `Song`:
```ts
export interface Stroke {
  color: string;
  width: number;
  points: { x: number; y: number }[]; // page-space coordinates (unscaled by zoom)
}
```

Inside `Song`, after `chart: string;`, add:
```ts
  /** persisted copy of the picked PDF/MusicXML/.mxl file, null until one is imported */
  sheetFileUri: string | null;
  /** original filename of the imported file, shown in the Sheet tab's source label */
  sheetFileName: string | null;
  /** freehand pen annotations for the pdf sheet mode, keyed by page number */
  pdfAnnotations: Record<number, Stroke[]>;
```

Change the last line to include the new input fields:
```ts
export type NewSongInput = Pick<
  Song,
  'title' | 'artist' | 'keyIdx' | 'source' | 'chart' | 'sheetFileUri' | 'sheetFileName'
>;
```

- [ ] **Step 2: Update `seed()` in `src/data/mockSongs.ts` with the new defaults**

In the object literal returned by `seed()`, after `chart: '',`, add:
```ts
    sheetFileUri: null,
    sheetFileName: null,
    pdfAnnotations: {},
```

- [ ] **Step 3: Export the reducer and thread the new fields through `addSong` in `src/data/store.tsx`**

Change `function reducer(state: State, action: Action): State {` to `export function reducer(state: State, action: Action): State {`.

In the `case 'addSong':` branch, in the `song` object literal, after `chart: action.input.chart,`, add:
```ts
        sheetFileUri: action.input.sheetFileUri,
        sheetFileName: action.input.sheetFileName,
        pdfAnnotations: {},
```

- [ ] **Step 4: Write `src/data/store.test.ts` covering the reducer directly (no React rendering needed)**

```ts
import { reducer } from './store';
import { Song } from './types';

function baseSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 's1',
    title: 'Test Song',
    artist: 'Someone',
    keyIdx: 0,
    tempo: 90,
    meter: '4/4',
    source: 'type',
    chart: '',
    transposeSemi: 0,
    capo: 0,
    clef: 'treble',
    sheetMode: 'musicxml',
    autoScroll: false,
    sheetFileUri: null,
    sheetFileName: null,
    pdfAnnotations: {},
    ...overrides,
  };
}

describe('reducer — addSong', () => {
  it('stores sheetFileUri/sheetFileName from the input and starts with empty annotations', () => {
    const state = { songs: {}, setlist: [], settings: { appearance: 'light' as const, enharmonic: 'sharp' as const, libraryGroupByKey: false } };
    const next = reducer(state, {
      type: 'addSong',
      id: 'new-song',
      addToSetlist: false,
      input: {
        title: 'My Song',
        artist: 'Me',
        keyIdx: 3,
        source: 'pdf',
        chart: '',
        sheetFileUri: 'file:///docs/my-song.pdf',
        sheetFileName: 'my-song.pdf',
      },
    });
    expect(next.songs['new-song']).toMatchObject({
      sheetFileUri: 'file:///docs/my-song.pdf',
      sheetFileName: 'my-song.pdf',
      pdfAnnotations: {},
    });
  });
});

describe('reducer — updateSong', () => {
  it('merges a pdfAnnotations patch onto the existing song', () => {
    const song = baseSong({ pdfAnnotations: { 1: [{ color: '#d33', width: 3, points: [{ x: 0, y: 0 }] }] } });
    const state = { songs: { s1: song }, setlist: [], settings: { appearance: 'light' as const, enharmonic: 'sharp' as const, libraryGroupByKey: false } };
    const next = reducer(state, {
      type: 'updateSong',
      id: 's1',
      patch: { pdfAnnotations: { ...song.pdfAnnotations, 2: [{ color: '#d33', width: 3, points: [{ x: 5, y: 5 }] }] } },
    });
    expect(Object.keys(next.songs.s1.pdfAnnotations)).toEqual(['1', '2']);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npx jest src/data/store.test.ts`
Expected: `2 passed`.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/data/types.ts src/data/mockSongs.ts src/data/store.tsx src/data/store.test.ts
git commit -m "Add sheetFileUri/sheetFileName/pdfAnnotations to the Song model"
```

---

### Task 3: New icons — Undo and Trash

**Files:**
- Modify: `src/ui/icons.tsx`

**Interfaces:**
- Produces: `UndoIcon`, `TrashIcon` (same `IconProps` shape as every other icon in the file: `{ size?, color?, strokeWidth? }`). The PDF annotate-mode toggle itself reuses the existing `EditIcon` (already a pen glyph) — no new icon needed for that.

- [ ] **Step 1: Add the two icons, following the existing file's pattern (uses the shared `base()` helper)**

Append to `src/ui/icons.tsx`:
```tsx
export function UndoIcon({ size = 16, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M9 14 4 9l5-5" />
      <Path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </Svg>
  );
}

export function TrashIcon({ size = 16, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M3 6h18" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Line x1="10" y1="11" x2="10" y2="17" />
      <Line x1="14" y1="11" x2="14" y2="17" />
    </Svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/icons.tsx
git commit -m "Add Undo and Trash icons for PDF annotation controls"
```

---

### Task 4: MusicXML transpose/clef transform (TDD)

**Files:**
- Create: `src/music/musicxmlTransform.ts`
- Create: `src/music/musicxmlTransform.test.ts`

**Interfaces:**
- Consumes: nothing — this file must have **zero imports**. Its compiled JS is inlined verbatim into the MusicXML WebView bundle (Task 6), where no module system exists, only browser globals (`DOMParser`, `XMLSerializer`).
- Produces: `transposePitch(step: string, alter: number, octave: number, semitones: number, enharmonic: 'sharp' | 'flat'): { step: string; alter: number; octave: number }`, `clefForName(clef: 'treble' | 'alto' | 'bass'): { sign: string; line: number }`, `transformMusicXml(xml: string, opts: { transposeSemi: number; enharmonic: 'sharp' | 'flat'; clef: 'treble' | 'alto' | 'bass' }): string` — all used by Task 10's `MusicXmlViewer` (indirectly, via the generated WebView bundle) and directly by this task's tests.

- [ ] **Step 1: Write the failing tests first**

Create `src/music/musicxmlTransform.test.ts`:
```ts
/**
 * @jest-environment jsdom
 */
import { transposePitch, clefForName, transformMusicXml } from './musicxmlTransform';

describe('transposePitch', () => {
  it('shifts within an octave, sharp spelling', () => {
    expect(transposePitch('C', 0, 4, 1, 'sharp')).toEqual({ step: 'C', alter: 1, octave: 4 });
  });

  it('shifts within an octave, flat spelling', () => {
    expect(transposePitch('C', 0, 4, 1, 'flat')).toEqual({ step: 'D', alter: -1, octave: 4 });
  });

  it('rolls over into the next octave', () => {
    expect(transposePitch('B', 0, 4, 1, 'sharp')).toEqual({ step: 'C', alter: 0, octave: 5 });
  });

  it('rolls down into the previous octave', () => {
    expect(transposePitch('C', 0, 4, -1, 'sharp')).toEqual({ step: 'B', alter: 0, octave: 3 });
  });

  it('respells an already-altered pitch (F# up a whole step, sharp spelling)', () => {
    expect(transposePitch('F', 1, 4, 2, 'sharp')).toEqual({ step: 'G', alter: 1, octave: 4 });
  });

  it('handles zero transposition as a no-op respelling', () => {
    expect(transposePitch('E', 0, 5, 0, 'sharp')).toEqual({ step: 'E', alter: 0, octave: 5 });
  });
});

describe('clefForName', () => {
  it('maps treble to G/2, alto to C/3, bass to F/4', () => {
    expect(clefForName('treble')).toEqual({ sign: 'G', line: 2 });
    expect(clefForName('alto')).toEqual({ sign: 'C', line: 3 });
    expect(clefForName('bass')).toEqual({ sign: 'F', line: 4 });
  });
});

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
    <score-part id="P2"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
      <note>
        <pitch><step>F</step><alter>1</alter><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <note><rest/><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('transformMusicXml', () => {
  function parse(xml: string) {
    return new DOMParser().parseFromString(xml, 'application/xml');
  }

  it('keeps only the first part, in both <part> and <part-list>', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' }));
    expect(out.getElementsByTagName('part')).toHaveLength(1);
    expect(out.getElementsByTagName('part')[0].getAttribute('id')).toBe('P1');
    expect(out.getElementsByTagName('score-part')).toHaveLength(1);
    expect(out.getElementsByTagName('score-part')[0].getAttribute('id')).toBe('P1');
  });

  it('rewrites the clef', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'alto' }));
    const clef = out.getElementsByTagName('clef')[0];
    expect(clef.getElementsByTagName('sign')[0].textContent).toBe('C');
    expect(clef.getElementsByTagName('line')[0].textContent).toBe('3');
  });

  it('transposes every pitch in the kept part by the given semitones', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 2, enharmonic: 'sharp', clef: 'treble' }));
    const pitches = Array.from(out.getElementsByTagName('pitch'));
    expect(pitches).toHaveLength(2);

    const first = pitches[0];
    expect(first.getElementsByTagName('step')[0].textContent).toBe('D');
    expect(first.getElementsByTagName('octave')[0].textContent).toBe('4');
    expect(first.getElementsByTagName('alter')).toHaveLength(0);

    const second = pitches[1];
    // F#4 (pc 6) + 2 semitones = pc 8 = G#4 in sharp spelling
    expect(second.getElementsByTagName('step')[0].textContent).toBe('G');
    expect(second.getElementsByTagName('alter')[0].textContent).toBe('1');
    expect(second.getElementsByTagName('octave')[0].textContent).toBe('4');
  });

  it('throws on malformed XML', () => {
    expect(() => transformMusicXml('<not-valid', { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' })).toThrow();
  });

  it('throws on a score-timewise root', () => {
    const timewise = '<score-timewise version="3.1"></score-timewise>';
    expect(() => transformMusicXml(timewise, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' })).toThrow(
      'score-partwise',
    );
  });

  it('throws when there are no <part> elements', () => {
    const noParts = '<score-partwise version="3.1"><part-list></part-list></score-partwise>';
    expect(() => transformMusicXml(noParts, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' })).toThrow(
      'part',
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/music/musicxmlTransform.test.ts`
Expected: FAIL — `Cannot find module './musicxmlTransform'`.

- [ ] **Step 3: Implement `src/music/musicxmlTransform.ts`**

```ts
// Self-contained on purpose: no imports, nothing from React/React Native.
// This file's compiled-to-JS output is inlined verbatim into the MusicXML
// WebView bundle by scripts/generate-webview-bundles.js, where it runs with
// no module system -- only the browser globals DOMParser/XMLSerializer and
// this file's own top-level declarations exist. It's also unit-tested
// directly (in a jsdom environment) from musicxmlTransform.test.ts, so the
// tested code and the shipped code are exactly the same source.

export type Clef = 'treble' | 'alto' | 'bass';
export type Enharmonic = 'sharp' | 'flat';

interface TransformOptions {
  transposeSemi: number;
  enharmonic: Enharmonic;
  clef: Clef;
}

const STEP_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SHARP_SPELLING: { step: string; alter: number }[] = [
  { step: 'C', alter: 0 }, { step: 'C', alter: 1 }, { step: 'D', alter: 0 }, { step: 'D', alter: 1 },
  { step: 'E', alter: 0 }, { step: 'F', alter: 0 }, { step: 'F', alter: 1 }, { step: 'G', alter: 0 },
  { step: 'G', alter: 1 }, { step: 'A', alter: 0 }, { step: 'A', alter: 1 }, { step: 'B', alter: 0 },
];

const FLAT_SPELLING: { step: string; alter: number }[] = [
  { step: 'C', alter: 0 }, { step: 'D', alter: -1 }, { step: 'D', alter: 0 }, { step: 'E', alter: -1 },
  { step: 'E', alter: 0 }, { step: 'F', alter: 0 }, { step: 'G', alter: -1 }, { step: 'G', alter: 0 },
  { step: 'A', alter: -1 }, { step: 'A', alter: 0 }, { step: 'B', alter: -1 }, { step: 'B', alter: 0 },
];

const CLEF_SIGN: Record<Clef, { sign: string; line: number }> = {
  treble: { sign: 'G', line: 2 },
  alto: { sign: 'C', line: 3 },
  bass: { sign: 'F', line: 4 },
};

export function transposePitch(
  step: string,
  alter: number,
  octave: number,
  semitones: number,
  enharmonic: Enharmonic,
): { step: string; alter: number; octave: number } {
  const base = STEP_SEMITONE[step];
  if (base === undefined) return { step, alter, octave };
  const absolute = octave * 12 + base + alter;
  const shifted = absolute + semitones;
  const newOctave = Math.floor(shifted / 12);
  const pitchClass = ((shifted % 12) + 12) % 12;
  const spelling = (enharmonic === 'flat' ? FLAT_SPELLING : SHARP_SPELLING)[pitchClass];
  return { step: spelling.step, alter: spelling.alter, octave: newOctave };
}

export function clefForName(clef: Clef): { sign: string; line: number } {
  return CLEF_SIGN[clef];
}

export function transformMusicXml(xml: string, opts: TransformOptions): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Could not parse MusicXML');
  }
  const root = doc.documentElement;
  if (!root || root.tagName !== 'score-partwise') {
    throw new Error('Only score-partwise MusicXML files are supported');
  }

  const parts = Array.from(doc.getElementsByTagName('part')).filter((el) => el.parentNode === root);
  if (parts.length === 0) {
    throw new Error('No <part> elements found');
  }
  const firstPart = parts[0];
  const firstPartId = firstPart.getAttribute('id');

  for (let i = parts.length - 1; i >= 1; i--) {
    parts[i].parentNode?.removeChild(parts[i]);
  }

  const partListEls = doc.getElementsByTagName('part-list');
  if (partListEls.length > 0) {
    const scoreParts = Array.from(partListEls[0].getElementsByTagName('score-part'));
    for (const scorePart of scoreParts) {
      if (scorePart.getAttribute('id') !== firstPartId) {
        scorePart.parentNode?.removeChild(scorePart);
      }
    }
  }

  const pitches = Array.from(firstPart.getElementsByTagName('pitch'));
  for (const pitchEl of pitches) {
    const stepEl = pitchEl.getElementsByTagName('step')[0];
    const alterEl = pitchEl.getElementsByTagName('alter')[0];
    const octaveEl = pitchEl.getElementsByTagName('octave')[0];
    if (!stepEl || !octaveEl) continue;

    const step = (stepEl.textContent || 'C').trim();
    const alter = alterEl ? parseInt(alterEl.textContent || '0', 10) : 0;
    const octave = parseInt(octaveEl.textContent || '4', 10);

    const next = transposePitch(step, alter, octave, opts.transposeSemi, opts.enharmonic);

    stepEl.textContent = next.step;
    octaveEl.textContent = String(next.octave);

    if (next.alter !== 0) {
      let target = alterEl;
      if (!target) {
        target = doc.createElement('alter');
        pitchEl.insertBefore(target, octaveEl);
      }
      target.textContent = String(next.alter);
    } else if (alterEl) {
      alterEl.parentNode?.removeChild(alterEl);
    }
  }

  const { sign, line } = clefForName(opts.clef);
  const clefEls = Array.from(firstPart.getElementsByTagName('clef'));
  for (const clefEl of clefEls) {
    const signEl = clefEl.getElementsByTagName('sign')[0];
    const lineEl = clefEl.getElementsByTagName('line')[0];
    if (signEl) signEl.textContent = sign;
    if (lineEl) lineEl.textContent = String(line);
  }

  return new XMLSerializer().serializeToString(doc);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/music/musicxmlTransform.test.ts`
Expected: `13 passed`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/music/musicxmlTransform.ts src/music/musicxmlTransform.test.ts
git commit -m "Add MusicXML transpose/clef transform, unit-tested in a jsdom environment"
```

---

### Task 5: WebView driver scripts (hand-written, plain JS)

**Files:**
- Create: `scripts/webview-drivers/musicxml-driver.js`
- Create: `scripts/webview-drivers/pdf-driver.js`

**Interfaces:**
- Consumes (musicxml-driver.js, at runtime inside the WebView, provided by globals set up in Task 6's generated HTML): `window.fflate.unzipSync(bytes: Uint8Array): Record<string, Uint8Array>`, `window.opensheetmusicdisplay.OpenSheetMusicDisplay`, `window.transformMusicXml(xml, opts)` (from Task 4).
- Consumes (pdf-driver.js, at runtime): `window.__PDFJS_SRC__: string`, `window.__PDFJS_WORKER_SRC__: string` (set by Task 6's generated HTML).
- Produces: both scripts post JSON messages back to RN via `window.ReactNativeWebView.postMessage`, and accept JSON messages via `document`/`window` `'message'` events — this is the wire protocol Tasks 9 and 10 (`PdfViewer`/`MusicXmlViewer`) implement the RN side of.
  - MusicXML → RN messages: `{ type: 'height', value: number }`, `{ type: 'error', message: string }`.
  - MusicXML ← RN messages: `{ type: 'render', base64: string, isCompressed: boolean, transposeSemi: number, enharmonic: 'sharp' | 'flat', clef: 'treble' | 'alto' | 'bass' }`.
  - PDF → RN messages: `{ type: 'height', value: number }`, `{ type: 'error', message: string }`, `{ type: 'strokeComplete', page: number, stroke: Stroke }`.
  - PDF ← RN messages: `{ type: 'load', base64: string, annotations: Record<number, Stroke[]> }`, `{ type: 'setAnnotateMode', value: boolean }`, `{ type: 'undoLastStroke', page: number }`, `{ type: 'clearPage', page: number }`.

These are plain runtime JS files (no TypeScript, no build step of their own — they get inlined as-is by Task 6's generator) and aren't unit tested directly; Task 12's manual verification exercises them end to end. Keep them free of ES2020+ syntax that older WebView JS engines might choke on (stick to `function`, `var`/`const`, arrow functions, `async`/`await`, template literals — all safe on any WebView Expo SDK 57 targets).

- [ ] **Step 1: Create `scripts/webview-drivers/musicxml-driver.js`**

```js
(function () {
  function post(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
  }

  function b64ToUint8Array(b64) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  function findXmlEntry(files) {
    var names = Object.keys(files);
    var containerName = names.filter(function (n) { return n === 'META-INF/container.xml'; })[0];
    if (containerName) {
      var containerXml = new TextDecoder('utf-8').decode(files[containerName]);
      var containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
      var rootfile = containerDoc.getElementsByTagName('rootfile')[0];
      var fullPath = rootfile && rootfile.getAttribute('full-path');
      if (fullPath && files[fullPath]) return files[fullPath];
    }
    var xmlName = names.filter(function (n) {
      return /\.(musicxml|xml)$/i.test(n) && n.indexOf('META-INF/') !== 0;
    })[0];
    return xmlName ? files[xmlName] : null;
  }

  var osmd = null;

  async function render(msg) {
    try {
      var bytes = b64ToUint8Array(msg.base64);
      var xmlText;
      if (msg.isCompressed) {
        var files = fflate.unzipSync(bytes);
        var entry = findXmlEntry(files);
        if (!entry) throw new Error('No MusicXML entry found in .mxl archive');
        xmlText = new TextDecoder('utf-8').decode(entry);
      } else {
        xmlText = new TextDecoder('utf-8').decode(bytes);
      }

      var transformed = window.transformMusicXml(xmlText, {
        transposeSemi: msg.transposeSemi,
        enharmonic: msg.enharmonic,
        clef: msg.clef,
      });

      if (!osmd) {
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay('osmd-container', {
          autoResize: false,
          drawTitle: false,
        });
      }
      await osmd.load(transformed);
      osmd.render();

      var height = document.getElementById('osmd-container').scrollHeight;
      post({ type: 'height', value: height });
    } catch (err) {
      post({ type: 'error', message: (err && err.message) || String(err) });
    }
  }

  function onMessage(event) {
    var msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    if (msg.type === 'render') render(msg);
  }

  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);
})();
```

- [ ] **Step 2: Create `scripts/webview-drivers/pdf-driver.js`**

```js
function post(msg) {
  var s = JSON.stringify(msg);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
}

function b64ToUint8Array(b64) {
  var bin = atob(b64);
  var arr = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function pointsToPath(points) {
  if (!points.length) return '';
  var d = 'M ' + points[0].x + ' ' + points[0].y;
  for (var i = 1; i < points.length; i++) d += ' L ' + points[i].x + ' ' + points[i].y;
  return d;
}

var pdfjsLib = null;
var pdfDoc = null;
var scale = 1.5;
var annotateMode = false;
var strokesByPage = {};
var currentStroke = null;
var currentStrokePage = null;

async function ensurePdfJs() {
  if (pdfjsLib) return pdfjsLib;
  var blob = new Blob([window.__PDFJS_SRC__], { type: 'text/javascript' });
  var url = URL.createObjectURL(blob);
  pdfjsLib = await import(/* webpackIgnore: true */ url);
  var workerBlob = new Blob([window.__PDFJS_WORKER_SRC__], { type: 'text/javascript' });
  pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
  return pdfjsLib;
}

function redrawStrokes(pageNum) {
  var svg = document.getElementById('ink-page-' + pageNum);
  if (!svg) return;
  svg.innerHTML = '';
  (strokesByPage[pageNum] || []).forEach(function (stroke) {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pointsToPath(stroke.points));
    path.setAttribute('stroke', stroke.color);
    path.setAttribute('stroke-width', String(stroke.width));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  });
}

function drawLive(svg, stroke) {
  var live = svg.querySelector('#live-stroke');
  if (!live) {
    live = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    live.setAttribute('id', 'live-stroke');
    live.setAttribute('fill', 'none');
    live.setAttribute('stroke-linecap', 'round');
    live.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(live);
  }
  live.setAttribute('stroke', stroke.color);
  live.setAttribute('stroke-width', String(stroke.width));
  live.setAttribute('d', pointsToPath(stroke.points));
}

function attachDrawing(svg, pageNum) {
  svg.addEventListener('pointerdown', function (e) {
    if (!annotateMode) return;
    var rect = svg.getBoundingClientRect();
    currentStroke = {
      color: '#d33',
      width: 3,
      points: [{ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }],
    };
    currentStrokePage = pageNum;
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', function (e) {
    if (!annotateMode || !currentStroke || currentStrokePage !== pageNum) return;
    var rect = svg.getBoundingClientRect();
    currentStroke.points.push({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
    drawLive(svg, currentStroke);
  });
  svg.addEventListener('pointerup', function () {
    if (!annotateMode || !currentStroke || currentStrokePage !== pageNum) return;
    strokesByPage[pageNum] = (strokesByPage[pageNum] || []).concat([currentStroke]);
    var live = svg.querySelector('#live-stroke');
    if (live) svg.removeChild(live);
    redrawStrokes(pageNum);
    post({ type: 'strokeComplete', page: pageNum, stroke: currentStroke });
    currentStroke = null;
    currentStrokePage = null;
  });
}

async function renderAllPages() {
  var container = document.getElementById('pages');
  container.innerHTML = '';
  for (var pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    var page = await pdfDoc.getPage(pageNum);
    var viewport = page.getViewport({ scale: scale });

    var wrapper = document.createElement('div');
    wrapper.style.position = 'relative';

    var canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    wrapper.appendChild(canvas);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'ink-page-' + pageNum);
    svg.setAttribute('width', String(viewport.width));
    svg.setAttribute('height', String(viewport.height));
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = annotateMode ? 'auto' : 'none';
    wrapper.appendChild(svg);

    container.appendChild(wrapper);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
    redrawStrokes(pageNum);
    attachDrawing(svg, pageNum);
  }
  post({ type: 'height', value: container.scrollHeight });
}

async function handleMessage(msg) {
  try {
    if (msg.type === 'load') {
      await ensurePdfJs();
      var bytes = b64ToUint8Array(msg.base64);
      pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
      strokesByPage = msg.annotations || {};
      await renderAllPages();
    } else if (msg.type === 'setAnnotateMode') {
      annotateMode = !!msg.value;
      Array.prototype.forEach.call(document.querySelectorAll('svg[id^="ink-page-"]'), function (svg) {
        svg.style.pointerEvents = annotateMode ? 'auto' : 'none';
      });
    } else if (msg.type === 'undoLastStroke') {
      var arr = (strokesByPage[msg.page] || []).slice();
      arr.pop();
      strokesByPage[msg.page] = arr;
      redrawStrokes(msg.page);
    } else if (msg.type === 'clearPage') {
      strokesByPage[msg.page] = [];
      redrawStrokes(msg.page);
    }
  } catch (err) {
    post({ type: 'error', message: (err && err.message) || String(err) });
  }
}

function onMessage(event) {
  var msg;
  try {
    msg = JSON.parse(event.data);
  } catch (err) {
    return;
  }
  handleMessage(msg);
}

document.addEventListener('message', onMessage);
window.addEventListener('message', onMessage);
```

- [ ] **Step 3: Commit**

```bash
git add scripts/webview-drivers/musicxml-driver.js scripts/webview-drivers/pdf-driver.js
git commit -m "Add hand-written WebView driver scripts for MusicXML and PDF rendering"
```

---

### Task 6: Generator script — build the WebView HTML bundles

**Files:**
- Create: `scripts/generate-webview-bundles.js`
- Modify: `package.json` (new `generate:webview-bundles` script)
- Create (generated, checked in): `src/screens/live-stage/generated/musicXmlViewerHtml.ts`, `src/screens/live-stage/generated/pdfViewerHtml.ts`

**Interfaces:**
- Consumes: `src/music/musicxmlTransform.ts` (Task 4), `scripts/webview-drivers/musicxml-driver.js` and `pdf-driver.js` (Task 5), the vendored files verified in Task 1 Step 3.
- Produces: `export const MUSIC_XML_VIEWER_HTML: string` and `export const PDF_VIEWER_HTML: string` — consumed by `MusicXmlViewer` (Task 10) and `PdfViewer` (Task 9) as `source={{ html: ... }}`.

- [ ] **Step 1: Write `scripts/generate-webview-bundles.js`**

```js
#!/usr/bin/env node
// Regenerates the self-contained WebView HTML bundles for PDF and MusicXML
// rendering (src/screens/live-stage/generated/*.ts). Re-run this whenever
// src/music/musicxmlTransform.ts, scripts/webview-drivers/*.js, or the
// pdfjs-dist/opensheetmusicdisplay/fflate dependency versions change, then
// commit the regenerated output.
//
//   node scripts/generate-webview-bundles.js

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src/screens/live-stage/generated');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function compileTransform() {
  const src = read('src/music/musicxmlTransform.ts');
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2019 },
  });
  return outputText;
}

function writeGenerated(fileName, constName, html) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const banner = '// GENERATED FILE. Do not edit by hand — run `npm run generate:webview-bundles`.\n';
  const contents = `${banner}export const ${constName} = ${JSON.stringify(html)};\n`;
  fs.writeFileSync(path.join(OUT_DIR, fileName), contents, 'utf8');
  console.log(`wrote ${fileName} (${Math.round(contents.length / 1024)} KB)`);
}

function buildMusicXmlHtml() {
  const fflateSrc = read('node_modules/fflate/umd/index.js');
  const osmdSrc = read('node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js');
  const transformJs = compileTransform();
  const driver = read('scripts/webview-drivers/musicxml-driver.js');

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head><meta charset="utf-8" /><style>html,body{margin:0;padding:0;background:#fff;}</style></head>',
    '<body>',
    '<div id="osmd-container"></div>',
    `<script>${fflateSrc}</script>`,
    `<script>${osmdSrc}</script>`,
    `<script>(function(){${transformJs}\nwindow.transformMusicXml = transformMusicXml;})();</script>`,
    `<script>${driver}</script>`,
    '</body>',
    '</html>',
  ].join('\n');
}

function buildPdfHtml() {
  const pdfjsSrc = read('node_modules/pdfjs-dist/legacy/build/pdf.min.mjs');
  const pdfWorkerSrc = read('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs');
  const driver = read('scripts/webview-drivers/pdf-driver.js');

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head><meta charset="utf-8" /><style>',
    'html,body{margin:0;padding:0;background:#fff;}',
    '#pages{display:flex;flex-direction:column;align-items:center;}',
    'canvas{display:block;margin-bottom:8px;}',
    '</style></head>',
    '<body>',
    '<div id="pages"></div>',
    '<script>',
    `window.__PDFJS_SRC__ = ${JSON.stringify(pdfjsSrc)};`,
    `window.__PDFJS_WORKER_SRC__ = ${JSON.stringify(pdfWorkerSrc)};`,
    '</script>',
    `<script type="module">${driver}</script>`,
    '</body>',
    '</html>',
  ].join('\n');
}

writeGenerated('musicXmlViewerHtml.ts', 'MUSIC_XML_VIEWER_HTML', buildMusicXmlHtml());
writeGenerated('pdfViewerHtml.ts', 'PDF_VIEWER_HTML', buildPdfHtml());
```

- [ ] **Step 2: Add the npm script**

In `package.json`'s `"scripts"` block, add:
```json
    "generate:webview-bundles": "node scripts/generate-webview-bundles.js"
```

- [ ] **Step 3: Run it**

Run: `npm run generate:webview-bundles`
Expected: prints two `wrote ...` lines with non-zero KB sizes, and creates `src/screens/live-stage/generated/musicXmlViewerHtml.ts` + `pdfViewerHtml.ts`.

- [ ] **Step 4: Sanity-check the generated output loads as valid TS**

Run: `npx tsc --noEmit`
Expected: no errors (these files are plain `export const X = "...";` — should type-check trivially once they exist; nothing imports them yet, which is fine at this point).

- [ ] **Step 5: Commit, including the generated files**

```bash
git add scripts/generate-webview-bundles.js package.json src/screens/live-stage/generated/musicXmlViewerHtml.ts src/screens/live-stage/generated/pdfViewerHtml.ts
git commit -m "Add generator for self-contained MusicXML/PDF WebView HTML bundles"
```

---

### Task 7: File import helper

**Files:**
- Create: `src/data/importSheetFile.ts`
- Create: `src/data/importSheetFile.test.ts`

**Interfaces:**
- Produces: `PDF_MIME_TYPES: string[]`, `MUSICXML_MIME_TYPES: string[]`, `PickedSheetFile { uri: string; name: string }`, `pickAndCopySheetFile(mimeTypes: string[]): Promise<PickedSheetFile | null>` — consumed by `AddSongScreen` in Task 8.

- [ ] **Step 1: Write the failing test first**

Create `src/data/importSheetFile.test.ts`:
```ts
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

const copyMock = jest.fn();
// Mimics expo-file-system's File constructor: new File(uri) or new File(dir, name)
// — join the two-arg form the same way a real path join would, so assertions
// on the resulting uri reflect what production code actually produces.
const FileMock = jest.fn().mockImplementation((...args: string[]) => ({
  uri: args.length > 1 ? `${args[0]}${args[1]}` : args[0],
  copy: copyMock,
}));

jest.mock('expo-file-system', () => ({
  File: FileMock,
  Paths: { document: 'file:///docs/' },
}));

import * as DocumentPicker from 'expo-document-picker';
import { pickAndCopySheetFile, PDF_MIME_TYPES } from './importSheetFile';

describe('pickAndCopySheetFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the user cancels', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true });
    const result = await pickAndCopySheetFile(PDF_MIME_TYPES);
    expect(result).toBeNull();
    expect(copyMock).not.toHaveBeenCalled();
  });

  it('copies the picked file into the document directory and returns its uri/name', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/abc.pdf', name: 'My Song.pdf' }],
    });
    copyMock.mockResolvedValue(undefined);

    const result = await pickAndCopySheetFile(PDF_MIME_TYPES);

    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: PDF_MIME_TYPES, copyToCacheDirectory: true, multiple: false }),
    );
    expect(FileMock).toHaveBeenNthCalledWith(1, 'file:///cache/abc.pdf');
    expect(copyMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ uri: expect.stringContaining('My Song.pdf'), name: 'My Song.pdf' });
  });

  it('propagates a copy failure to the caller', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/broken.pdf', name: 'broken.pdf' }],
    });
    copyMock.mockRejectedValue(new Error('disk full'));

    await expect(pickAndCopySheetFile(PDF_MIME_TYPES)).rejects.toThrow('disk full');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/data/importSheetFile.test.ts`
Expected: FAIL — `Cannot find module './importSheetFile'`.

- [ ] **Step 3: Implement `src/data/importSheetFile.ts`**

```ts
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';

export const PDF_MIME_TYPES = ['application/pdf'];

// .mxl is a zip container and OS pickers frequently report it with a
// generic/zip MIME type rather than the MusicXML-specific ones.
export const MUSICXML_MIME_TYPES = [
  'application/vnd.recordare.musicxml+xml',
  'application/vnd.recordare.musicxml',
  'application/zip',
  'application/octet-stream',
];

export interface PickedSheetFile {
  uri: string;
  name: string;
}

export async function pickAndCopySheetFile(mimeTypes: string[]): Promise<PickedSheetFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: mimeTypes,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const picked = new File(asset.uri);
  const dest = new File(Paths.document, `${Date.now()}-${asset.name}`);
  await picked.copy(dest);

  return { uri: dest.uri, name: asset.name };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/data/importSheetFile.test.ts`
Expected: `3 passed`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/importSheetFile.ts src/data/importSheetFile.test.ts
git commit -m "Add pickAndCopySheetFile: document picker + persistent copy, unit-tested with mocks"
```

---

### Task 8: Wire `AddSongScreen` to real file picking

**Files:**
- Modify: `src/screens/AddSongScreen.tsx`

**Interfaces:**
- Consumes: `pickAndCopySheetFile`, `PDF_MIME_TYPES`, `MUSICXML_MIME_TYPES` from `src/data/importSheetFile.ts` (Task 7); `NewSongInput` now requires `sheetFileUri`/`sheetFileName` (Task 2).

- [ ] **Step 1: Replace the static `Dropzone` usage with a functional import flow**

In `src/screens/AddSongScreen.tsx`, add imports:
```ts
import { pickAndCopySheetFile, PDF_MIME_TYPES, MUSICXML_MIME_TYPES } from '../data/importSheetFile';
```

Add state (alongside the existing `useState` calls):
```ts
  const [sheetFileUri, setSheetFileUri] = useState<string | null>(null);
  const [sheetFileName, setSheetFileName] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
```

Replace:
```ts
  const canSave = title.trim().length > 0;
```
with:
```ts
  const fileReady = source === 'type' || Boolean(sheetFileUri);
  const canSave = title.trim().length > 0 && fileReady;
```

Add a handler function above `handleSave`:
```ts
  async function handlePickFile() {
    setPickError(null);
    setPicking(true);
    try {
      const picked = await pickAndCopySheetFile(source === 'pdf' ? PDF_MIME_TYPES : MUSICXML_MIME_TYPES);
      if (picked) {
        setSheetFileUri(picked.uri);
        setSheetFileName(picked.name);
      }
    } catch {
      setPickError('Could not import that file. Please try again.');
    } finally {
      setPicking(false);
    }
  }
```

Update `handleSave` to pass the new fields:
```ts
  function handleSave() {
    if (!canSave) return;
    const id = store.addSong(
      {
        title: title.trim(),
        artist: artist.trim(),
        keyIdx,
        source,
        chart: source === 'type' ? chart : '',
        sheetFileUri: source === 'type' ? null : sheetFileUri,
        sheetFileName: source === 'type' ? null : sheetFileName,
      },
      addToSetlist,
    );
    navigation.replace('LiveStage', { songId: id });
  }
```

- [ ] **Step 2: Clear picked-file state when the source tab changes**

Change the `SOURCES.map` button's `onPress` from `() => setSource(s.value)` to:
```tsx
                onPress={() => {
                  setSource(s.value);
                  setSheetFileUri(null);
                  setSheetFileName(null);
                  setPickError(null);
                }}
```

- [ ] **Step 3: Make the PDF/MusicXML dropzones actually pickable and show the picked filename / error**

Replace:
```tsx
        {source === 'pdf' && (
          <Dropzone text="Drop a PDF here or tap to browse. Rendered as-is — annotation-only, no transposition." />
        )}
        {source === 'musicxml' && (
          <Dropzone text="Drop a .musicxml / .mxl file here. Fully transposable once imported." />
        )}
```
with:
```tsx
        {source === 'pdf' && (
          <Dropzone
            text={
              sheetFileName
                ? `Selected: ${sheetFileName}`
                : picking
                ? 'Opening file browser…'
                : 'Tap to choose a PDF. Rendered as-is — annotation-only, no transposition.'
            }
            onPress={handlePickFile}
            disabled={picking}
          />
        )}
        {source === 'musicxml' && (
          <Dropzone
            text={
              sheetFileName
                ? `Selected: ${sheetFileName}`
                : picking
                ? 'Opening file browser…'
                : 'Tap to choose a .musicxml / .mxl file. Fully transposable once imported.'
            }
            onPress={handlePickFile}
            disabled={picking}
          />
        )}
        {pickError && (source === 'pdf' || source === 'musicxml') && (
          <Text style={{ fontSize: 12, color: colors.text, opacity: 0.75 }}>{pickError}</Text>
        )}
```

- [ ] **Step 4: Make `Dropzone` itself pressable**

Replace the `Dropzone` component:
```tsx
function Dropzone({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.divider,
        borderRadius: radius.md,
        padding: 24,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <UploadIcon size={24} color={colors.text} strokeWidth={2} />
      <Text style={{ fontSize: 13, color: colors.text, opacity: 0.8, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}
```
with:
```tsx
function Dropzone({ text, onPress, disabled }: { text: string; onPress?: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.divider,
        borderRadius: radius.md,
        padding: 24,
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <UploadIcon size={24} color={colors.text} strokeWidth={2} />
      <Text style={{ fontSize: 13, color: colors.text, opacity: 0.8, textAlign: 'center' }}>{text}</Text>
    </Pressable>
  );
}
```

Add `Pressable` to the existing `react-native` import at the top of the file (currently `import { SafeAreaView, StatusBar, Text, View } from 'react-native';`):
```ts
import { Pressable, SafeAreaView, StatusBar, Text, View } from 'react-native';
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual smoke check**

Run: `npm start` and open the app on a device or simulator (`npm run ios` / `npm run android`), go to Add Song, switch to PDF, tap the dropzone, pick any local PDF, confirm the dropzone updates to "Selected: <filename>" and Save becomes enabled. Repeat for MusicXML with a `.musicxml`/`.mxl` file. Cancelling the picker should leave the dropzone text unchanged and Save disabled.

- [ ] **Step 7: Commit**

```bash
git add src/screens/AddSongScreen.tsx
git commit -m "Wire AddSongScreen dropzones to real document picking and persistence"
```

---

### Task 9: `PdfViewer` component

**Files:**
- Create: `src/screens/live-stage/PdfViewer.tsx`

**Interfaces:**
- Consumes: `PDF_VIEWER_HTML` (Task 6), `Stroke` (Task 2), `EditIcon`/`UndoIcon`/`TrashIcon` (existing + Task 3), `expo-file-system`'s `File`.
- Produces: `PdfViewer({ fileUri, annotations, onChangeAnnotations }: { fileUri: string; annotations: Record<number, Stroke[]>; onChangeAnnotations: (next: Record<number, Stroke[]>) => void }): JSX.Element` — consumed by `SheetView` in Task 11.

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { File } from 'expo-file-system';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../ui/Button';
import { EditIcon, TrashIcon, UndoIcon } from '../../ui/icons';
import { Stroke } from '../../data/types';
import { PDF_VIEWER_HTML } from './generated/pdfViewerHtml';

interface PdfViewerProps {
  fileUri: string;
  annotations: Record<number, Stroke[]>;
  onChangeAnnotations: (next: Record<number, Stroke[]>) => void;
}

export function PdfViewer({ fileUri, annotations, onChangeAnnotations }: PdfViewerProps) {
  const { colors } = useTheme();
  const webviewRef = useRef<WebView>(null);

  const [annotateMode, setAnnotateMode] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(600);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const postedInitialLoad = useRef(false);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  useEffect(() => {
    setError(null);
    setFileBase64(null);
    postedInitialLoad.current = false;
    let cancelled = false;
    (async () => {
      try {
        const file = new File(fileUri);
        const base64 = await file.base64();
        if (!cancelled) setFileBase64(base64);
      } catch {
        if (!cancelled) setError('Could not read this PDF file.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  useEffect(() => {
    if (htmlLoaded && fileBase64 !== null && !postedInitialLoad.current) {
      postedInitialLoad.current = true;
      webviewRef.current?.postMessage(
        JSON.stringify({ type: 'load', base64: fileBase64, annotations: annotationsRef.current }),
      );
    }
  }, [htmlLoaded, fileBase64]);

  useEffect(() => {
    if (!postedInitialLoad.current) return;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'setAnnotateMode', value: annotateMode }));
  }, [annotateMode]);

  function handleMessage(event: WebViewMessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'height') {
      setWebViewHeight(Math.max(msg.value, 200));
    } else if (msg.type === 'strokeComplete') {
      setCurrentPage(msg.page);
      const pageStrokes = [...(annotationsRef.current[msg.page] || []), msg.stroke as Stroke];
      onChangeAnnotations({ ...annotationsRef.current, [msg.page]: pageStrokes });
    } else if (msg.type === 'error') {
      setError(msg.message);
    }
  }

  function undoLastStroke() {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'undoLastStroke', page: currentPage }));
    const pageStrokes = (annotationsRef.current[currentPage] || []).slice(0, -1);
    onChangeAnnotations({ ...annotationsRef.current, [currentPage]: pageStrokes });
  }

  function clearPage() {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'clearPage', page: currentPage }));
    onChangeAnnotations({ ...annotationsRef.current, [currentPage]: [] });
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 4 }}>
        <Text style={{ color: colors.text, textAlign: 'center' }}>Couldn't render this file.</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6, padding: 8 }}>
        <Button
          variant="secondary"
          icon
          size={32}
          active={annotateMode}
          accessibilityLabel="Toggle annotate mode"
          onPress={() => setAnnotateMode((v) => !v)}
        >
          <EditIcon size={15} color={annotateMode ? colors.accent : colors.text} />
        </Button>
        {annotateMode && (
          <>
            <Button variant="secondary" icon size={32} accessibilityLabel="Undo last stroke" onPress={undoLastStroke}>
              <UndoIcon size={15} color={colors.text} />
            </Button>
            <Button variant="secondary" icon size={32} accessibilityLabel="Clear page annotations" onPress={clearPage}>
              <TrashIcon size={15} color={colors.text} />
            </Button>
          </>
        )}
      </View>
      <WebView
        ref={webviewRef}
        source={{ html: PDF_VIEWER_HTML }}
        originWhitelist={['*']}
        onLoadEnd={() => setHtmlLoaded(true)}
        onMessage={handleMessage}
        style={{ height: webViewHeight, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/live-stage/PdfViewer.tsx
git commit -m "Add PdfViewer: pdf.js-in-WebView rendering with freehand pen annotation"
```

---

### Task 10: `MusicXmlViewer` component

**Files:**
- Create: `src/screens/live-stage/MusicXmlViewer.tsx`

**Interfaces:**
- Consumes: `MUSIC_XML_VIEWER_HTML` (Task 6), `Clef`/`Enharmonic` types (`src/data/types.ts`, `src/music/notes.ts`).
- Produces: `MusicXmlViewer({ fileUri, transposeSemi, clef, enharmonic }: { fileUri: string; transposeSemi: number; clef: Clef; enharmonic: Enharmonic }): JSX.Element` — consumed by `SheetView` in Task 11.

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { File } from 'expo-file-system';
import { useTheme } from '../../theme/ThemeContext';
import { Clef } from '../../data/types';
import { Enharmonic } from '../../music/notes';
import { MUSIC_XML_VIEWER_HTML } from './generated/musicXmlViewerHtml';

interface MusicXmlViewerProps {
  fileUri: string;
  transposeSemi: number;
  clef: Clef;
  enharmonic: Enharmonic;
}

export function MusicXmlViewer({ fileUri, transposeSemi, clef, enharmonic }: MusicXmlViewerProps) {
  const { colors } = useTheme();
  const webviewRef = useRef<WebView>(null);

  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [webViewHeight, setWebViewHeight] = useState(400);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setFileBase64(null);
    let cancelled = false;
    (async () => {
      try {
        const file = new File(fileUri);
        const base64 = await file.base64();
        if (!cancelled) setFileBase64(base64);
      } catch {
        if (!cancelled) setError('Could not read this MusicXML file.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  useEffect(() => {
    if (!htmlLoaded || fileBase64 === null) return;
    webviewRef.current?.postMessage(
      JSON.stringify({
        type: 'render',
        base64: fileBase64,
        isCompressed: /\.mxl($|\?)/i.test(fileUri),
        transposeSemi,
        enharmonic,
        clef,
      }),
    );
  }, [htmlLoaded, fileBase64, transposeSemi, clef, enharmonic, fileUri]);

  function handleMessage(event: WebViewMessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'height') {
      setWebViewHeight(Math.max(msg.value, 120));
    } else if (msg.type === 'error') {
      setError(msg.message);
    }
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 4 }}>
        <Text style={{ color: colors.text, textAlign: 'center' }}>Couldn't render this file.</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webviewRef}
      source={{ html: MUSIC_XML_VIEWER_HTML }}
      originWhitelist={['*']}
      onLoadEnd={() => setHtmlLoaded(true)}
      onMessage={handleMessage}
      style={{ height: webViewHeight, backgroundColor: 'transparent' }}
    />
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/live-stage/MusicXmlViewer.tsx
git commit -m "Add MusicXmlViewer: OSMD-in-WebView engraving that re-renders on transpose/clef change"
```

---

### Task 11: Wire both viewers into `SheetView`

**Files:**
- Modify: `src/screens/live-stage/SheetView.tsx`
- Modify: `src/screens/LiveStageScreen.tsx`

**Interfaces:**
- Consumes: `PdfViewer` (Task 9), `MusicXmlViewer` (Task 10).
- Produces: `SheetView({ song, sourceLabel, liveKey, enharmonic, onUpdateSong }: { song: Song; sourceLabel: string; liveKey: string; enharmonic: Enharmonic; onUpdateSong: (patch: Partial<Song>) => void }): JSX.Element` — the prop shape changes from individual fields to `song` + `onUpdateSong` so `PdfViewer` can read/write `pdfAnnotations` and `MusicXmlViewer` can read `transposeSemi`/`clef` without re-threading more individual props.

- [ ] **Step 1: Rewrite `src/screens/live-stage/SheetView.tsx`**

Replace the entire file:
```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Song } from '../../data/types';
import { Enharmonic } from '../../music/notes';
import { Tag } from '../../ui/Tag';
import { MusicXmlViewer } from './MusicXmlViewer';
import { PdfViewer } from './PdfViewer';

interface SheetViewProps {
  song: Song;
  sourceLabel: string;
  liveKey: string;
  enharmonic: Enharmonic;
  onUpdateSong: (patch: Partial<Song>) => void;
}

export function SheetView({ song, sourceLabel, liveKey, enharmonic, onUpdateSong }: SheetViewProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingTop: 14,
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{sourceLabel}</Text>
        <Tag mono>{liveKey}</Tag>
      </View>
      {!song.sheetFileUri ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
            No sheet music imported for this song yet.
          </Text>
        </View>
      ) : song.sheetMode === 'pdf' ? (
        <PdfViewer
          fileUri={song.sheetFileUri}
          annotations={song.pdfAnnotations}
          onChangeAnnotations={(next) => onUpdateSong({ pdfAnnotations: next })}
        />
      ) : (
        <MusicXmlViewer
          fileUri={song.sheetFileUri}
          transposeSemi={song.transposeSemi}
          clef={song.clef}
          enharmonic={enharmonic}
        />
      )}
    </View>
  );
}
```

This deletes the old `StaffGraphic` function and its `react-native-svg`/`PdfFileIcon`/`Card`/`CardTitle` imports along with it — none of that is used anymore.

- [ ] **Step 2: Update the call site and source-label text in `src/screens/LiveStageScreen.tsx`**

Replace:
```ts
  const sourceLabel = song.sheetMode === 'pdf' ? 'Uploaded PDF — static' : 'MusicXML — transposable';
```
with:
```ts
  const sourceLabel = song.sheetFileName
    ? `${song.sheetFileName} — ${song.sheetMode === 'pdf' ? 'static' : 'transposable'}`
    : song.sheetMode === 'pdf'
    ? 'Uploaded PDF — static'
    : 'MusicXML — transposable';
```

Replace:
```tsx
          <SheetView sheetMode={song.sheetMode} clef={song.clef} sourceLabel={sourceLabel} liveKey={liveKey} />
```
with:
```tsx
          <SheetView
            song={song}
            sourceLabel={sourceLabel}
            liveKey={liveKey}
            enharmonic={store.settings.enharmonic}
            onUpdateSong={(patch) => store.updateSong(song.id, patch)}
          />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/live-stage/SheetView.tsx src/screens/LiveStageScreen.tsx
git commit -m "Wire PdfViewer and MusicXmlViewer into the Sheet tab, replacing the placeholder staff graphic"
```

---

### Task 12: End-to-end manual verification

**Files:** none (verification only — no code changes expected unless a bug surfaces, in which case fix it in the relevant task's file and re-run this task).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass (`chart.test.ts`, `store.test.ts`, `musicxmlTransform.test.ts`, `importSheetFile.test.ts`).

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Start the app on a device or simulator**

Run: `npm run ios` or `npm run android`.

The Sheet tab's PDF/MusicXML rendering must be verified on a device or simulator: `react-native-webview` has no web implementation, so the Sheet tab does not work under `npm run web`. Web is still fine for verifying the rest of the app (Chord tab, navigation), just not PDF/MusicXML rendering.

- [ ] **Step 4: PDF flow**

Add a song with source PDF, pick a real multi-page PDF file. Confirm: it saves and opens Live Stage; the Sheet tab shows the actual PDF content (not a placeholder icon); toggling the pen icon lets you draw a stroke; the stroke stays anchored to the same spot on the page after switching away to the Chord tab and back; Undo removes the last stroke; Clear removes all strokes on the current page.

- [ ] **Step 5: MusicXML flow**

Add a second song with source MusicXML, pick a real `.musicxml` file (a single-part hymn/lead-sheet if available) and, separately, a `.mxl` file if one is available. Confirm: real engraved notation renders (noteheads/stems/staff, not the old generic clef graphic); changing Key/Transpose in Settings re-renders the notation at the new pitch; changing Clef in Settings re-renders in the new clef; if the file has lyrics, they appear under the staff.

- [ ] **Step 6: Error paths**

Try picking a corrupt/non-MusicXML file while on the MusicXML tab (e.g. rename a `.txt` file to `.musicxml`); confirm `MusicXmlViewer` shows the inline "Couldn't render this file" state instead of a blank/crashed WebView.

- [ ] **Step 7: Record results**

If every check in Steps 4–6 passes, this task is done — no commit needed (nothing changed). If a bug surfaced and was fixed, commit that fix in context of whichever task's file it belongs to, following that task's commit-message style, then re-run Steps 4–6.
