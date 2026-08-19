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

  const { sign, line } = clefForName(opts.clef);
  const clefEls = Array.from(firstPart.getElementsByTagName('clef'));
  for (const clefEl of clefEls) {
    const signEl = clefEl.getElementsByTagName('sign')[0];
    const lineEl = clefEl.getElementsByTagName('line')[0];
    if (signEl) signEl.textContent = sign;
    if (lineEl) lineEl.textContent = String(line);
  }

  return new XMLSerializer().serializeToString(doc);
}
