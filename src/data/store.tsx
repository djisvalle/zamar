import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { Appearance } from '../theme/tokens';
import { Enharmonic } from '../music/notes';
import { LIBRARY_SEED, SETLIST_SEED } from './mockSongs';
import { NewSongInput, Song } from './types';

interface AppSettings {
  appearance: Appearance; // "Appearance (app-wide)"
  enharmonic: Enharmonic; // "Enharmonic" — also app-wide per the settings sheet
  libraryGroupByKey: boolean;
}

interface State {
  songs: Record<string, Song>;
  setlist: string[];
  settings: AppSettings;
}

type Action =
  | { type: 'updateSong'; id: string; patch: Partial<Song> }
  | { type: 'addSong'; id: string; input: NewSongInput; addToSetlist: boolean }
  | { type: 'setAppearance'; appearance: Appearance }
  | { type: 'setEnharmonic'; enharmonic: Enharmonic }
  | { type: 'setLibraryGroupByKey'; value: boolean };

function slugify(title: string) {
  const base = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'song';
  return `${base}-${Date.now().toString(36)}`;
}

function reducer(state: State, action: Action): State {
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
        transposeSemi: 0,
        capo: 0,
        clef: 'treble',
        sheetMode: action.input.source === 'pdf' ? 'pdf' : 'musicxml',
        autoScroll: false,
      };
      return {
        ...state,
        songs: { ...state.songs, [id]: song },
        setlist: action.addToSetlist ? [...state.setlist, id] : state.setlist,
      };
    }
    case 'setAppearance':
      return { ...state, settings: { ...state.settings, appearance: action.appearance } };
    case 'setEnharmonic':
      return { ...state, settings: { ...state.settings, enharmonic: action.enharmonic } };
    case 'setLibraryGroupByKey':
      return { ...state, settings: { ...state.settings, libraryGroupByKey: action.value } };
    default:
      return state;
  }
}

function initState(): State {
  const songs: Record<string, Song> = {};
  for (const s of LIBRARY_SEED) songs[s.id] = s;
  return {
    songs,
    setlist: SETLIST_SEED,
    settings: { appearance: 'light', enharmonic: 'sharp', libraryGroupByKey: false },
  };
}

interface StoreValue {
  songs: Record<string, Song>;
  library: Song[];
  setlist: Song[];
  settings: AppSettings;
  updateSong: (id: string, patch: Partial<Song>) => void;
  addSong: (input: NewSongInput, addToSetlist: boolean) => string;
  setAppearance: (a: Appearance) => void;
  setEnharmonic: (e: Enharmonic) => void;
  setLibraryGroupByKey: (v: boolean) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const updateSong = useCallback((id: string, patch: Partial<Song>) => {
    dispatch({ type: 'updateSong', id, patch });
  }, []);

  const addSong = useCallback((input: NewSongInput, addToSetlist: boolean) => {
    const id = slugify(input.title);
    dispatch({ type: 'addSong', id, input, addToSetlist });
    return id;
  }, []);

  const setAppearance = useCallback((appearance: Appearance) => dispatch({ type: 'setAppearance', appearance }), []);
  const setEnharmonic = useCallback((enharmonic: Enharmonic) => dispatch({ type: 'setEnharmonic', enharmonic }), []);
  const setLibraryGroupByKey = useCallback(
    (value: boolean) => dispatch({ type: 'setLibraryGroupByKey', value }),
    [],
  );

  const library = useMemo(() => Object.values(state.songs), [state.songs]);
  const setlist = useMemo(
    () => state.setlist.map((id) => state.songs[id]).filter((s): s is Song => Boolean(s)),
    [state.setlist, state.songs],
  );

  const value: StoreValue = {
    songs: state.songs,
    library,
    setlist,
    settings: state.settings,
    updateSong,
    addSong,
    setAppearance,
    setEnharmonic,
    setLibraryGroupByKey,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
