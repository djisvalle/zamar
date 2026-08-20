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
  activeSetlistId?: string | null;
  activeSongId?: string | null;
} = {}) {
  return {
    songs: overrides.songs ?? {},
    setlists: overrides.setlists ?? {},
    setlistOrder: overrides.setlistOrder ?? [],
    activeSetlistId: overrides.activeSetlistId ?? null,
    activeSongId: overrides.activeSongId ?? null,
    settings: {
      appearance: 'light' as const,
      enharmonic: 'sharp' as const,
      showNoteNames: false,
      librarySort: 'letter' as const,
      autoOrderSetlists: true,
    },
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

describe('reducer — setShowNoteNames', () => {
  it('updates settings.showNoteNames', () => {
    const next = reducer(baseState(), { type: 'setShowNoteNames', value: true });
    expect(next.settings.showNoteNames).toBe(true);
  });
});

describe('reducer — setAutoOrderSetlists', () => {
  it('updates settings.autoOrderSetlists', () => {
    const next = reducer(baseState(), { type: 'setAutoOrderSetlists', value: false });
    expect(next.settings.autoOrderSetlists).toBe(false);
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

  it('becomes the active setlist when none was active yet', () => {
    const next = reducer(baseState({ activeSetlistId: null }), {
      type: 'createSetlist',
      id: 'sl1',
      name: 'Sunday AM',
      songIds: [],
    });
    expect(next.activeSetlistId).toBe('sl1');
  });

  it('does not steal the active slot from an already-active setlist', () => {
    const state = baseState({
      setlists: { sl1: { id: 'sl1', name: 'First', songIds: [] } },
      setlistOrder: ['sl1'],
      activeSetlistId: 'sl1',
    });
    const next = reducer(state, { type: 'createSetlist', id: 'sl2', name: 'Second', songIds: [] });
    expect(next.activeSetlistId).toBe('sl1');
  });

  it('sets activeSongId to the first song when it becomes the active setlist', () => {
    const next = reducer(baseState({ activeSetlistId: null }), {
      type: 'createSetlist',
      id: 'sl1',
      name: 'Sunday AM',
      songIds: ['s1', 's2'],
    });
    expect(next.activeSongId).toBe('s1');
  });

  it('leaves activeSongId untouched when it does not become the active setlist', () => {
    const state = baseState({
      setlists: { sl1: { id: 'sl1', name: 'First', songIds: ['s1'] } },
      setlistOrder: ['sl1'],
      activeSetlistId: 'sl1',
      activeSongId: 's1',
    });
    const next = reducer(state, { type: 'createSetlist', id: 'sl2', name: 'Second', songIds: ['s2'] });
    expect(next.activeSongId).toBe('s1');
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

  it('clamps activeSongId to the new first song when it drops out of the active setlist', () => {
    const state = baseState({
      setlists: { sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1', 's2'] } },
      setlistOrder: ['sl1'],
      activeSetlistId: 'sl1',
      activeSongId: 's1',
    });
    const next = reducer(state, { type: 'updateSetlist', id: 'sl1', patch: { songIds: ['s2', 's3'] } });
    expect(next.activeSongId).toBe('s2');
  });

  it('leaves activeSongId untouched when editing a setlist that is not active', () => {
    const state = baseState({
      setlists: { sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1'] } },
      setlistOrder: ['sl1'],
      activeSetlistId: null,
      activeSongId: 's9',
    });
    const next = reducer(state, { type: 'updateSetlist', id: 'sl1', patch: { songIds: ['s2'] } });
    expect(next.activeSongId).toBe('s9');
  });
});

describe('reducer — deleteSetlist', () => {
  it('removes the setlist from both setlists and setlistOrder, leaving other setlists untouched', () => {
    const state = baseState({
      setlists: {
        sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1'] },
        sl2: { id: 'sl2', name: 'Sunday PM', songIds: ['s2'] },
      },
      setlistOrder: ['sl1', 'sl2'],
    });
    const next = reducer(state, { type: 'deleteSetlist', id: 'sl1' });
    expect(next.setlists).toEqual({ sl2: { id: 'sl2', name: 'Sunday PM', songIds: ['s2'] } });
    expect(next.setlistOrder).toEqual(['sl2']);
  });

  it('is a safe no-op when the setlist does not exist', () => {
    const state = baseState({
      setlists: { sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1'] } },
      setlistOrder: ['sl1'],
    });
    const next = reducer(state, { type: 'deleteSetlist', id: 'missing' });
    expect(next.setlists).toEqual(state.setlists);
    expect(next.setlistOrder).toEqual(state.setlistOrder);
  });

  it('reassigns the active setlist to the next remaining one when the active setlist is deleted', () => {
    const state = baseState({
      setlists: {
        sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1'] },
        sl2: { id: 'sl2', name: 'Sunday PM', songIds: ['s2'] },
      },
      setlistOrder: ['sl1', 'sl2'],
      activeSetlistId: 'sl1',
    });
    const next = reducer(state, { type: 'deleteSetlist', id: 'sl1' });
    expect(next.activeSetlistId).toBe('sl2');
  });

  it('clears the active setlist when it was the last one', () => {
    const state = baseState({
      setlists: { sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1'] } },
      setlistOrder: ['sl1'],
      activeSetlistId: 'sl1',
    });
    const next = reducer(state, { type: 'deleteSetlist', id: 'sl1' });
    expect(next.activeSetlistId).toBeNull();
  });

  it('leaves the active setlist untouched when a different setlist is deleted', () => {
    const state = baseState({
      setlists: {
        sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1'] },
        sl2: { id: 'sl2', name: 'Sunday PM', songIds: ['s2'] },
      },
      setlistOrder: ['sl1', 'sl2'],
      activeSetlistId: 'sl2',
    });
    const next = reducer(state, { type: 'deleteSetlist', id: 'sl1' });
    expect(next.activeSetlistId).toBe('sl2');
  });

  it('resets activeSongId to the reassigned setlist\'s first song when the active setlist is deleted', () => {
    const state = baseState({
      setlists: {
        sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1'] },
        sl2: { id: 'sl2', name: 'Sunday PM', songIds: ['s2'] },
      },
      setlistOrder: ['sl1', 'sl2'],
      activeSetlistId: 'sl1',
      activeSongId: 's1',
    });
    const next = reducer(state, { type: 'deleteSetlist', id: 'sl1' });
    expect(next.activeSongId).toBe('s2');
  });

  it('clears activeSongId when the deleted active setlist was the last one', () => {
    const state = baseState({
      setlists: { sl1: { id: 'sl1', name: 'Sunday AM', songIds: ['s1'] } },
      setlistOrder: ['sl1'],
      activeSetlistId: 'sl1',
      activeSongId: 's1',
    });
    const next = reducer(state, { type: 'deleteSetlist', id: 'sl1' });
    expect(next.activeSongId).toBeNull();
  });
});

describe('reducer — setActiveSetlist', () => {
  it('updates activeSetlistId', () => {
    const state = baseState({
      setlists: { sl2: { id: 'sl2', name: 'Sunday PM', songIds: ['s2'] } },
      setlistOrder: ['sl2'],
    });
    const next = reducer(state, { type: 'setActiveSetlist', id: 'sl2' });
    expect(next.activeSetlistId).toBe('sl2');
  });

  it('sets activeSongId to the new setlist\'s first song', () => {
    const state = baseState({
      setlists: { sl2: { id: 'sl2', name: 'Sunday PM', songIds: ['s2', 's3'] } },
      setlistOrder: ['sl2'],
    });
    const next = reducer(state, { type: 'setActiveSetlist', id: 'sl2' });
    expect(next.activeSongId).toBe('s2');
  });

  it('accepts null to clear the active setlist and activeSongId', () => {
    const next = reducer(baseState({ activeSetlistId: 'sl1', activeSongId: 's1' }), {
      type: 'setActiveSetlist',
      id: null,
    });
    expect(next.activeSetlistId).toBeNull();
    expect(next.activeSongId).toBeNull();
  });
});

describe('reducer — setActiveSongId', () => {
  it('updates activeSongId without touching activeSetlistId', () => {
    const state = baseState({ activeSetlistId: 'sl1', activeSongId: 's1' });
    const next = reducer(state, { type: 'setActiveSongId', id: 's2' });
    expect(next.activeSongId).toBe('s2');
    expect(next.activeSetlistId).toBe('sl1');
  });
});
