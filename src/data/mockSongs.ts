import { AMAZING_GRACE_CHART } from '../music/chart';
import { keyIndex } from '../music/notes';
import { Song } from './types';

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
  }),
  seed('this-is-amazing-grace', 'This Is Amazing Grace', 'Phil Wickham', 'G', { tempo: 128 }),
  seed('way-maker', 'Way Maker', 'Sinach', 'E', { tempo: 140 }),
  seed('great-are-you-lord', 'Great Are You Lord', 'All Sons & Daughters', 'A', { tempo: 72 }),
  seed('o-come-to-the-altar', 'O Come to the Altar', 'Elevation Worship', 'B', { tempo: 68 }),
  seed('reckless-love', 'Reckless Love', 'Cory Asbury', 'C'),
  seed('blessed-assurance', 'Blessed Assurance', 'Traditional', 'D'),
  seed('sunrise', 'Sunrise', 'Band Original', 'F#'),
  seed('it-is-well', 'It Is Well', 'Traditional', 'C'),
  seed('goodness-of-god', 'Goodness of God', 'Bethel Music', 'A'),
];

// Matches the `setlist` array in Component.renderVals() — the songs queued
// for tonight's set, in order.
export const SETLIST_SEED: string[] = [
  'great-are-you-lord',
  'this-is-amazing-grace',
  'o-come-to-the-altar',
  'way-maker',
];
