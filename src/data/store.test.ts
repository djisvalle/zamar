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
