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
