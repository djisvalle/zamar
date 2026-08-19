// Parses the plain "chord line over lyric line" text format used by the Add
// Song "Type it in" textarea (see the spec's placeholder text) and lets the
// Chord tab transpose it live. This is real logic, not a placeholder — the
// spec calls out one-tap transpose as a fully-specified interaction.
import { Enharmonic, keyIndex, noteName } from './notes';

const ROOT_RE = '[A-G]';
const ACCIDENTAL_RE = '(?:#|b)';

// One optional altered tension, valid only on the qualities that list it
// below (7, 9, 11, 13, aug, dim) — not on every quality.
const TENSION_RE = '(?:#5|b5|#9|b9|#11|#13)?';

// Longest-match-first: a shorter alternative (e.g. "7") must never precede a
// longer one that shares its prefix (e.g. "7sus4"), or the shorter one wins
// and leaves the rest of the token unconsumed, failing the overall match.
const QUALITY_ALTERNATIVES = [
  '[Mm][Aa][Jj]7',
  '[Mm][Aa][Jj]9',
  '[Mm][Aa][Jj]',
  '[Mm][Ii][Nn]7',
  '[Mm][Ii][Nn]9',
  '[Mm][Ii][Nn]',
  '[Dd][Ii][Mm]7',
  `[Dd][Ii][Mm]${TENSION_RE}`,
  `[Aa][Uu][Gg]${TENSION_RE}`,
  'm[Mm][Aa][Jj]7', // minor-major 7th, e.g. "mMaj7"
  'mM7', // minor-major 7th shorthand
  'm7b5',
  'm9',
  'm7',
  'm6',
  'm', // minor — lowercase-only, never matched case-insensitively
  '7[Ss][Uu][Ss]4',
  '7[Ss][Uu][Ss]2',
  '9[Ss][Uu][Ss]4',
  '[Ss][Uu][Ss]2',
  '[Ss][Uu][Ss]4',
  '[Ss][Uu][Ss]', // bare "sus" — sus4 by convention, spelled as typed
  '[Aa][Dd][Dd]9',
  '[Aa][Dd][Dd]2',
  '[Aa][Dd][Dd]4',
  '6/9',
  '6',
  '5', // power chord
  `7${TENSION_RE}`,
  `9${TENSION_RE}`,
  `11${TENSION_RE}`,
  `13${TENSION_RE}`,
].join('|');

const QUALITY_RE = `(?:${QUALITY_ALTERNATIVES})`;

const CHORD_TOKEN_RE = new RegExp(
  `^(${ROOT_RE})(${ACCIDENTAL_RE})?(${QUALITY_RE})?(/${ROOT_RE}(?:${ACCIDENTAL_RE})?)?$`,
);

// "No chord" markers — valid chord-line tokens that name no root, so they're
// recognized but never transposed.
const NO_CHORD_RE = /^(N\.C\.|NC|N\/C)$/i;

function isChordToken(tok: string): boolean {
  return NO_CHORD_RE.test(tok) || CHORD_TOKEN_RE.test(tok);
}

export function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every(isChordToken);
}

function transposeToken(tok: string, semitones: number, pref: Enharmonic): string {
  if (NO_CHORD_RE.test(tok)) return tok;
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
