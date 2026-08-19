// Parses the plain "chord line over lyric line" text format used by the Add
// Song "Type it in" textarea (see the spec's placeholder text) and lets the
// Chord tab transpose it live. This is real logic, not a placeholder — the
// spec calls out one-tap transpose as a fully-specified interaction.
import { Enharmonic, keyIndex, noteName } from './notes';

const CHORD_TOKEN_RE =
  /^([A-G])(#|b)?(maj7|maj9|maj|min7|min9|min|dim7|dim|aug|sus2|sus4|add9|m7b5|m7|m9|m6|m|6\/9|6|7|9|11|13)?(\/[A-G](#|b)?)?$/;

function isChordToken(tok: string): boolean {
  return CHORD_TOKEN_RE.test(tok);
}

export function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every(isChordToken);
}

function transposeToken(tok: string, semitones: number, pref: Enharmonic): string {
  const m = CHORD_TOKEN_RE.exec(tok);
  if (!m) return tok;
  const [, root, accidental, quality = '', bass] = m;
  const rootIdx = keyIndex(root + (accidental ?? ''));
  const newRoot = noteName(rootIdx + semitones, pref);
  let newBass = '';
  if (bass) {
    const bassNote = bass.slice(1);
    newBass = '/' + noteName(keyIndex(bassNote) + semitones, pref);
  }
  return newRoot + quality + newBass;
}

export function transposeLine(line: string, semitones: number, pref: Enharmonic): string {
  if (semitones === 0 && pref === 'sharp') return line;
  if (!isChordLine(line)) return line;
  return line.replace(/\S+/g, (tok) => transposeToken(tok, semitones, pref));
}

export interface ChartLine {
  raw: string;
  chord: boolean;
}

export function parseChart(raw: string): ChartLine[] {
  return raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => ({ raw: line, chord: isChordLine(line) }));
}

export const DEFAULT_CHART_PLACEHOLDER =
  'No chords yet — tap ✎ Edit to add lyrics & chords.';

// Seed chart for the demo song, matching the spec's Chord tab mockup
// (StageChart Design Spec.dc.html lines 86-93) exactly.
export const AMAZING_GRACE_CHART = `G          D
Amazing grace, how sweet the sound
Em    C    G
That saved a wretch like me
G          D
I once was lost, but now am found
Em    C    G
Was blind, but now I see`;
