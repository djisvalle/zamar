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
