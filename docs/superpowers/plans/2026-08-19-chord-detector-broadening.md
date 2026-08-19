# Chord Detector Broadening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Broaden the chord vocabulary recognized and correctly transposed by the typed-in chord/lyric chart parser (`src/music/chart.ts`), without changing the two-line chart format or its public API.

**Architecture:** `CHORD_TOKEN_RE` in `src/music/chart.ts` is rebuilt from a flat alternation list into a single ordered alternation of quality alternatives (longest-match-first, so a shorter alternative like `7` can never shadow a longer one like `7sus4`), composed via string concatenation into one `RegExp`. A separate `NO_CHORD_RE` handles `N.C.`/`NC`/`N/C` markers, which are valid chord-line tokens but are never transposed. `isChordLine`, `transposeLine`, and `parseChart` keep their existing signatures; only the token-level recognition (`isChordToken`) and transposition (`transposeToken`) internals change.

**Tech Stack:** TypeScript (no new runtime dependency). Jest (via `jest-expo`, the officially documented Expo SDK 57 unit-testing setup) is added as a dev-only dependency and test runner — this repo currently has no test infrastructure at all.

## Global Constraints

- No new runtime (non-dev) dependency — chord parsing stays a hand-rolled regex, consistent with the rest of `src/music/`.
- The two-line chord/lyric chart format is unchanged; inline `[G]chord-in-lyric` markers are out of scope (per the design spec's decomposition of the brainstorm).
- Bare lowercase `m` (minor) must never be matched case-insensitively — it must never match an uppercase `M`.
- Word-based qualities (`maj`, `min`, `dim`, `sus`, `add`, `aug`) match case-insensitively.
- Chord root letters stay uppercase-only (`[A-G]`), unchanged from today.
- Altered tensions (`#5`, `b5`, `#9`, `b9`, `#11`, `#13`) are only valid on `7`, `9`, `11`, `13`, `aug`, and `dim` base qualities — not on every quality.
- `transposeToken` never rewrites quality text — it relocates the root/bass and leaves the matched quality substring (including its original casing) untouched. `sus` is not rewritten to `sus4`; it's simply recognized as a valid quality on its own.
- MusicXML is fully out of scope for this plan — it's a separate, unrelated input path with its own future spec.
- Public exports of `src/music/chart.ts` (`isChordLine`, `transposeLine`, `parseChart`, `ChartLine`, `DEFAULT_CHART_PLACEHOLDER`, `AMAZING_GRACE_CHART`) keep their existing names and signatures.

---

### Task 1: Add Jest test infrastructure

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working `npx jest <path>` command that later tasks (and future work) can run against any `*.test.ts` file in the repo.

This repo has zero test infrastructure today — no `jest`, no config, nothing in `package.json`'s `devDependencies` for testing. Expo SDK 57's officially documented unit-testing setup is the `jest-expo` preset (confirmed against `docs.expo.dev/versions/v57.0.0`), which handles the Babel/TypeScript transform without needing a separate `babel.config.js`.

- [ ] **Step 1: Install Jest packages as dev dependencies**

Run:
```
npx expo install jest-expo jest @types/jest --dev
```
Expected: `package.json`'s `devDependencies` gains `jest-expo`, `jest`, and `@types/jest` entries, and `node_modules` is updated. (`npx expo install` picks SDK-57-compatible versions automatically, which is why it's used instead of `npm install`.)

- [ ] **Step 2: Add the test script and Jest preset to package.json**

Edit `package.json` — add a `"test"` script next to the existing `"web"` script, and a top-level `"jest"` field:

```json
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest --watchAll"
  },
  "jest": {
    "preset": "jest-expo"
  },
```

(Keep this exactly as Expo's own docs specify it — the `"jest"` field goes at the top level of `package.json`, as a sibling of `"scripts"`, `"dependencies"`, etc.)

- [ ] **Step 3: Add "jest" to tsconfig's types array**

Edit `tsconfig.json` so `@types/jest`'s globals (`describe`, `it`, `expect`, …) type-check:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "types": ["jest"]
  }
}
```

- [ ] **Step 4: Verify the toolchain is wired up**

Run:
```
npx tsc --noEmit
```
Expected: no errors (confirms `@types/jest` resolves and the rest of the project still type-checks).

Run:
```
npx jest --version
```
Expected: prints a Jest version number (confirms the `jest` binary and `jest-expo` preset installed cleanly). It's fine that there are no test files yet — this step only confirms the binary runs; Task 2 adds the first real test file.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json package-lock.json
git commit -m "chore: add jest-expo test infrastructure"
```

(If the repo uses a different lockfile than `package-lock.json`, e.g. `yarn.lock` or `pnpm-lock.yaml`, stage that one instead — check `git status` to see which lockfile `npx expo install` updated.)

---

### Task 2: Broaden the chord token grammar in chart.ts

**Files:**
- Modify: `src/music/chart.ts:1-38` (replaces the top of the file through the end of `transposeToken`, i.e. the `CHORD_TOKEN_RE` constant, `isChordToken`, `isChordLine`, and `transposeToken`. Only `CHORD_TOKEN_RE`/`isChordToken`/`transposeToken` actually change content — `isChordLine`'s body is pasted back verbatim, unchanged, since it sits between the two in the file. `transposeLine`, `ChartLine`, `parseChart`, and the two exported string constants further down the file are untouched.)
- Test: `src/music/chart.test.ts`

**Interfaces:**
- Consumes: `Enharmonic`, `keyIndex`, `noteName` from `src/music/notes.ts` (unchanged — no edits to `notes.ts` in this plan).
- Produces: `isChordLine(line: string): boolean` and `transposeLine(line: string, semitones: number, pref: Enharmonic): string` — same signatures as before, now recognizing the broader vocabulary described in Global Constraints above.

- [ ] **Step 1: Write the test file**

Create `src/music/chart.test.ts`:

```ts
import { isChordLine, transposeLine } from './chart';

describe('isChordLine — existing chord vocabulary (regression)', () => {
  const existingChords = [
    'G', 'C#', 'Bb', 'Gmaj7', 'Cmaj9', 'Dmin7', 'Emin9', 'Amin', 'Bdim7', 'Fdim',
    'Gaug', 'Csus2', 'Dsus4', 'Eadd9', 'Bm7b5', 'Am7', 'Cm9', 'Dm6', 'Em',
    'G6/9', 'C6', 'D7', 'E9', 'F11', 'G13', 'D/F#', 'G/B',
  ];

  it.each(existingChords)('recognizes %s as a chord line', (chord) => {
    expect(isChordLine(chord)).toBe(true);
  });

  it('recognizes a full existing chord line', () => {
    expect(isChordLine('G          D')).toBe(true);
    expect(isChordLine('Em    C    G')).toBe(true);
  });

  it('still rejects lyric lines', () => {
    expect(isChordLine('Amazing grace, how sweet the sound')).toBe(false);
  });
});

describe('isChordLine — new chord vocabulary', () => {
  const newChords = [
    // case-insensitive word qualities
    'GMaj7', 'CMIN', 'DDim', 'ESus4', 'FAdd9', 'GAug',
    // new base qualities
    'G5', 'Csus', 'Dadd2', 'Eadd4', 'FmMaj7', 'GmM7',
    // sus dominants
    'C7sus4', 'D7sus2', 'E9sus4',
    // altered tensions on 7/9/11/13/aug/dim
    'G7#9', 'C7b9', 'D9#11', 'E13#11', 'F7#5', 'G7b5', 'Aaug#5', 'Bdimb9',
    // no-chord marker, including lowercase
    'N.C.', 'NC', 'N/C', 'n.c.',
  ];

  it.each(newChords)('recognizes %s as a chord line', (chord) => {
    expect(isChordLine(chord)).toBe(true);
  });

  it('keeps bare lowercase m as minor, not case-insensitive with M', () => {
    // "M" alone is not a recognized quality — only lowercase "m" is minor,
    // and the case-insensitive word forms are "Maj"/"Min"/etc, not bare "M".
    expect(isChordLine('GM')).toBe(false);
  });
});

describe('transposeLine — regression', () => {
  it('transposes existing qualities up a whole step, sharp spelling', () => {
    expect(transposeLine('G', 2, 'sharp')).toBe('A');
    expect(transposeLine('Cmaj7', 2, 'sharp')).toBe('Dmaj7');
    expect(transposeLine('Am7', 2, 'sharp')).toBe('Bm7');
    expect(transposeLine('D/F#', 2, 'sharp')).toBe('E/G#');
  });

  it('transposes down across the octave boundary', () => {
    expect(transposeLine('C', -1, 'sharp')).toBe('B');
    expect(transposeLine('C', -1, 'flat')).toBe('B');
  });

  it('transposes up across the octave boundary with flat spelling', () => {
    expect(transposeLine('B', 1, 'flat')).toBe('C');
  });
});

describe('transposeLine — new vocabulary', () => {
  it('preserves new quality text verbatim while moving the root', () => {
    expect(transposeLine('G7#9', 2, 'sharp')).toBe('A7#9');
    expect(transposeLine('Csus', 2, 'sharp')).toBe('Dsus');
    expect(transposeLine('FmMaj7', 1, 'sharp')).toBe('F#mMaj7');
    expect(transposeLine('D7sus4', -2, 'sharp')).toBe('C7sus4');
    expect(transposeLine('GMaj7', 2, 'sharp')).toBe('AMaj7');
  });

  it('transposes the bass note independently of the root for new qualities', () => {
    expect(transposeLine('G7#9/B', 2, 'sharp')).toBe('A7#9/C#');
  });

  it('switches enharmonic spelling on new qualities', () => {
    expect(transposeLine('C#7sus4', 0, 'flat')).toBe('Db7sus4');
  });

  it('leaves no-chord markers untransposed', () => {
    expect(transposeLine('N.C.', 5, 'sharp')).toBe('N.C.');
    expect(transposeLine('NC', -3, 'flat')).toBe('NC');
  });
});
```

- [ ] **Step 2: Run the tests and confirm the expected failures**

Run:
```
npx jest src/music/chart.test.ts
```
Expected: the `existing chord vocabulary (regression)` and `transposeLine — regression` tests PASS (today's `CHORD_TOKEN_RE` already handles those). The `new chord vocabulary` and `transposeLine — new vocabulary` tests FAIL, since today's regex doesn't yet recognize the new qualities, tensions, or `N.C.` markers.

- [ ] **Step 3: Implement the broadened grammar**

Replace `src/music/chart.ts` lines 7-38 (from the `CHORD_TOKEN_RE` constant through the end of `transposeToken`, which includes `isChordLine` unchanged in the middle) with:

```ts
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
```

Everything below this in the file (`transposeLine`, the `ChartLine` interface, `parseChart`, `DEFAULT_CHART_PLACEHOLDER`, `AMAZING_GRACE_CHART`) stays exactly as it is today — do not modify it.

- [ ] **Step 4: Run the tests and confirm they all pass**

Run:
```
npx jest src/music/chart.test.ts
```
Expected: all tests PASS, including both the regression describes and the new-vocabulary describes.

- [ ] **Step 5: Run the full test suite and type-check as a final sanity check**

Run:
```
npx jest
```
Expected: all test suites PASS (just this one file, at this point in the project).

Run:
```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/music/chart.ts src/music/chart.test.ts
git commit -m "feat: broaden chord token recognition and transposition"
```
