// Self-contained on purpose: no imports, nothing from React/React Native.
// This file's compiled-to-JS output is inlined verbatim into the MusicXML
// WebView bundle by scripts/generate-webview-bundles.js, where it runs with
// no module system -- only the browser globals DOMParser/XMLSerializer and
// this file's own top-level declarations exist. It's also unit-tested
// directly (in a jsdom environment) from musicxmlTransform.test.ts, so the
// tested code and the shipped code are exactly the same source.

export type Clef = 'treble' | 'alto' | 'bass';
export type Enharmonic = 'sharp' | 'flat';

interface TransformOptions {
  transposeSemi: number;
  enharmonic: Enharmonic;
  clef: Clef;
}

const STEP_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SHARP_SPELLING: { step: string; alter: number }[] = [
  { step: 'C', alter: 0 }, { step: 'C', alter: 1 }, { step: 'D', alter: 0 }, { step: 'D', alter: 1 },
  { step: 'E', alter: 0 }, { step: 'F', alter: 0 }, { step: 'F', alter: 1 }, { step: 'G', alter: 0 },
  { step: 'G', alter: 1 }, { step: 'A', alter: 0 }, { step: 'A', alter: 1 }, { step: 'B', alter: 0 },
];

const FLAT_SPELLING: { step: string; alter: number }[] = [
  { step: 'C', alter: 0 }, { step: 'D', alter: -1 }, { step: 'D', alter: 0 }, { step: 'E', alter: -1 },
  { step: 'E', alter: 0 }, { step: 'F', alter: 0 }, { step: 'G', alter: -1 }, { step: 'G', alter: 0 },
  { step: 'A', alter: -1 }, { step: 'A', alter: 0 }, { step: 'B', alter: -1 }, { step: 'B', alter: 0 },
];

const CLEF_SIGN: Record<Clef, { sign: string; line: number }> = {
  treble: { sign: 'G', line: 2 },
  alto: { sign: 'C', line: 3 },
  bass: { sign: 'F', line: 4 },
};

export function transposePitch(
  step: string,
  alter: number,
  octave: number,
  semitones: number,
  enharmonic: Enharmonic,
): { step: string; alter: number; octave: number } {
  const base = STEP_SEMITONE[step];
  if (base === undefined) return { step, alter, octave };
  const absolute = octave * 12 + base + alter;
  const shifted = absolute + semitones;
  const newOctave = Math.floor(shifted / 12);
  const pitchClass = ((shifted % 12) + 12) % 12;
  const spelling = (enharmonic === 'flat' ? FLAT_SPELLING : SHARP_SPELLING)[pitchClass];
  return { step: spelling.step, alter: spelling.alter, octave: newOctave };
}

export function clefForName(clef: Clef): { sign: string; line: number } {
  return CLEF_SIGN[clef];
}

/**
 * Shifts a key signature along the circle of fifths to match a semitone
 * transposition. One semitone up = 7 fifths clockwise (C -> G -> D -> A -> E ->
 * F# -> C#), so the arithmetic is just `fifths + 7 * semitones` wrapped back
 * into a printable range.
 *
 * The result is normalized to [-6, 5] — one full lap of the circle — which
 * keeps every key spellable without running into the double-accidental region
 * beyond 7 sharps/flats. At the wrap point the same pitch level can be spelled
 * either way (-6 = G-flat major, +6 = F-sharp major), so `enharmonic` picks the
 * side: sharp spelling prefers +6 over -6.
 */
export function transposeKeyFifths(
  fifths: number,
  semitones: number,
  enharmonic: Enharmonic,
): number {
  const raw = fifths + 7 * semitones;
  let next = ((((raw + 6) % 12) + 12) % 12) - 6;
  if (enharmonic === 'sharp' && next === -6) next = 6;
  return next;
}

export function transformMusicXml(xml: string, opts: TransformOptions): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Could not parse MusicXML');
  }
  const root = doc.documentElement;
  if (!root || root.tagName !== 'score-partwise') {
    throw new Error('Only score-partwise MusicXML files are supported');
  }

  const parts = Array.from(doc.getElementsByTagName('part')).filter((el) => el.parentNode === root);
  if (parts.length === 0) {
    throw new Error('No <part> elements found');
  }
  const firstPart = parts[0];
  const firstPartId = firstPart.getAttribute('id');

  for (let i = parts.length - 1; i >= 1; i--) {
    parts[i].parentNode?.removeChild(parts[i]);
  }

  const partListEls = doc.getElementsByTagName('part-list');
  if (partListEls.length > 0) {
    const scoreParts = Array.from(partListEls[0].getElementsByTagName('score-part'));
    for (const scorePart of scoreParts) {
      if (scorePart.getAttribute('id') !== firstPartId) {
        scorePart.parentNode?.removeChild(scorePart);
      }
    }
  }

  const pitches = Array.from(firstPart.getElementsByTagName('pitch'));
  for (const pitchEl of pitches) {
    const stepEl = pitchEl.getElementsByTagName('step')[0];
    const alterEl = pitchEl.getElementsByTagName('alter')[0];
    const octaveEl = pitchEl.getElementsByTagName('octave')[0];
    if (!stepEl || !octaveEl) continue;

    const step = (stepEl.textContent || 'C').trim();
    const alter = alterEl ? parseInt(alterEl.textContent || '0', 10) : 0;
    const octave = parseInt(octaveEl.textContent || '4', 10);

    const next = transposePitch(step, alter, octave, opts.transposeSemi, opts.enharmonic);

    stepEl.textContent = next.step;
    octaveEl.textContent = String(next.octave);

    if (next.alter !== 0) {
      let target = alterEl;
      if (!target) {
        target = doc.createElement('alter');
        pitchEl.insertBefore(target, octaveEl);
      }
      target.textContent = String(next.alter);
    } else if (alterEl) {
      alterEl.parentNode?.removeChild(alterEl);
    }
  }

  // Key signatures have to move with the notes, otherwise a transposed score
  // prints its original key signature and every transposed accidental shows up
  // as an explicit one. Every <key> in the part is updated, so mid-score key
  // changes stay consistent with the pitches around them.
  if (opts.transposeSemi !== 0) {
    const keyEls = Array.from(firstPart.getElementsByTagName('key'));
    for (const keyEl of keyEls) {
      const fifthsEl = keyEl.getElementsByTagName('fifths')[0];
      if (!fifthsEl) continue;
      const oldFifths = parseInt(fifthsEl.textContent || '0', 10);
      if (Number.isNaN(oldFifths)) continue;
      fifthsEl.textContent = String(transposeKeyFifths(oldFifths, opts.transposeSemi, opts.enharmonic));
    }
  }

  // Only the part's *initial* staff-1 clef is rewritten. Overwriting every
  // <clef> would flatten a grand staff's bass clef onto staff 1's sign and
  // destroy legitimate mid-score clef changes.
  // A file is allowed to declare its clef in a later measure rather than the
  // first, so when the strict search finds nothing, widen to the whole part --
  // otherwise the Clef setting would be silently ignored for such a score.
  // Staff 1 is still preferred while widening so a grand staff never gets its
  // bass clef rewritten; only if the part has no staff-1 clef at all does the
  // part's very first <clef> win.
  const isStaffOne = (el: Element) => {
    const n = el.getAttribute('number');
    return n === null || n === '1';
  };
  const { sign, line } = clefForName(opts.clef);
  const firstMeasure = firstPart.getElementsByTagName('measure')[0];
  const clefCandidates = firstMeasure ? Array.from(firstMeasure.getElementsByTagName('clef')) : [];
  const partClefs = Array.from(firstPart.getElementsByTagName('clef'));
  const clefEl = clefCandidates.find(isStaffOne) || partClefs.find(isStaffOne) || partClefs[0];
  if (clefEl) {
    const signEl = clefEl.getElementsByTagName('sign')[0];
    const lineEl = clefEl.getElementsByTagName('line')[0];
    if (signEl) signEl.textContent = sign;
    if (lineEl) lineEl.textContent = String(line);
  }

  return new XMLSerializer().serializeToString(doc);
}
