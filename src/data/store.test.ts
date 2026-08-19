import { reducer } from './store';
import { Song, SongSource } from './types';

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

  // sheetMode decides which viewer SheetView mounts, so each source needs to
  // land on the right one.
  describe('sheetMode derivation', () => {
    function addWithSource(source: SongSource) {
      const state = {
        songs: {},
        setlist: [],
        settings: { appearance: 'light' as const, enharmonic: 'sharp' as const, libraryGroupByKey: false },
      };
      const next = reducer(state, {
        type: 'addSong',
        id: 'new-song',
        addToSetlist: false,
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
    const state = { songs: { s1: song }, setlist: [], settings: { appearance: 'light' as const, enharmonic: 'sharp' as const, libraryGroupByKey: false } };
    const next = reducer(state, {
      type: 'updateSong',
      id: 's1',
      patch: { pdfAnnotations: { ...song.pdfAnnotations, 2: [{ color: '#d33', width: 3, points: [{ x: 5, y: 5 }] }] } },
    });
    expect(Object.keys(next.songs.s1.pdfAnnotations)).toEqual(['1', '2']);
  });
});
