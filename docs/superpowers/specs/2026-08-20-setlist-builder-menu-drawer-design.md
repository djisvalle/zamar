# Setlist Builder & Menu Drawer

Design source: Claude Design project "StageChart Mobile UI Design"
(`78a18a63-4c16-4457-8e50-f933dfff1a99`), file `StageChart - Setlist Builder.dc.html`.

## Goal

Live Stage's "Menu" button currently opens `SetlistDrawer`, a flat list of the
app's one unnamed setlist. Replace it with a unified drawer — a left icon
rail (Library / Setlist / Settings) plus tab content — matching the
design's "Song view" mockup, and upgrade the app's setlist concept from a
single unnamed list to multiple named, saved setlists with a real build
flow. Also add song favorites and song editing, which the design didn't
cover but are needed for the feature to be usable end to end. Build all of
it with Nativewind + React Native Reusables (RNR) rather than the legacy
`src/ui/` kit, per the project's stated UI direction.

Several pieces of the design file are already implemented elsewhere in the
app under different affordances and are explicitly **not** part of this
work: the chord/sheet toggle and top toolbar (`LiveStageScreen`), and the
transpose/sheet-source/clef/enharmonic panel (already covered by the
existing Settings-button → `SettingsSheet`, just triggered differently
than the design's floating "Music Tools" fab).

## Decisions from discussion

- **Multiple named setlists**, not one global list — matches the design's
  list of setlist cards and "Create a new Setlist" flow.
- **Unified 3-tab Menu drawer** (Library / Setlist / Settings) replaces
  `SetlistDrawer`. The standalone `LibraryScreen` (home screen) and the
  per-song `SettingsSheet` stay as they are; the drawer is a separate,
  faster access point reachable from within Live Stage.
- **No inline "Create a New Song" mini-form** in the drawer — song creation
  stays solely on `AddSongScreen`, which becomes dual-mode (create/edit).
- **Mood tags, the auto-order-by-key toggle, and the "abrupt key change"
  warning are dropped entirely** — not in the data model, not in the UI.
- **Favorites and song editing are added** (not in the original design
  file) so the feature has a real editing/curation loop: a star toggle and
  an edit affordance on every song row, and a Favorites filter in the
  setlist builder's "add songs" list in place of the removed mood chips.
- Setlist cards get one interaction the design's script left unwired: tap
  to expand into a flat, tappable song list (jump into Live Stage), and a
  small edit icon to reopen the build flow pre-filled — otherwise a
  created setlist could never be reopened or changed.

## UI stack: Nativewind + RNR

This is the first feature-level slice of work on the new Nativewind/RNR
stack (per `CLAUDE.md`'s stated direction), so it also resolves two "known
gap" items called out there:

- **RNR components**: added via the interactive CLI by the user (not
  scriptable — see `CLAUDE.md`), specifically:
  `button input card badge separator switch toggle toggle-group text label`.
  Reanimated-dependent components (Dialog, Sheet, Popover, Select,
  DropdownMenu, etc.) are avoided — `react-native-reanimated` isn't
  installable at this project's RN 0.87 yet. The drawer itself stays a
  plain RN `Modal` (matching the existing `SetlistDrawer`/`SettingsSheet`
  pattern) restyled with Tailwind `className`, not an RNR Sheet/Dialog.
- **Dark mode wiring**: call Nativewind's `colorScheme.set(appearance)`
  wherever `settings.appearance` changes (store's `setAppearance`, and once
  on load), alongside the existing `ThemeProvider`, so `dark:` variants on
  the new components respond app-wide.
- **Brand tokens**: `global.css`'s CSS variables are still the generic
  shadcn "neutral" defaults. Repoint `:root` and `.dark` to this app's
  actual Classical palette from `src/theme/tokens.ts` (light bg `#f3f2f2`,
  surface `#eae9e9`, text `#201f1d`, accent `#b68235`; Stage Dark bg
  `#1c1a19`, surface `#262320`, text `#f8f4f4`, accent `#e1ad66`) so RNR
  components match the rest of the app instead of looking like unstyled
  shadcn defaults.

New components under `src/screens/live-stage/` are written with Tailwind
`className` + these RNR primitives (rounded cards, icon-only star/edit
buttons, `toggle-group` for segmented controls) — not the legacy `src/ui/`
kit. `src/ui/` and other existing screens are untouched.

## Data model

`src/data/types.ts`:
- `Song` gains `favorite: boolean`.
- New `Setlist { id: string; name: string; songIds: string[] }`.
- `NewSongInput` unchanged in shape but is now also reused (as
  `Partial<NewSongInput> & { favorite?: boolean }` patch) for editing.

`src/data/store.tsx`:
- Replace `setlist: string[]` with `setlists: Record<string, Setlist>` +
  `setlistOrder: string[]` (creation order, for stable list rendering).
- Drop `libraryGroupByKey: boolean`; add `librarySort: 'letter' | 'key' | 'artist'`
  to `AppSettings`, shared by `LibraryScreen` and the drawer's Library tab.
- New actions: `createSetlist(name, songIds)`, `updateSetlist(id, patch)`
  (rename / reorder songIds / add / remove), `deleteSetlist(id)`.
- `addSong` gains a `favorite: false` default field on the created `Song`.
- No new reducer action for editing — `updateSong` is already a generic
  patch, so `AddSongScreen` in edit mode calls `store.updateSong(id, {...})`
  directly instead of `store.addSong`.
- `StoreValue`'s `setlist: Song[]` derived field is removed; a new
  `setlists: Setlist[]` (ordered per `setlistOrder`) replaces it. Screens
  resolve a setlist's songs via `setlist.songIds.map((id) => songs[id])`,
  the same pattern the old single-setlist derivation used.

`src/data/mockSongs.ts`:
- Add `favorite: false` (or a couple `true` for demo variety) to each seed
  song via the existing `seed()` helper.
- Replace `SETLIST_SEED: string[]` with two named `Setlist` seeds, reusing
  the existing groupings so the demo data doesn't regress: "Sunday AM —
  Aug 23" (great-are-you-lord, this-is-amazing-grace, o-come-to-the-altar,
  way-maker — A→G→B→E, i.e. today's single setlist, just named) and
  "Youth Night — Aug 27" (reckless-love, blessed-assurance, amazing-grace —
  C→D→G), matching the two example cards in the design mockup.

## Components

`src/screens/live-stage/`:
- `SetlistDrawer.tsx` is replaced by `MenuDrawer.tsx`: same slide-in-from-left
  `Modal` + backdrop shell, now with a left icon rail (Library / Setlist /
  Settings — reusing the existing `LibraryIcon`/list icon, a setlist icon,
  `SettingsIcon`) and tab content filling the rest of the drawer width.
- `MenuDrawerLibraryTab.tsx`: `toggle-group` for sort (Letter / Key /
  Artist, bound to `settings.librarySort`); grouped song list (factor the
  existing grouping logic out of `LibraryScreen` into a shared helper in
  `src/data/` or `src/music/` so it isn't duplicated); each row has a star
  (favorite toggle) and pencil (edit) icon button; tapping the row itself
  navigates to `LiveStage` and closes the drawer; a "+" opens `AddSong` in
  create mode.
- `MenuDrawerSetlistTab.tsx`: list view (default) shows setlist cards
  (name, song count, key sequence built via `noteName`); tapping a card
  expands it into a flat tappable song list (reusing `SetlistDrawer`'s old
  row style — grip icon, title, key); a pencil icon on the card opens the
  build view pre-filled for that setlist; "Create a new Setlist" opens the
  build view blank. Build view: name `Input`, draft-order list (reorder via
  up/down icon buttons, remove button — no auto-order, no key-distance
  warnings), an "Add songs" section listing library songs not yet in the
  draft with an All/Favorites `toggle-group` filter, and a Save button that
  calls `createSetlist` or `updateSetlist`.
- `MenuDrawerSettingsTab.tsx`: enharmonic `toggle-group` (existing global
  setting) and the current song's sheet-source `toggle-group` (the same
  per-song `sheetMode` `SettingsSheet` already edits — this tab is always
  opened from a Live Stage song, so there's always a current song).
- `LiveStageScreen.tsx`: swap `SetlistDrawer` for `MenuDrawer`.

`src/screens/AddSongScreen.tsx`:
- Becomes dual-mode. `RootStackParamList['AddSong']` changes from
  `{ addToSetlist: boolean }` to a union:
  `{ mode: 'create'; addToSetlist: boolean } | { mode: 'edit'; songId: string }`.
  Existing `navigation.navigate('AddSong', { addToSetlist })` call sites
  update to `{ mode: 'create', addToSetlist }`.
- Edit mode pre-fills all fields (including `favorite`) from
  `store.songs[songId]`, header reads "Edit Song", Save calls
  `store.updateSong` and navigates back instead of pushing a new
  `LiveStage` route.
- Gains a favorite star toggle in the form (both modes).

`src/screens/LibraryScreen.tsx`:
- Sort control becomes 3-way (Letter/Key/Artist) via `librarySort`.
- Each row gains star (favorite) and pencil (edit) icon buttons, matching
  the drawer's Library tab (using the shared grouping/row logic).

## Out of scope

- The standalone `LibraryScreen`'s search box and floating add button are
  unchanged apart from the sort/favorite/edit additions above.
- `SettingsSheet` and `QuickToolsFab` are untouched.
- No multi-user/sync concerns — everything is still in-memory only
  (`AsyncStorage` remains unwired, matching the rest of the app today).
- No tag/mood concept anywhere (explicitly removed).

## Testing

Follow the existing `*.test.ts` pattern (Jest is already configured via
`jest-expo`, run with `npm test`). Add reducer coverage in
`src/data/store.test.ts` for `createSetlist`, `updateSetlist`,
`deleteSetlist`, favorite toggling, and the edit-song path, mirroring the
style of the existing `addSong`/`updateSong` tests there.
