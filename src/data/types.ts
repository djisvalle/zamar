export type SongSource = 'pdf' | 'musicxml' | 'type';
export type Clef = 'treble' | 'alto' | 'bass';
export type SheetMode = 'pdf' | 'musicxml';

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
