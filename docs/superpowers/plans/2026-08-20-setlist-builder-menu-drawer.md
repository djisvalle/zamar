# Setlist Builder & Menu Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Task 4 has a manual sub-step that cannot be done by an agentic worker** — running the React Native Reusables CLI requires a real interactive terminal (see Task 4, Step 0). If that step hasn't been done yet, stop and ask the human to run it before continuing past Task 4.

**Goal:** Replace Live Stage's single-setlist `SetlistDrawer` with a unified Library/Setlist/Settings menu drawer backed by real multi-setlist data, built with Nativewind + React Native Reusables, and add song favorites/editing.

**Architecture:** Data model changes first (song favorites, named `Setlist` entities, 3-way library sort) with reducer test coverage, then a small RNR/Nativewind foundation pass (brand-color CSS vars, dark-mode wiring), then the existing screens (`AddSongScreen`, `LibraryScreen`) get the minimal additions they need, then the new drawer is built bottom-up (leaf tab components first, shell last) so each task is independently renderable/testable.

**Tech Stack:** React Native (Expo SDK 57, RN 0.87), TypeScript strict, Nativewind v4 + React Native Reusables (RNR) for new UI, Jest (`jest-expo` preset) for logic tests, existing hand-rolled `src/ui/` kit for the two existing screens this touches.

## Global Constraints

- `react-native-reanimated` is not installed and cannot be added yet (peer range tops out at RN 0.86, this project is on 0.87) — never introduce a component that depends on it. RNR's Dialog/Sheet/Popover/Select/DropdownMenu/AlertDialog typically do; avoid them. The drawer stays a plain RN `Modal`.
- Only these RNR primitives are actually consumed by the code in this plan: **button, input, toggle-group, separator, text**. (If a broader set was already installed from an earlier conversation, that's harmless — unused generated files don't need to be removed.)
- TypeScript strict mode is on (`tsconfig.json`); `npx tsc --noEmit` is the project's typecheck command (no separate build/typecheck script).
- Jest is configured (`jest-expo` preset, run via `npm test`). Existing convention: only pure logic (`src/data/`, `src/music/`) has test files; screens/components don't. Follow that convention here.
- Commit messages: no conventional-commit prefixes (`feat:`, `fix:`, etc.), be specific about what changed and why, never add an AI co-author trailer.
- This plan changes shared types/state (Task 1) before every consumer of them is updated. Several early tasks will leave `npx tsc --noEmit` reporting errors in files not yet touched by this plan — each task's verification step says exactly which errors are expected at that point. Only Task 12 requires a fully clean typecheck.
- Design fidelity: where a task ports something directly from `StageChart - Setlist Builder.dc.html` (icon SVG paths, key names), keep it verbatim rather than approximating.

---

## Task 1: Data model — favorites, named setlists, 3-way library sort

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/navigation/types.ts`
- Modify: `src/data/store.tsx`
- Modify: `src/data/mockSongs.ts`
- Modify: `src/data/store.test.ts`

**Interfaces:**
- Produces: `Song.favorite: boolean`; `export interface Setlist { id: string; name: string; songIds: string[] }`; `export type LibrarySort = 'letter' | 'key' | 'artist'`.
- Produces (navigation): `RootStackParamList['AddSong'] = { mode: 'create' } | { mode: 'edit'; songId: string }`.
- Produces (store): `StoreValue.setlists: Setlist[]`; `StoreValue.settings.librarySort: LibrarySort`; `addSong(input: NewSongInput): string` (no longer takes a boolean); `setLibrarySort(v: LibrarySort): void`; `createSetlist(name: string, songIds: string[]): string`; `updateSetlist(id: string, patch: Partial<Pick<Setlist, 'name' | 'songIds'>>): void`.

This task intentionally drops `addToSetlist` from the add-song flow: with multiple named setlists there's no longer a single "the setlist" to default into, and the new Setlist tab's build flow adds *existing* library songs rather than creating new ones. Callers are fixed in Tasks 5, 6 and 11.

- [ ] **Step 1: Update `store.test.ts` to the new state shape and add tests for the new reducer behavior**

Replace the full contents of `src/data/store.test.ts`:

```ts
import { reducer } from './store';
import { Song, SongSource, Setlist } from './types';

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
    favorite: false,
    ...overrides,
  };
}

function baseState(overrides: {
  songs?: Record<string, Song>;
  setlists?: Record<string, Setlist>;
  setlistOrder?: string[];
} = {}) {
  return {
    songs: overrides.songs ?? {},
    setlists: overrides.setlists ?? {},
    setlistOrder: overrides.setlistOrder ?? [],
    settings: { appearance: 'light' as const, enharmonic: 'sharp' as const, librarySort: 'letter' as const },
  };
}

describe('reducer — addSong', () => {
  it('stores sheetFileUri/sheetFileName from the input, starts with empty annotations and favorite false', () => {
    const next = reducer(baseState(), {
      type: 'addSong',
      id: 'new-song',
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
      favorite: false,
    });
  });

  describe('sheetMode derivation', () => {
    function addWithSource(source: SongSource) {
      const next = reducer(baseState(), {
        type: 'addSong',
        id: 'new-song',
        input: {
          title: 'My Song',
          artist: '',
          keyIdx: 0,
          source,
          chart: '',
          sheetFileUri: null,
          sheetFileName: null,
        },
      });
      return next.songs['new-song'].sheetMode;
    }

    it("maps source 'pdf' to sheetMode 'pdf'", () => {
      expect(addWithSource('pdf')).toBe('pdf');
    });

    it("maps source 'musicxml' to sheetMode 'musicxml'", () => {
      expect(addWithSource('musicxml')).toBe('musicxml');
    });

    it("maps source 'type' to sheetMode 'musicxml'", () => {
      expect(addWithSource('type')).toBe('musicxml');
    });
  });
});

describe('reducer — updateSong', () => {
  it('merges a pdfAnnotations patch onto the existing song', () => {
    const song = baseSong({ pdfAnnotations: { 1: [{ color: '#d33', width: 3, points: [{ x: 0, y: 0 }] }] } });
    const next = reducer(baseState({ songs: { s1: song } }), {
      type: 'updateSong',
      id: 's1',
      patch: { pdfAnnotations: { ...song.pdfAnnotations, 2: [{ color: '#d33', width: 3, points: [{ x: 5, y: 5 }] }] } },
    });
    expect(Object.keys(next.songs.s1.pdfAnnotations)).toEqual(['1', '2']);
  });

  it('toggles favorite on an existing song', () => {
    const song = baseSong({ favorite: false });
    const next = reducer(baseState({ songs: { s1: song } }), {
      type: 'updateSong',
      id: 's1',
      patch: { favorite: true },
    });
    expect(next.songs.s1.favorite).toBe(true);
  });
});

describe('reducer — setLibrarySort', () => {
  it('updates settings.librarySort', () => {
    const next = reducer(baseState(), { type: 'setLibrarySort', value: 'artist' });
    expect(next.settings.librarySort).toBe('artist');
  });
});

describe('reducer — createSetlist', () => {
  it('adds a new named setlist and appends it to setlistOrder', () => {
    const next = reducer(baseState(), {
      type: 'createSetlist',
      id: 'sl1',
      name: 'Sunday AM',
      songIds: ['s1', 's2'],
    });
    expect(next.setlists.sl1).toEqual({ id: 'sl1', name: 'Sunday AM', songIds: ['s1', 's2'] });
    expect(next.setlistOrder).toEqual(['sl1']);
  });

  it('appends after existing setlists, preserving their order', () => {
    const state = baseState({
      setlists: { sl1: { id: 'sl1', name: 'First', songIds: [] } },
      setlistOrder: ['sl1'],
    });
    const next = reducer(state, { type: 'createSetlist', id: 'sl2', name: 'Second', songIds: [] });
    expect(next.setlistOrder).toEqual(['sl1', 'sl2']);
  });
});

describe('reducer — updateSetlist', () => {
  it('merges a patch onto the existing setlist', () => {
    const state = baseState({
      setlists: { sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1'] } },
      setlistOrder: ['sl1'],
    });
    const next = reducer(state, {
      type: 'updateSetlist',
      id: 'sl1',
      patch: { name: 'Sunday AM — Aug 23', songIds: ['s1', 's2'] },
    });
    expect(next.setlists.sl1).toEqual({ id: 'sl1', name: 'Sunday AM — Aug 23', songIds: ['s1', 's2'] });
  });

  it('is a no-op when the setlist does not exist', () => {
    const state = baseState();
    const next = reducer(state, { type: 'updateSetlist', id: 'missing', patch: { name: 'X' } });
    expect(next).toBe(state);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail on the current code**

Run: `npm test -- store.test`
Expected: FAIL — `reducer` doesn't accept `setLibrarySort`/`createSetlist`/`updateSetlist` action types, and `baseState`'s shape (`setlists`/`setlistOrder`/`librarySort`) doesn't match `State` yet. TypeScript errors are expected here too (that's fine — Jest will still report them as failures).

- [ ] **Step 3: Update `src/data/types.ts`**

Add `LibrarySort`, add `Setlist`, add `favorite` to `Song`:

```ts
export type SongSource = 'pdf' | 'musicxml' | 'type';
export type Clef = 'treble' | 'alto' | 'bass';
export type SheetMode = 'pdf' | 'musicxml';
export type LibrarySort = 'letter' | 'key' | 'artist';

export interface Stroke {
  color: string;
  width: number;
  points: { x: number; y: number }[]; // page-space coordinates (unscaled by zoom)
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  /** base key, pitch class 0-11 (before any live transpose) */
  keyIdx: number;
  tempo: number;
  meter: string;
  /** how the song was originally added */
  source: SongSource;
  /** raw chord-over-lyric text for the Chord tab, '' if none was typed in */
  chart: string;
  /** persisted copy of the picked PDF/MusicXML/.mxl file, null until one is imported */
  sheetFileUri: string | null;
  /** original filename of the imported file, shown in the Sheet tab's source label */
  sheetFileName: string | null;
  /** freehand pen annotations for the pdf sheet mode, keyed by page number */
  pdfAnnotations: Record<number, Stroke[]>;
  /** starred for quick access — surfaced as a filter when building a setlist */
  favorite: boolean;

  // Per-song live-performance state, remembered across visits to Live Stage.
  transposeSemi: number;
  capo: number;
  clef: Clef;
  sheetMode: SheetMode;
  autoScroll: boolean;
}

export type NewSongInput = Pick<
  Song,
  'title' | 'artist' | 'keyIdx' | 'source' | 'chart' | 'sheetFileUri' | 'sheetFileName'
>;

export interface Setlist {
  id: string;
  name: string;
  songIds: string[];
}
```

- [ ] **Step 4: Update `src/navigation/types.ts`**

```ts
export type RootStackParamList = {
  Library: undefined;
  LiveStage: { songId: string };
  AddSong: { mode: 'create' } | { mode: 'edit'; songId: string };
};
```

- [ ] **Step 5: Rewrite `src/data/store.tsx`**

```tsx
import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { Appearance } from '../theme/tokens';
import { Enharmonic } from '../music/notes';
import { LIBRARY_SEED, SETLISTS_SEED } from './mockSongs';
import { LibrarySort, NewSongInput, Setlist, Song } from './types';

interface AppSettings {
  appearance: Appearance; // "Appearance (app-wide)"
  enharmonic: Enharmonic; // "Enharmonic" — also app-wide per the settings sheet
  librarySort: LibrarySort;
}

interface State {
  songs: Record<string, Song>;
  setlists: Record<string, Setlist>;
  setlistOrder: string[];
  settings: AppSettings;
}

type Action =
  | { type: 'updateSong'; id: string; patch: Partial<Song> }
  | { type: 'addSong'; id: string; input: NewSongInput }
  | { type: 'setAppearance'; appearance: Appearance }
  | { type: 'setEnharmonic'; enharmonic: Enharmonic }
  | { type: 'setLibrarySort'; value: LibrarySort }
  | { type: 'createSetlist'; id: string; name: string; songIds: string[] }
  | { type: 'updateSetlist'; id: string; patch: Partial<Pick<Setlist, 'name' | 'songIds'>> };

function slugify(title: string) {
  const base = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';
  return `${base}-${Date.now().toString(36)}`;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'updateSong': {
      const song = state.songs[action.id];
      if (!song) return state;
      return { ...state, songs: { ...state.songs, [action.id]: { ...song, ...action.patch } } };
    }
    case 'addSong': {
      const id = action.id;
      const song: Song = {
        id,
        title: action.input.title,
        artist: action.input.artist,
        keyIdx: action.input.keyIdx,
        tempo: 90,
        meter: '4/4',
        source: action.input.source,
        chart: action.input.chart,
        sheetFileUri: action.input.sheetFileUri,
        sheetFileName: action.input.sheetFileName,
        pdfAnnotations: {},
        favorite: false,
        transposeSemi: 0,
        capo: 0,
        clef: 'treble',
        sheetMode: action.input.source === 'pdf' ? 'pdf' : 'musicxml',
        autoScroll: false,
      };
      return { ...state, songs: { ...state.songs, [id]: song } };
    }
    case 'setAppearance':
      return { ...state, settings: { ...state.settings, appearance: action.appearance } };
    case 'setEnharmonic':
      return { ...state, settings: { ...state.settings, enharmonic: action.enharmonic } };
    case 'setLibrarySort':
      return { ...state, settings: { ...state.settings, librarySort: action.value } };
    case 'createSetlist': {
      const setlist: Setlist = { id: action.id, name: action.name, songIds: action.songIds };
      return {
        ...state,
        setlists: { ...state.setlists, [action.id]: setlist },
        setlistOrder: [...state.setlistOrder, action.id],
      };
    }
    case 'updateSetlist': {
      const setlist = state.setlists[action.id];
      if (!setlist) return state;
      return { ...state, setlists: { ...state.setlists, [action.id]: { ...setlist, ...action.patch } } };
    }
    default:
      return state;
  }
}

function initState(): State {
  const songs: Record<string, Song> = {};
  for (const s of LIBRARY_SEED) songs[s.id] = s;
  const setlists: Record<string, Setlist> = {};
  const setlistOrder: string[] = [];
  for (const sl of SETLISTS_SEED) {
    setlists[sl.id] = sl;
    setlistOrder.push(sl.id);
  }
  return {
    songs,
    setlists,
    setlistOrder,
    settings: { appearance: 'light', enharmonic: 'sharp', librarySort: 'letter' },
  };
}

interface StoreValue {
  songs: Record<string, Song>;
  library: Song[];
  setlists: Setlist[];
  settings: AppSettings;
  updateSong: (id: string, patch: Partial<Song>) => void;
  addSong: (input: NewSongInput) => string;
  setAppearance: (a: Appearance) => void;
  setEnharmonic: (e: Enharmonic) => void;
  setLibrarySort: (v: LibrarySort) => void;
  createSetlist: (name: string, songIds: string[]) => string;
  updateSetlist: (id: string, patch: Partial<Pick<Setlist, 'name' | 'songIds'>>) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const updateSong = useCallback((id: string, patch: Partial<Song>) => {
    dispatch({ type: 'updateSong', id, patch });
  }, []);

  const addSong = useCallback((input: NewSongInput) => {
    const id = slugify(input.title);
    dispatch({ type: 'addSong', id, input });
    return id;
  }, []);

  const setAppearance = useCallback((appearance: Appearance) => dispatch({ type: 'setAppearance', appearance }), []);
  const setEnharmonic = useCallback((enharmonic: Enharmonic) => dispatch({ type: 'setEnharmonic', enharmonic }), []);
  const setLibrarySort = useCallback((value: LibrarySort) => dispatch({ type: 'setLibrarySort', value }), []);

  const createSetlist = useCallback((name: string, songIds: string[]) => {
    const id = slugify(name);
    dispatch({ type: 'createSetlist', id, name, songIds });
    return id;
  }, []);

  const updateSetlist = useCallback(
    (id: string, patch: Partial<Pick<Setlist, 'name' | 'songIds'>>) => {
      dispatch({ type: 'updateSetlist', id, patch });
    },
    [],
  );

  const library = useMemo(() => Object.values(state.songs), [state.songs]);
  const setlists = useMemo(
    () => state.setlistOrder.map((id) => state.setlists[id]).filter((s): s is Setlist => Boolean(s)),
    [state.setlistOrder, state.setlists],
  );

  const value: StoreValue = {
    songs: state.songs,
    library,
    setlists,
    settings: state.settings,
    updateSong,
    addSong,
    setAppearance,
    setEnharmonic,
    setLibrarySort,
    createSetlist,
    updateSetlist,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
```

- [ ] **Step 6: Rewrite `src/data/mockSongs.ts`**

```ts
import { AMAZING_GRACE_CHART } from '../music/chart';
import { keyIndex } from '../music/notes';
import { Setlist, Song } from './types';

function seed(
  id: string,
  title: string,
  artist: string,
  key: string,
  opts: Partial<Song> = {},
): Song {
  return {
    id,
    title,
    artist,
    keyIdx: keyIndex(key),
    tempo: 90,
    meter: '4/4',
    source: 'type',
    chart: '',
    sheetFileUri: null,
    sheetFileName: null,
    pdfAnnotations: {},
    favorite: false,
    transposeSemi: 0,
    capo: 0,
    clef: 'treble',
    sheetMode: 'musicxml',
    autoScroll: false,
    ...opts,
  };
}

// Matches Component.libraryVals() in StageChart Design Spec.dc.html.
export const LIBRARY_SEED: Song[] = [
  seed('amazing-grace', 'Amazing Grace', 'Traditional', 'G', {
    tempo: 72,
    chart: AMAZING_GRACE_CHART,
    capo: 3, // matches the spec's opening Settings state exactly
    favorite: true,
  }),
  seed('this-is-amazing-grace', 'This Is Amazing Grace', 'Phil Wickham', 'G', { tempo: 128 }),
  seed('way-maker', 'Way Maker', 'Sinach', 'E', { tempo: 140, favorite: true }),
  seed('great-are-you-lord', 'Great Are You Lord', 'All Sons & Daughters', 'A', { tempo: 72 }),
  seed('o-come-to-the-altar', 'O Come to the Altar', 'Elevation Worship', 'B', { tempo: 68 }),
  seed('reckless-love', 'Reckless Love', 'Cory Asbury', 'C'),
  seed('blessed-assurance', 'Blessed Assurance', 'Traditional', 'D'),
  seed('sunrise', 'Sunrise', 'Band Original', 'F#'),
  seed('it-is-well', 'It Is Well', 'Traditional', 'C'),
  seed('goodness-of-god', 'Goodness of God', 'Bethel Music', 'A'),
];

// Two named setlists matching the two example cards in
// "StageChart - Setlist Builder.dc.html" — same songs/keys as the app's old
// single unnamed setlist (Sunday AM), plus a second for Youth Night.
export const SETLISTS_SEED: Setlist[] = [
  {
    id: 'sunday-am-aug-23',
    name: 'Sunday AM — Aug 23',
    songIds: ['great-are-you-lord', 'this-is-amazing-grace', 'o-come-to-the-altar', 'way-maker'],
  },
  {
    id: 'youth-night-aug-27',
    name: 'Youth Night — Aug 27',
    songIds: ['reckless-love', 'blessed-assurance', 'amazing-grace'],
  },
];
```

- [ ] **Step 7: Run the store tests again and confirm they pass**

Run: `npm test -- store.test`
Expected: PASS (all `describe` blocks green).

- [ ] **Step 8: Confirm the type errors are now confined to not-yet-updated consumers**

Run: `npx tsc --noEmit`
Expected: errors only in `src/screens/LibraryScreen.tsx` (still calls `setLibraryGroupByKey`/`addToSetlist`), `src/screens/AddSongScreen.tsx` (still uses the old `route.params.addToSetlist` and 2-arg `addSong`), and `src/screens/LiveStageScreen.tsx` (still reads `store.setlist`, which no longer exists) — fixed in Tasks 5, 6, 11 respectively. `src/screens/live-stage/SetlistDrawer.tsx` itself takes a plain `Song[]` prop and doesn't touch the store directly, so it should NOT error here. No errors in `src/data/*` or `src/navigation/*`.

- [ ] **Step 9: Commit**

```bash
git add src/data/types.ts src/navigation/types.ts src/data/store.tsx src/data/mockSongs.ts src/data/store.test.ts
git commit -m "Replace the single unnamed setlist with named multi-setlist support and add song favorites"
```

---

## Task 2: New icon components

**Files:**
- Modify: `src/ui/icons.tsx`

**Interfaces:**
- Consumes: nothing new (same `IconProps`/`base()` pattern already in the file).
- Produces: `LibraryIcon`, `SetlistIcon`, `StarIcon` (takes an extra `filled?: boolean`), `XIcon`, `ChevronUpIcon`, `ChevronDownIcon` — all with the same `{ size?, color?, strokeWidth? }` signature as the existing icons in this file.

- [ ] **Step 1: Append the new icon components to `src/ui/icons.tsx`**

Add at the end of the file (icon paths for `LibraryIcon`/`SetlistIcon` are lifted verbatim from `StageChart - Setlist Builder.dc.html`'s rail icons, matching the file's existing header comment convention):

```tsx
export function LibraryIcon({ size = 18, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

export function SetlistIcon({ size = 18, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M11 18H3" />
      <Path d="M15 12H3" />
      <Path d="M17 6H3" />
      <Path d="m19 16 2 2 4-4" transform="translate(-3 0)" />
    </Svg>
  );
}

export function StarIcon({
  size = 16,
  color = '#000',
  strokeWidth = 2,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    </Svg>
  );
}

export function XIcon({ size = 14, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </Svg>
  );
}

export function ChevronUpIcon({ size = 14, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="m18 15-6-6-6 6" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 14, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, strokeWidth, color)}>
      <Path d="m6 9 6 6 6-6" />
    </Svg>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/ui/icons.tsx` (the pre-existing errors listed in Task 1 Step 8 are unaffected).

- [ ] **Step 3: Commit**

```bash
git add src/ui/icons.tsx
git commit -m "Add library, setlist, star, close and chevron icons for the setlist builder"
```

---

## Task 3: Shared library sort/group helper

**Files:**
- Create: `src/data/librarySort.ts`
- Test: `src/data/librarySort.test.ts`

**Interfaces:**
- Consumes: `Song`, `LibrarySort` from `./types`; `noteName` from `../music/notes`.
- Produces: `export type LibraryListItem = { type: 'divider'; label: string } | { type: 'song'; song: Song }`; `export function groupLibrary(songs: Song[], sort: LibrarySort): LibraryListItem[]`.

This extracts and generalizes the grouping logic currently inline in `LibraryScreen.tsx` so both the standalone Library screen (Task 6) and the drawer's Library tab (Task 8) share one implementation instead of two copies that can drift.

- [ ] **Step 1: Write the failing test**

Create `src/data/librarySort.test.ts`:

```ts
import { groupLibrary } from './librarySort';
import { Song } from './types';

function song(overrides: Partial<Song> & { title: string }): Song {
  return {
    id: overrides.title.toLowerCase().replace(/\s+/g, '-'),
    title: overrides.title,
    artist: 'Unknown',
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
    favorite: false,
    ...overrides,
  };
}

describe('groupLibrary', () => {
  const songs = [
    song({ title: 'Way Maker', artist: 'Sinach', keyIdx: 4 }),
    song({ title: 'Amazing Grace', artist: 'Traditional', keyIdx: 7 }),
    song({ title: 'Blessed Assurance', artist: 'Traditional', keyIdx: 2 }),
  ];

  it('groups by first letter of title when sorted "letter", alphabetized', () => {
    const items = groupLibrary(songs, 'letter');
    expect(items).toEqual([
      { type: 'divider', label: 'A' },
      { type: 'song', song: songs[1] },
      { type: 'divider', label: 'B' },
      { type: 'song', song: songs[2] },
      { type: 'divider', label: 'W' },
      { type: 'song', song: songs[0] },
    ]);
  });

  it('groups by key label when sorted "key", ordered by pitch class', () => {
    const items = groupLibrary(songs, 'key');
    expect(items.filter((i) => i.type === 'divider').map((i) => i.label)).toEqual([
      'Key of D',
      'Key of E',
      'Key of G',
    ]);
  });

  it('groups by artist when sorted "artist"', () => {
    const items = groupLibrary(songs, 'artist');
    expect(items.filter((i) => i.type === 'divider').map((i) => i.label)).toEqual(['Sinach', 'Traditional']);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- librarySort.test`
Expected: FAIL — `Cannot find module './librarySort'`.

- [ ] **Step 3: Create `src/data/librarySort.ts`**

```ts
import { LibrarySort, Song } from './types';
import { noteName } from '../music/notes';

export type LibraryListItem = { type: 'divider'; label: string } | { type: 'song'; song: Song };

export function groupLibrary(songs: Song[], sort: LibrarySort): LibraryListItem[] {
  const sorted = [...songs].sort((a, b) => {
    if (sort === 'key') {
      const d = a.keyIdx - b.keyIdx;
      return d !== 0 ? d : a.title.localeCompare(b.title);
    }
    if (sort === 'artist') {
      const d = a.artist.localeCompare(b.artist);
      return d !== 0 ? d : a.title.localeCompare(b.title);
    }
    return a.title.localeCompare(b.title);
  });

  const groupOf = (song: Song): string => {
    if (sort === 'key') return `Key of ${noteName(song.keyIdx, 'sharp')}`;
    if (sort === 'artist') return song.artist;
    return song.title[0]?.toUpperCase() ?? '#';
  };

  const out: LibraryListItem[] = [];
  let lastGroup: string | null = null;
  for (const song of sorted) {
    const group = groupOf(song);
    if (group !== lastGroup) {
      out.push({ type: 'divider', label: group });
      lastGroup = group;
    }
    out.push({ type: 'song', song });
  }
  return out;
}
```

- [ ] **Step 4: Run the test again and confirm it passes**

Run: `npm test -- librarySort.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/librarySort.ts src/data/librarySort.test.ts
git commit -m "Extract library sort/group logic into a shared helper for reuse by the menu drawer"
```

---

## Task 4: Nativewind/RNR foundation — brand colors and dark-mode wiring

**Files:**
- Modify: `global.css`
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `colorScheme` from `nativewind` (confirmed export: `colorScheme.set(value: "light" | "dark" | "system"): void`, from `node_modules/react-native-css-interop/dist/runtime/native/appearance-observables.d.ts`).
- Produces: no new exports — this task repoints existing CSS variables and adds one `useEffect` in `App.tsx`. Later tasks (7–11) depend on the CSS variables here actually reflecting the brand palette in both light and dark.

- [ ] **Step 0 (MANUAL — human only, do not attempt to script): Install the RNR primitives**

If `src/components/ui/button.tsx` does not already exist, a human needs to run this in a real interactive terminal (the CLI's prompts don't reliably honor piped/non-interactive input):

```
npx @react-native-reusables/cli@latest add button input toggle-group separator text
```

Confirm afterward that `src/components/ui/button.tsx`, `input.tsx`, `toggle-group.tsx`, `separator.tsx`, and `text.tsx` exist before continuing to Task 7 (Tasks 5 and 6 don't need them and can proceed in parallel while waiting on this).

- [ ] **Step 1: Repoint `global.css`'s CSS variables to this app's brand palette**

The current values are generic shadcn "neutral" placeholders. Replace `:root` and `.dark` with the HSL equivalents of `src/theme/tokens.ts`'s Classical palette (computed from the exact hex values in `makeTheme()`): light background `#f3f2f2`, surface `#eae9e9`, text `#201f1d`, accent `#b68235`; Stage Dark background `#1c1a19`, surface `#262320`, text `#f8f4f4`, accent `#e1ad66`. `--radius` is intentionally left at the shadcn default (0.5rem) rather than `tokens.ts`'s tighter Classical radii (2/4/7px) — the brief was explicitly for a more modern look for this feature, not the tight classical one.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 4% 95%;
    --foreground: 40 5% 12%;
    --card: 0 2% 92%;
    --card-foreground: 40 5% 12%;
    --popover: 0 2% 92%;
    --popover-foreground: 40 5% 12%;
    --primary: 36 55% 46%;
    --primary-foreground: 0 22% 96%;
    --secondary: 0 7% 91%;
    --secondary-foreground: 40 5% 12%;
    --muted: 0 7% 91%;
    --muted-foreground: 0 2% 48%;
    --accent: 33 100% 95%;
    --accent-foreground: 36 55% 46%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 1% 82%;
    --input: 0 1% 82%;
    --ring: 36 55% 46%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 20 6% 10%;
    --foreground: 0 22% 96%;
    --card: 30 9% 14%;
    --card-foreground: 0 22% 96%;
    --popover: 30 9% 14%;
    --popover-foreground: 0 22% 96%;
    --primary: 35 67% 64%;
    --primary-foreground: 40 5% 12%;
    --secondary: 0 2% 26%;
    --secondary-foreground: 0 22% 96%;
    --muted: 0 2% 26%;
    --muted-foreground: 0 3% 72%;
    --accent: 35 63% 14%;
    --accent-foreground: 34 100% 87%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 20 3% 23%;
    --input: 20 3% 23%;
    --ring: 35 67% 64%;
  }
}
```

- [ ] **Step 2: Wire `settings.appearance` to Nativewind's color scheme in `App.tsx`**

```tsx
import './global.css';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colorScheme } from 'nativewind';
import { StoreProvider, useStore } from './src/data/store';
import { ThemeProvider } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function ThemedApp() {
  const { settings } = useStore();

  useEffect(() => {
    colorScheme.set(settings.appearance);
  }, [settings.appearance]);

  return (
    <ThemeProvider appearance={settings.appearance}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemedApp />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: same pre-existing errors as Task 1 Step 8 (this task doesn't touch any of those files); no new errors.

- [ ] **Step 4: Manual smoke check**

Run: `npm start` (or `npm run web`), open the app, open any song's existing Settings sheet and toggle Appearance between Light and Stage Dark. Expected: the app still switches themes exactly as before (this task doesn't change any rendered UI yet — RNR components that read `dark:` don't exist until Task 7 — it just confirms the new `useEffect` doesn't throw or break the existing theme toggle).

- [ ] **Step 5: Commit**

```bash
git add global.css App.tsx
git commit -m "Point Nativewind's theme tokens at the app's actual brand palette and sync its color scheme with appearance settings"
```

---

## Task 5: `AddSongScreen` — dual create/edit mode and favorite toggle

**Files:**
- Modify: `src/screens/AddSongScreen.tsx`

**Interfaces:**
- Consumes: `RootStackParamList['AddSong']` (Task 1), `store.addSong(input): string` and `store.updateSong(id, patch)` (Task 1), `StarIcon` (Task 2).
- Produces: nothing new consumed elsewhere — `LibraryScreen` (Task 6) and `MenuDrawer`/`MenuDrawerLibraryTab` (Tasks 8, 11) navigate to this screen via the route params shape from Task 1.

- [ ] **Step 1: Rewrite `src/screens/AddSongScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading, radius } from '../theme/tokens';
import { useStore } from '../data/store';
import { SongSource } from '../data/types';
import { noteName } from '../music/notes';
import {
  pickAndCopySheetFile,
  discardCopiedSheetFile,
  PDF_MIME_TYPES,
  MUSICXML_MIME_TYPES,
} from '../data/importSheetFile';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tag } from '../ui/Tag';
import { ChevronLeftIcon, PdfFileIcon, StarIcon, TypeInIcon, UploadIcon, XmlFileIcon } from '../ui/icons';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSong'>;

const SOURCES: { value: SongSource; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'musicxml', label: 'MusicXML' },
  { value: 'type', label: 'Type it in' },
];

export function AddSongScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const store = useStore();

  const isEdit = route.params.mode === 'edit';
  const existing = isEdit ? store.songs[route.params.songId] : undefined;

  const [source, setSource] = useState<SongSource>(existing?.source ?? 'type');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [artist, setArtist] = useState(existing?.artist ?? '');
  const [keyIdx, setKeyIdx] = useState(existing?.keyIdx ?? 0);
  const [chart, setChart] = useState(existing?.chart ?? '');
  const [sheetFileUri, setSheetFileUri] = useState<string | null>(existing?.sheetFileUri ?? null);
  const [sheetFileName, setSheetFileName] = useState<string | null>(existing?.sheetFileName ?? null);
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  if (isEdit && !existing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text }}>Song not found.</Text>
      </SafeAreaView>
    );
  }

  const fileReady = source === 'type' || Boolean(sheetFileUri);
  const canSave = title.trim().length > 0 && fileReady;

  async function handlePickFile() {
    setPickError(null);
    setPicking(true);
    try {
      const picked = await pickAndCopySheetFile(source === 'pdf' ? PDF_MIME_TYPES : MUSICXML_MIME_TYPES);
      if (picked) {
        // The previous pick's copy in the document directory is now orphaned —
        // nothing else ever references it, so drop it rather than leaking it.
        discardCopiedSheetFile(sheetFileUri);
        setSheetFileUri(picked.uri);
        setSheetFileName(picked.name);
      }
    } catch {
      setPickError('Could not import that file. Please try again.');
    } finally {
      setPicking(false);
    }
  }

  function handleSave() {
    if (!canSave) return;
    const input = {
      title: title.trim(),
      artist: artist.trim(),
      keyIdx,
      source,
      chart: source === 'type' ? chart : '',
      sheetFileUri: source === 'type' ? null : sheetFileUri,
      sheetFileName: source === 'type' ? null : sheetFileName,
    };
    if (isEdit && existing) {
      store.updateSong(existing.id, { ...input, favorite });
      navigation.goBack();
    } else {
      const id = store.addSong(input);
      if (favorite) store.updateSong(id, { favorite: true });
      navigation.replace('LiveStage', { songId: id });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={store.settings.appearance === 'dark' ? 'light-content' : 'dark-content'} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.surface,
        }}
      >
        <Button variant="ghost" icon size={32} accessibilityLabel="Back" onPress={() => navigation.goBack()}>
          <ChevronLeftIcon size={16} color={colors.text} />
        </Button>
        <Text style={[fontHeading, { flex: 1, fontSize: 15, color: colors.text }]}>
          {isEdit ? 'Edit Song' : 'Add Song'}
        </Text>
        <Button variant="primary" onPress={handleSave} disabled={!canSave} fontSize={12}>
          Save
        </Button>
      </View>

      <View style={{ flex: 1, padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SOURCES.map((s) => {
            const active = s.value === source;
            return (
              <Button
                key={s.value}
                variant={active ? 'primary' : 'secondary'}
                fontSize={10}
                onPress={() => {
                  if (s.value === source) return;
                  // Switching tabs abandons whatever was picked for the old
                  // tab; delete its copy so it doesn't linger on disk forever.
                  discardCopiedSheetFile(sheetFileUri);
                  setSource(s.value);
                  setSheetFileUri(null);
                  setSheetFileName(null);
                  setPickError(null);
                }}
                style={{ flex: 1, paddingVertical: 5, gap: 5 }}
              >
                <SourceIcon value={s.value} color={active ? colors.accent : colors.text} />
                <Text style={{ fontSize: 10, color: active ? colors.accent : colors.text }}>{s.label}</Text>
              </Button>
            );
          })}
        </View>

        <Input value={title} onChangeText={setTitle} placeholder="Song title" fontSize={13} style={{ minHeight: 30 }} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input
            value={artist}
            onChangeText={setArtist}
            placeholder="Artist / songwriter"
            fontSize={13}
            style={{ minHeight: 30, flex: 1 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Button
              variant="secondary"
              icon
              size={30}
              accessibilityLabel="Key down"
              onPress={() => setKeyIdx((k) => (k + 11) % 12)}
            >
              <Text style={{ color: colors.text, fontSize: 14 }}>−</Text>
            </Button>
            <Tag mono style={{ minWidth: 28, justifyContent: 'center' }} textStyle={{ fontSize: 12 }}>
              {noteName(keyIdx, 'sharp')}
            </Tag>
            <Button
              variant="secondary"
              icon
              size={30}
              accessibilityLabel="Key up"
              onPress={() => setKeyIdx((k) => (k + 1) % 12)}
            >
              <Text style={{ color: colors.text, fontSize: 14 }}>+</Text>
            </Button>
            <Button
              variant={favorite ? 'primary' : 'secondary'}
              icon
              size={30}
              accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
              onPress={() => setFavorite((f) => !f)}
            >
              <StarIcon size={14} color={colors.accent} filled={favorite} />
            </Button>
          </View>
        </View>

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
        {source === 'type' && (
          <Input
            value={chart}
            onChangeText={setChart}
            mono
            multiline
            fontSize={12}
            placeholder={'G          D\nAmazing grace, how sweet the sound\nEm    C    G\nThat saved a wretch like me'}
            style={{ flex: 1, lineHeight: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SourceIcon({ value, color }: { value: SongSource; color: string }) {
  if (value === 'pdf') return <PdfFileIcon size={12} color={color} />;
  if (value === 'musicxml') return <XmlFileIcon size={12} color={color} />;
  return <TypeInIcon size={12} color={color} />;
}

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

- [ ] **Step 2: Typecheck this file specifically**

Run: `npx tsc --noEmit`
Expected: no errors reported for `src/screens/AddSongScreen.tsx`. (`LibraryScreen.tsx` and `LiveStageScreen.tsx` still error at this point — that's expected until Tasks 6 and 11.)

- [ ] **Step 3: Manual smoke check (create path only — edit path is exercised once Task 6 adds its entry point)**

Run: `npm run web` (or `npm start`). This step can't fully drive navigation yet since `LibraryScreen.tsx` still calls the old param shape and won't compile — skip the interactive check here and rely on the Task 6 smoke check, which exercises both create and edit through this screen.

- [ ] **Step 4: Commit**

```bash
git add src/screens/AddSongScreen.tsx
git commit -m "Make AddSongScreen dual-mode (create/edit) and add a favorite toggle"
```

---

## Task 6: `LibraryScreen` — 3-way sort, favorite/edit row actions

**Files:**
- Modify: `src/screens/LibraryScreen.tsx`

**Interfaces:**
- Consumes: `groupLibrary` (Task 3), `settings.librarySort` / `setLibrarySort` (Task 1), `StarIcon` / `EditIcon` (Task 2 / existing), the fixed `AddSong` route params (Task 1, consumed by `AddSongScreen` from Task 5).

- [ ] **Step 1: Rewrite `src/screens/LibraryScreen.tsx`**

```tsx
import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading } from '../theme/tokens';
import { useStore } from '../data/store';
import { groupLibrary } from '../data/librarySort';
import { noteName } from '../music/notes';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../ui/Button';
import { Card, CardMeta, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Segmented } from '../ui/Segmented';
import { EditIcon, PlusIcon, StarIcon } from '../ui/icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>;

export function LibraryScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { library, settings, setLibrarySort, updateSong } = useStore();
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? library.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            noteName(s.keyIdx, 'sharp').toLowerCase().includes(q),
        )
      : library;
    return groupLibrary(filtered, settings.librarySort);
  }, [library, search, settings.librarySort]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={settings.appearance === 'dark' ? 'light-content' : 'dark-content'} />

      <View
        style={{
          padding: 12,
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[fontHeading, { fontSize: 16, color: colors.text }]}>My Songs</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{library.length} songs</Text>
        </View>
        <Input value={search} onChangeText={setSearch} placeholder="Search songs, artists, keys…" fontSize={13} />
        <Segmented
          fontSize={11}
          value={settings.librarySort}
          onChange={setLibrarySort}
          options={[
            { value: 'letter', label: 'A–Z' },
            { value: 'key', label: 'By Key' },
            { value: 'artist', label: 'By Artist' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 10, gap: 8 }}>
        {items.map((item, i) =>
          item.type === 'divider' ? (
            <View key={`d-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 }}>
              <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted }}>
                {item.label}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
            </View>
          ) : (
            <Card key={item.song.id} row>
              <Pressable
                style={{ flex: 1, minWidth: 0 }}
                onPress={() => navigation.navigate('LiveStage', { songId: item.song.id })}
              >
                <CardTitle>{item.song.title}</CardTitle>
                <CardMeta>
                  {item.song.artist} · {noteName(item.song.keyIdx, 'sharp')}
                </CardMeta>
              </Pressable>
              <Button
                variant="ghost"
                icon
                size={30}
                accessibilityLabel={item.song.favorite ? 'Remove from favorites' : 'Add to favorites'}
                onPress={() => updateSong(item.song.id, { favorite: !item.song.favorite })}
              >
                <StarIcon size={15} color={colors.accent} filled={item.song.favorite} />
              </Button>
              <Button
                variant="ghost"
                icon
                size={30}
                accessibilityLabel="Edit song"
                onPress={() => navigation.navigate('AddSong', { mode: 'edit', songId: item.song.id })}
              >
                <EditIcon size={14} color={colors.text} />
              </Button>
            </Card>
          ),
        )}
      </ScrollView>

      <View style={{ position: 'absolute', right: 14, bottom: 14 }}>
        <Button
          variant="primary"
          icon
          size={48}
          accessibilityLabel="Add song"
          onPress={() => navigation.navigate('AddSong', { mode: 'create' })}
          style={{ borderRadius: 24, backgroundColor: colors.surface }}
        >
          <PlusIcon size={20} color={colors.accent} />
        </Button>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `src/screens/LibraryScreen.tsx` or `src/screens/AddSongScreen.tsx`. `src/screens/LiveStageScreen.tsx` still errors (reads the now-removed `store.setlist`) — expected until Task 11.

- [ ] **Step 3: Manual smoke check**

Run: `npm run web`. On the Library screen: switch the sort segmented control between A–Z / By Key / By Artist and confirm the grouping headers change accordingly; tap a song's star and confirm it fills/unfills; tap a song's edit (pencil) icon, confirm `AddSongScreen` opens pre-filled with that song's data titled "Edit Song", change the title, save, and confirm it navigates back to Library with the updated title showing. Then tap the floating "+" button and confirm it opens a blank "Add Song" screen.

- [ ] **Step 4: Commit**

```bash
git add src/screens/LibraryScreen.tsx
git commit -m "Add By Artist sort and favorite/edit row actions to the Library screen"
```

---

## Task 7: `MenuDrawerSettingsTab` (first RNR-based component)

**Files:**
- Create: `src/screens/live-stage/MenuDrawerSettingsTab.tsx`

**Interfaces:**
- Consumes: `Button`... actually no `Button` here — `Text`, `ToggleGroup`/`ToggleGroupItem`, `Separator` from `@/components/ui/*` (Task 4 Step 0); `useStore` (Task 1) for `settings.enharmonic`/`setEnharmonic`/`updateSong`; `Song`, `SheetMode` from `../../data/types`; `Enharmonic` from `../../music/notes`.
- Produces: `export function MenuDrawerSettingsTab({ song }: { song: Song }): JSX.Element`, consumed by `MenuDrawer` in Task 11.

This is deliberately the simplest of the three tabs (two toggle groups, no lists) so it's the first thing to prove the RNR primitives and brand colors from Task 4 actually render correctly before building the more complex tabs.

- [ ] **Step 1: Create `src/screens/live-stage/MenuDrawerSettingsTab.tsx`**

```tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useStore } from '../../data/store';
import { Song, SheetMode } from '../../data/types';
import { Enharmonic } from '../../music/notes';

interface MenuDrawerSettingsTabProps {
  song: Song;
}

export function MenuDrawerSettingsTab({ song }: MenuDrawerSettingsTabProps) {
  const { settings, setEnharmonic, updateSong } = useStore();

  return (
    <View className="flex-1 gap-4 p-3.5">
      <Text className="text-[14px] font-semibold text-foreground">Settings</Text>

      <View className="gap-2">
        <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">Notation</Text>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[13px] text-foreground/80">Enharmonic spelling</Text>
          <ToggleGroup
            type="single"
            value={settings.enharmonic}
            onValueChange={(v) => v && setEnharmonic(v as Enharmonic)}
          >
            <ToggleGroupItem value="sharp">
              <Text className="text-[12.5px]">♯ Sharp</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="flat">
              <Text className="text-[12.5px]">♭ Flat</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        </View>
      </View>

      <Separator />

      <View className="gap-2">
        <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">Sheet music</Text>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[13px] text-foreground/80" numberOfLines={1}>
            Source for "{song.title}"
          </Text>
          <ToggleGroup
            type="single"
            value={song.sheetMode}
            onValueChange={(v) => v && updateSong(song.id, { sheetMode: v as SheetMode })}
          >
            <ToggleGroupItem value="pdf">
              <Text className="text-[12.5px]">PDF</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="musicxml">
              <Text className="text-[12.5px]">MusicXML</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this new file. If it errors on the `@/components/ui/*` imports, Task 4 Step 0 (the manual CLI install) hasn't been done yet — stop and ask the human to do it.

- [ ] **Step 3: Manual render check**

This component isn't wired into any screen yet (that happens in Task 11), so render it standalone: temporarily mount `<MenuDrawerSettingsTab song={Object.values(useStore().library)[0]} />` inside `LiveStageScreen` (or any existing screen) behind a dev-only conditional, run `npm run web`, confirm it renders with the warm brand colors from Task 4 (not shadcn's default gray) and that both toggle groups switch correctly, then remove the temporary mount before committing.

- [ ] **Step 4: Commit**

```bash
git add src/screens/live-stage/MenuDrawerSettingsTab.tsx
git commit -m "Add the menu drawer's Settings tab (enharmonic spelling, current song's sheet source)"
```

---

## Task 8: `MenuDrawerLibraryTab`

**Files:**
- Create: `src/screens/live-stage/MenuDrawerLibraryTab.tsx`

**Interfaces:**
- Consumes: `groupLibrary` (Task 3); `useStore` (Task 1) for `library`/`settings.librarySort`/`setLibrarySort`/`updateSong`; `EditIcon`, `PlusIcon`, `StarIcon` (Task 2 / existing); `Button`, `Text`, `ToggleGroup`/`ToggleGroupItem` from `@/components/ui/*`.
- Produces: `export function MenuDrawerLibraryTab({ onNavigateSong, onCreateSong, onEditSong }: MenuDrawerLibraryTabProps): JSX.Element` where `MenuDrawerLibraryTabProps = { onNavigateSong: (id: string) => void; onCreateSong: () => void; onEditSong: (id: string) => void }`. Consumed by `MenuDrawer` in Task 11.

- [ ] **Step 1: Create `src/screens/live-stage/MenuDrawerLibraryTab.tsx`**

```tsx
import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../../theme/ThemeContext';
import { useStore } from '../../data/store';
import { groupLibrary } from '../../data/librarySort';
import { LibrarySort } from '../../data/types';
import { noteName } from '../../music/notes';
import { EditIcon, PlusIcon, StarIcon } from '../../ui/icons';

interface MenuDrawerLibraryTabProps {
  onNavigateSong: (id: string) => void;
  onCreateSong: () => void;
  onEditSong: (id: string) => void;
}

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: 'letter', label: 'Letter' },
  { value: 'key', label: 'Key' },
  { value: 'artist', label: 'Artist' },
];

export function MenuDrawerLibraryTab({ onNavigateSong, onCreateSong, onEditSong }: MenuDrawerLibraryTabProps) {
  const { colors } = useTheme();
  const { library, settings, setLibrarySort, updateSong } = useStore();

  const items = useMemo(() => groupLibrary(library, settings.librarySort), [library, settings.librarySort]);

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between gap-2 border-b border-border px-3 pb-1.5 pt-2.5">
        <Text className="text-[15px] font-semibold text-foreground">
          My Songs <Text className="text-[11px] font-normal text-muted-foreground">· {library.length}</Text>
        </Text>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7"
          onPress={onCreateSong}
          accessibilityLabel="Create a new song"
        >
          <PlusIcon size={14} color={colors.text} />
        </Button>
      </View>

      <ScrollView contentContainerClassName="gap-1 px-2.5 py-1.5" showsVerticalScrollIndicator={false}>
        {items.map((item, i) =>
          item.type === 'divider' ? (
            <View key={`d-${i}`} className="flex-row items-center gap-1.5 pb-0 pt-1.5">
              <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</Text>
              <View className="h-px flex-1 bg-border" />
            </View>
          ) : (
            <View key={item.song.id} className="flex-row items-center gap-2 rounded-md border border-border px-2 py-1.5">
              <Pressable className="min-w-0 flex-1" onPress={() => onNavigateSong(item.song.id)}>
                <Text className="text-[14px] font-medium text-foreground" numberOfLines={1}>
                  {item.song.title}
                </Text>
                <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
                  {item.song.artist} · {noteName(item.song.keyIdx, 'sharp')}
                </Text>
              </Pressable>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                accessibilityLabel={item.song.favorite ? 'Remove from favorites' : 'Add to favorites'}
                onPress={() => updateSong(item.song.id, { favorite: !item.song.favorite })}
              >
                <StarIcon size={14} color={colors.accent} filled={item.song.favorite} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                accessibilityLabel="Edit song"
                onPress={() => onEditSong(item.song.id)}
              >
                <EditIcon size={13} color={colors.text} />
              </Button>
            </View>
          ),
        )}
      </ScrollView>

      <View className="flex-row border-t border-border px-2 py-1">
        <ToggleGroup
          type="single"
          value={settings.librarySort}
          onValueChange={(v) => v && setLibrarySort(v as LibrarySort)}
          className="flex-1"
        >
          {SORT_OPTIONS.map((opt) => (
            <ToggleGroupItem key={opt.value} value={opt.value} className="flex-1">
              <Text className="text-[12px] font-medium">{opt.label}</Text>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this new file.

- [ ] **Step 3: Commit**

```bash
git add src/screens/live-stage/MenuDrawerLibraryTab.tsx
git commit -m "Add the menu drawer's Library tab (sort, favorite/edit actions, jump to song)"
```

(Manual rendering of this component is covered by Task 11's full smoke check, once it's wired into `MenuDrawer`.)

---

## Task 9: `SetlistBuildView`

**Files:**
- Create: `src/screens/live-stage/SetlistBuildView.tsx`

**Interfaces:**
- Consumes: `useStore` (Task 1) for `library`/`setlists`/`createSetlist`/`updateSetlist`; `ChevronDownIcon`/`ChevronLeftIcon`/`ChevronUpIcon`/`PlusIcon`/`StarIcon`/`XIcon` (Task 2 / existing); `Button`, `Input`, `Text`, `Separator`, `ToggleGroup`/`ToggleGroupItem` from `@/components/ui/*`.
- Produces: `export function SetlistBuildView({ setlistId, onDone }: SetlistBuildViewProps): JSX.Element` where `SetlistBuildViewProps = { setlistId: string | null; onDone: () => void }` (`null` = creating a new setlist, an id = editing that existing one). Consumed by `MenuDrawerSetlistTab` in Task 10.

- [ ] **Step 1: Create `src/screens/live-stage/SetlistBuildView.tsx`**

```tsx
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../../theme/ThemeContext';
import { useStore } from '../../data/store';
import { noteName } from '../../music/notes';
import { ChevronDownIcon, ChevronLeftIcon, ChevronUpIcon, PlusIcon, StarIcon, XIcon } from '../../ui/icons';

interface SetlistBuildViewProps {
  setlistId: string | null;
  onDone: () => void;
}

export function SetlistBuildView({ setlistId, onDone }: SetlistBuildViewProps) {
  const { colors } = useTheme();
  const { library, setlists, createSetlist, updateSetlist } = useStore();
  const existing = setlistId ? setlists.find((s) => s.id === setlistId) ?? null : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [draftIds, setDraftIds] = useState<string[]>(existing?.songIds ?? []);
  const [addFilter, setAddFilter] = useState<'all' | 'favorites'>('all');

  const draftSongs = draftIds
    .map((id) => library.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const available = library
    .filter((s) => !draftIds.includes(s.id))
    .filter((s) => addFilter === 'all' || s.favorite);
  const keyMap = draftSongs.map((s) => noteName(s.keyIdx, 'sharp')).join(' → ') || '—';
  const canSave = name.trim().length > 0;

  function moveDraft(index: number, dir: -1 | 1) {
    setDraftIds((ids) => {
      const target = index + dir;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    if (!canSave) return;
    if (existing) {
      updateSetlist(existing.id, { name: name.trim(), songIds: draftIds });
    } else {
      createSetlist(name.trim(), draftIds);
    }
    onDone();
  }

  return (
    <ScrollView contentContainerClassName="gap-3 p-3" showsVerticalScrollIndicator={false}>
      <Button variant="ghost" size="sm" onPress={onDone} className="flex-row gap-1 self-start px-2">
        <ChevronLeftIcon size={13} color={colors.accent} />
        <Text className="text-[12px] font-medium text-primary">Back</Text>
      </Button>

      <Input value={name} onChangeText={setName} placeholder="Setlist name (e.g. Sunday AM)" className="h-9 text-[13px]" />

      <Separator />

      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Draft order · {draftSongs.length} songs
        </Text>
        <Text className="text-[11px] text-primary">{keyMap}</Text>
      </View>

      <View className="gap-1.5">
        {draftSongs.map((song, i) => (
          <View key={song.id} className="flex-row items-center gap-2 rounded-md border border-border px-2.5 py-2">
            <View className="min-w-0 flex-1">
              <Text className="text-[13px] font-medium text-foreground" numberOfLines={1}>
                {song.title}
              </Text>
              <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                {song.artist} · Key of {noteName(song.keyIdx, 'sharp')}
              </Text>
            </View>
            <View className="gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-5"
                disabled={i === 0}
                accessibilityLabel="Move up"
                onPress={() => moveDraft(i, -1)}
              >
                <ChevronUpIcon size={11} color={colors.text} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-5"
                disabled={i === draftSongs.length - 1}
                accessibilityLabel="Move down"
                onPress={() => moveDraft(i, 1)}
              >
                <ChevronDownIcon size={11} color={colors.text} />
              </Button>
            </View>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              accessibilityLabel="Remove from setlist"
              onPress={() => setDraftIds((ids) => ids.filter((x) => x !== song.id))}
            >
              <XIcon size={13} color={colors.text} />
            </Button>
          </View>
        ))}
        {draftSongs.length === 0 && (
          <Text className="py-2 text-center text-[12px] text-muted-foreground">No songs yet — add one below.</Text>
        )}
      </View>

      <Separator />

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">Add songs</Text>
          <ToggleGroup type="single" value={addFilter} onValueChange={(v) => v && setAddFilter(v as 'all' | 'favorites')}>
            <ToggleGroupItem value="all">
              <Text className="text-[11px]">All</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="favorites" className="flex-row gap-1">
              <StarIcon size={11} color={colors.accent} filled={addFilter === 'favorites'} />
              <Text className="text-[11px]">Favorites</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        </View>

        {available.map((song) => (
          <View key={song.id} className="flex-row items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
            <View className="min-w-0 flex-1">
              <Text className="text-[13px] font-medium text-foreground" numberOfLines={1}>
                {song.title}
              </Text>
              <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                {noteName(song.keyIdx, 'sharp')}
              </Text>
            </View>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              accessibilityLabel={`Add ${song.title} to setlist`}
              onPress={() => setDraftIds((ids) => [...ids, song.id])}
            >
              <PlusIcon size={12} color={colors.text} />
            </Button>
          </View>
        ))}
        {available.length === 0 && (
          <Text className="py-2 text-center text-[12px] text-muted-foreground">
            {addFilter === 'favorites' ? 'No favorite songs left to add.' : 'All songs are already in this setlist.'}
          </Text>
        )}
      </View>

      <Button onPress={handleSave} disabled={!canSave} className="mt-1">
        <Text className="text-[13px] font-semibold">Save setlist</Text>
      </Button>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this new file.

- [ ] **Step 3: Commit**

```bash
git add src/screens/live-stage/SetlistBuildView.tsx
git commit -m "Add the setlist build flow: name, manual reorder/remove, filtered add-songs list"
```

---

## Task 10: `MenuDrawerSetlistTab`

**Files:**
- Create: `src/screens/live-stage/MenuDrawerSetlistTab.tsx`

**Interfaces:**
- Consumes: `useStore` (Task 1) for `setlists`/`songs`; `SetlistBuildView` (Task 9); `EditIcon`, `GripIcon`, `PlusIcon` (existing/Task 2).
- Produces: `export function MenuDrawerSetlistTab({ onNavigateSong }: { onNavigateSong: (id: string) => void }): JSX.Element`. Consumed by `MenuDrawer` in Task 11.

- [ ] **Step 1: Create `src/screens/live-stage/MenuDrawerSetlistTab.tsx`**

```tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTheme } from '../../theme/ThemeContext';
import { useStore } from '../../data/store';
import { noteName } from '../../music/notes';
import { EditIcon, GripIcon, PlusIcon } from '../../ui/icons';
import { SetlistBuildView } from './SetlistBuildView';

interface MenuDrawerSetlistTabProps {
  onNavigateSong: (id: string) => void;
}

export function MenuDrawerSetlistTab({ onNavigateSong }: MenuDrawerSetlistTabProps) {
  const { colors } = useTheme();
  const { setlists, songs } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [buildTarget, setBuildTarget] = useState<'new' | string | null>(null);

  if (buildTarget !== null) {
    return <SetlistBuildView setlistId={buildTarget === 'new' ? null : buildTarget} onDone={() => setBuildTarget(null)} />;
  }

  return (
    <ScrollView contentContainerClassName="gap-3 p-3" showsVerticalScrollIndicator={false}>
      <Text className="text-[14px] font-semibold text-foreground">Setlists</Text>

      <View className="gap-2">
        {setlists.map((setlist) => {
          const setlistSongs = setlist.songIds
            .map((id) => songs[id])
            .filter((s): s is NonNullable<typeof s> => Boolean(s));
          const keyMap = setlistSongs.map((s) => noteName(s.keyIdx, 'sharp')).join(' → ') || '—';
          const expanded = expandedId === setlist.id;
          return (
            <View key={setlist.id} className="gap-1.5 rounded-md border border-border p-3">
              <Pressable
                className="flex-row items-center justify-between gap-2"
                onPress={() => setExpandedId(expanded ? null : setlist.id)}
              >
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
                    {setlist.name}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    {setlistSongs.length} songs · {keyMap}
                  </Text>
                </View>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  accessibilityLabel={`Edit ${setlist.name}`}
                  onPress={() => setBuildTarget(setlist.id)}
                >
                  <EditIcon size={13} color={colors.text} />
                </Button>
              </Pressable>

              {expanded && (
                <View className="gap-1.5 pt-1.5">
                  {setlistSongs.map((song) => (
                    <Pressable
                      key={song.id}
                      className="flex-row items-center gap-2 rounded-md border border-border px-2 py-1.5"
                      onPress={() => onNavigateSong(song.id)}
                    >
                      <GripIcon size={13} color={colors.text} />
                      <View className="min-w-0 flex-1">
                        <Text className="text-[13px] font-medium text-foreground" numberOfLines={1}>
                          {song.title}
                        </Text>
                        <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                          Key of {noteName(song.keyIdx, 'sharp')}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                  {setlistSongs.length === 0 && (
                    <Text className="text-[12px] text-muted-foreground">No songs in this setlist yet.</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Button variant="secondary" onPress={() => setBuildTarget('new')} className="flex-row gap-1.5">
        <PlusIcon size={14} color={colors.text} />
        <Text className="text-[13px] font-medium">Create a new Setlist</Text>
      </Button>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this new file.

- [ ] **Step 3: Commit**

```bash
git add src/screens/live-stage/MenuDrawerSetlistTab.tsx
git commit -m "Add the menu drawer's Setlist tab: saved setlists, expand-to-jump, and the create/edit flow"
```

---

## Task 11: `MenuDrawer` shell — wire it in, delete `SetlistDrawer`

**Files:**
- Create: `src/screens/live-stage/MenuDrawer.tsx`
- Modify: `src/screens/LiveStageScreen.tsx`
- Delete: `src/screens/live-stage/SetlistDrawer.tsx`

**Interfaces:**
- Consumes: `MenuDrawerLibraryTab` (Task 8), `MenuDrawerSetlistTab` (Task 10), `MenuDrawerSettingsTab` (Task 7); `LibraryIcon`/`SetlistIcon`/`SettingsIcon`/`XIcon` (Task 2 / existing); `Button`, `Text` from `@/components/ui/*`.
- Produces: `export function MenuDrawer(props: MenuDrawerProps): JSX.Element` where `MenuDrawerProps = { visible: boolean; onClose: () => void; song: Song; onNavigateSong: (id: string) => void; onCreateSong: () => void; onEditSong: (id: string) => void }`.

- [ ] **Step 1: Create `src/screens/live-stage/MenuDrawer.tsx`**

```tsx
import React, { useState } from 'react';
import { Modal, Pressable, SafeAreaView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTheme } from '../../theme/ThemeContext';
import { Song } from '../../data/types';
import { LibraryIcon, SetlistIcon, SettingsIcon, XIcon } from '../../ui/icons';
import { MenuDrawerLibraryTab } from './MenuDrawerLibraryTab';
import { MenuDrawerSetlistTab } from './MenuDrawerSetlistTab';
import { MenuDrawerSettingsTab } from './MenuDrawerSettingsTab';

type RailTab = 'library' | 'setlist' | 'settings';

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  song: Song;
  onNavigateSong: (id: string) => void;
  onCreateSong: () => void;
  onEditSong: (id: string) => void;
}

export function MenuDrawer({ visible, onClose, song, onNavigateSong, onCreateSong, onEditSong }: MenuDrawerProps) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<RailTab>('library');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 flex-row bg-black/45" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="h-full w-[78%] flex-row overflow-hidden rounded-r-2xl bg-card"
        >
          <SafeAreaView className="flex-1 flex-row">
            <View className="w-24 gap-3.5 border-r border-border px-1.5 py-2.5">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-[14px] font-semibold text-foreground">Menu</Text>
                <Button variant="ghost" size="icon" className="h-6 w-6" onPress={onClose} accessibilityLabel="Close">
                  <XIcon size={11} color={colors.text} />
                </Button>
              </View>
              <View className="gap-1.5">
                <RailButton active={tab === 'library'} label="Library" onPress={() => setTab('library')}>
                  <LibraryIcon size={18} color={tab === 'library' ? colors.accent : colors.text} />
                </RailButton>
                <RailButton active={tab === 'setlist'} label="Setlist" onPress={() => setTab('setlist')}>
                  <SetlistIcon size={18} color={tab === 'setlist' ? colors.accent : colors.text} />
                </RailButton>
                <RailButton active={tab === 'settings'} label="Settings" onPress={() => setTab('settings')}>
                  <SettingsIcon size={18} color={tab === 'settings' ? colors.accent : colors.text} />
                </RailButton>
              </View>
            </View>

            <View className="min-w-0 flex-1">
              {tab === 'library' && (
                <MenuDrawerLibraryTab onNavigateSong={onNavigateSong} onCreateSong={onCreateSong} onEditSong={onEditSong} />
              )}
              {tab === 'setlist' && <MenuDrawerSetlistTab onNavigateSong={onNavigateSong} />}
              {tab === 'settings' && <MenuDrawerSettingsTab song={song} />}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RailButton({
  active,
  label,
  onPress,
  children,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} className={`items-center gap-1 rounded-md px-1 py-2 ${active ? 'bg-accent' : 'bg-transparent'}`}>
      {children}
      <Text className={`text-[10.5px] ${active ? 'font-medium text-primary' : 'text-foreground/65'}`}>{label}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Wire it into `src/screens/LiveStageScreen.tsx`**

Replace the `SetlistDrawer` import and usage. The full file becomes:

```tsx
import React, { useState } from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading } from '../theme/tokens';
import { useStore } from '../data/store';
import { noteName } from '../music/notes';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { EditIcon, MenuIcon, SettingsIcon } from '../ui/icons';
import { ChordGrid } from './live-stage/ChordGrid';
import { SheetView } from './live-stage/SheetView';
import { SettingsSheet } from './live-stage/SettingsSheet';
import { MenuDrawer } from './live-stage/MenuDrawer';
import { QuickToolsFab } from './live-stage/QuickToolsFab';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveStage'>;

export function LiveStageScreen({ route, navigation }: Props) {
  const { songId } = route.params;
  const { colors } = useTheme();
  const store = useStore();
  const song = store.songs[songId];

  const [view, setView] = useState<'chord' | 'sheet'>('chord');
  const [editMode, setEditMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  if (!song) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text }}>Song not found.</Text>
      </SafeAreaView>
    );
  }

  const liveKey = noteName(((song.keyIdx + song.transposeSemi) % 12 + 12) % 12, store.settings.enharmonic);
  const sourceLabel = song.sheetFileName
    ? `${song.sheetFileName} — ${song.sheetMode === 'pdf' ? 'static' : 'transposable'}`
    : song.sheetMode === 'pdf'
    ? 'Uploaded PDF — static'
    : 'MusicXML — transposable';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={store.settings.appearance === 'dark' ? 'light-content' : 'dark-content'} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.surface,
        }}
      >
        <Button variant="secondary" icon size={36} accessibilityLabel="Menu" onPress={() => setMenuOpen(true)}>
          <MenuIcon size={16} color={colors.text} />
        </Button>
        <Text
          style={[fontHeading, { flex: 1, minWidth: 0, fontSize: 14, color: colors.text }]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Segmented
          fontSize={11}
          value={view}
          onChange={setView}
          options={[
            { value: 'chord', label: 'Chord' },
            { value: 'sheet', label: 'Sheet' },
          ]}
        />
        <Button
          variant="secondary"
          icon
          size={36}
          active={editMode}
          accessibilityLabel="Edit"
          onPress={() => setEditMode((v) => !v)}
        >
          <EditIcon size={16} color={editMode ? colors.accent : colors.text} />
        </Button>
        <Button variant="secondary" icon size={36} accessibilityLabel="Settings" onPress={() => setSettingsOpen(true)}>
          <SettingsIcon size={17} color={colors.text} />
        </Button>
      </View>

      <View style={{ flex: 1 }}>
        {view === 'chord' ? (
          <ChordGrid
            chart={song.chart}
            transposeSemi={song.transposeSemi}
            enharmonic={store.settings.enharmonic}
            editMode={editMode}
            onChangeChart={(raw) => store.updateSong(song.id, { chart: raw })}
            autoScroll={song.autoScroll}
          />
        ) : (
          <SheetView
            song={song}
            sourceLabel={sourceLabel}
            liveKey={liveKey}
            enharmonic={store.settings.enharmonic}
            onUpdateSong={(patch) => store.updateSong(song.id, patch)}
          />
        )}
        <QuickToolsFab open={fabOpen} onToggle={() => setFabOpen((v) => !v)} />
      </View>

      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        song={song}
        onUpdateSong={(patch) => store.updateSong(song.id, patch)}
        appearance={store.settings.appearance}
        onSetAppearance={store.setAppearance}
        enharmonic={store.settings.enharmonic}
        onSetEnharmonic={store.setEnharmonic}
      />

      <MenuDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        song={song}
        onNavigateSong={(id) => {
          setMenuOpen(false);
          navigation.push('LiveStage', { songId: id });
        }}
        onCreateSong={() => {
          setMenuOpen(false);
          navigation.navigate('AddSong', { mode: 'create' });
        }}
        onEditSong={(id) => {
          setMenuOpen(false);
          navigation.navigate('AddSong', { mode: 'edit', songId: id });
        }}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Delete the superseded drawer**

```bash
git rm src/screens/live-stage/SetlistDrawer.tsx
```

- [ ] **Step 4: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors (this is the task that resolves the last of the transient errors noted since Task 1).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS (all suites, including `store.test.ts` and `librarySort.test.ts`).

- [ ] **Step 6: Manual end-to-end smoke check**

Run: `npm run web`. From the Library screen, open a song into Live Stage. Tap "Menu":
- **Library tab** (default): confirm it lists songs grouped per the Letter/Key/Artist toggle at the bottom, star-toggling and edit-pencil work, tapping a song navigates and closes the drawer, "+" opens `AddSongScreen` in create mode.
- **Setlist tab**: confirm "Sunday AM — Aug 23" and "Youth Night — Aug 27" both appear with the right song counts and key sequences; tap one to expand it and confirm tapping a song inside jumps to it in Live Stage; tap its edit icon and confirm the build view opens pre-filled, reorder a song with the up/down buttons, remove one, add one back from the Add-songs list (try the Favorites filter too), save, and confirm the change is reflected back in the list view. Then tap "Create a new Setlist", fill in a name, add a couple of songs, save, and confirm the new setlist appears in the list.
- **Settings tab**: confirm the enharmonic toggle and current song's sheet-source toggle both work and match what the equivalent controls in the existing per-song Settings sheet show.
- Toggle Appearance (via the existing Settings-button sheet) to Stage Dark while the Menu drawer is open on each tab, and confirm the RNR components (buttons, toggle groups, text) switch to the dark brand palette rather than staying light or falling back to shadcn gray.

- [ ] **Step 7: Commit**

```bash
git add src/screens/live-stage/MenuDrawer.tsx src/screens/LiveStageScreen.tsx
git commit -m "Replace SetlistDrawer with the unified Library/Setlist/Settings menu drawer"
```

---

## Task 12: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all suites pass, including the untouched pre-existing ones (`chart.test.ts`, `musicxmlTransform.test.ts`, `importSheetFile.test.ts`).

- [ ] **Step 3: Re-run the Task 11 Step 6 manual walkthrough once more end to end**

Confirms nothing regressed between Task 11's commit and the final state of the branch.

- [ ] **Step 4: Confirm no dead references to the removed single-setlist concept remain**

Run: `grep -rn "libraryGroupByKey\|addToSetlist\|SetlistDrawer" src/` (excluding this plan/spec doc) — expect no matches.
