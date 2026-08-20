import { groupLibrary } from './librarySort';
import { Song } from './types';

function song(overrides: Partial<Song> & { title: string }): Song {
  return {
    id: overrides.title.toLowerCase().replace(/\s+/g, '-'),
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
    const items = groupLibrary(songs, 'letter', 'sharp');
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
    const items = groupLibrary(songs, 'key', 'sharp');
    expect(items.filter((i) => i.type === 'divider').map((i) => i.label)).toEqual([
      'Key of D',
      'Key of E',
      'Key of G',
    ]);
  });

  it('groups by artist when sorted "artist"', () => {
    const items = groupLibrary(songs, 'artist', 'sharp');
    expect(items.filter((i) => i.type === 'divider').map((i) => i.label)).toEqual(['Sinach', 'Traditional']);
  });

  it('spells key divider labels flat when enharmonic preference is "flat"', () => {
    const flatSongs = [...songs, song({ title: 'Great Are You Lord', artist: 'All Sons & Daughters', keyIdx: 6 })];
    const items = groupLibrary(flatSongs, 'key', 'flat');
    const labels = items.filter((i) => i.type === 'divider').map((i) => i.label);
    expect(labels).toContain('Key of Gb');
    expect(labels).not.toContain('Key of F#');
  });
});
