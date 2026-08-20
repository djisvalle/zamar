import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { Appearance } from '../theme/tokens';
import { Enharmonic } from '../music/notes';
import { LIBRARY_SEED, SETLISTS_SEED } from './mockSongs';
import { deriveSheetMode } from './sheetMode';
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
  | { type: 'updateSetlist'; id: string; patch: Partial<Pick<Setlist, 'name' | 'songIds'>> }
  | { type: 'deleteSetlist'; id: string };

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
        sheetMode: deriveSheetMode(action.input.source),
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
    case 'deleteSetlist': {
      const { [action.id]: _removed, ...remainingSetlists } = state.setlists;
      return {
        ...state,
        setlists: remainingSetlists,
        setlistOrder: state.setlistOrder.filter((id) => id !== action.id),
      };
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
  deleteSetlist: (id: string) => void;
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

  const deleteSetlist = useCallback((id: string) => {
    dispatch({ type: 'deleteSetlist', id });
  }, []);

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
    deleteSetlist,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
