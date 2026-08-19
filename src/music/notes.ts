// Ported verbatim from the spec's Component class (StageChart Design
// Spec.dc.html) so transposition math matches the design exactly.
export const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type Enharmonic = 'sharp' | 'flat';

export function noteName(idx: number, pref: Enharmonic): string {
  const i = ((idx % 12) + 12) % 12;
  return pref === 'flat' ? NOTES_FLAT[i] : NOTES_SHARP[i];
}

// Accepts either spelling ("Db" or "C#") and returns its pitch class 0-11.
export function keyIndex(name: string): number {
  const sharpIdx = NOTES_SHARP.indexOf(name as (typeof NOTES_SHARP)[number]);
  if (sharpIdx !== -1) return sharpIdx;
  const flatIdx = NOTES_FLAT.indexOf(name as (typeof NOTES_FLAT)[number]);
  if (flatIdx !== -1) return flatIdx;
  return 0;
}
