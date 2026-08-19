# Chord Detector Broadening — Design

## Context

Zamar's "Type it in" chart input (`src/screens/AddSongScreen.tsx`) and the Chord tab
(`src/screens/live-stage/ChordGrid.tsx`) both rely on `src/music/chart.ts` to recognize
which lines in a typed chart are chord lines and to transpose them. Chord tokens are
matched with a single regex, `CHORD_TOKEN_RE` (`src/music/chart.ts:7-8`), against a fixed
list of qualities: `maj7 maj9 maj min7 min9 min dim7 dim aug sus2 sus4 add9 m7b5 m7 m9 m6
m 6/9 6 7 9 11 13`.

This is a separate, independent system from MusicXML import/rendering — chords and lyrics
are typed in by the user as plain text (chord line above lyric line); MusicXML is a
different, sheet-music-only input path with no connection to this parser. This spec covers
only the chord/lyric text parser.

The two-line format (chords on their own line above lyrics, positioned by spacing) stays
exactly as-is. This spec only broadens which chord tokens `CHORD_TOKEN_RE` recognizes and
correctly transposes.

## Goals

Recognize and correctly transpose a much larger, real-world vocabulary of chord symbols
without changing the input format, without adding a runtime dependency, and without
regressing any chord the parser already handles.

## Approach

Keep `chart.ts` a pure regex-based parser, consistent with the file's existing minimal
style (no new dependencies — the only non-Expo runtime dependencies in the app today are
navigation/storage libraries).

Restructure `CHORD_TOKEN_RE` from one flat quality alternation into three composed pieces
matched as separate groups:

```
root       := [A-G](#|b)?
quality    := <base-quality> (<altered-tension>)?
bass       := / [A-G](#|b)?
token      := root quality? bass?
```

A flat alternation list becomes fragile as more qualities are added: regex alternation
matches left-to-right, so a shorter alternative (e.g. `7`) must not be allowed to shadow a
longer one (e.g. `7sus4`) — ordering bugs are easy to introduce silently. Composing
`quality` as `base-quality` + optional single `altered-tension` suffix avoids a
combinatorial explosion of spelled-out alternatives (`7#9`, `9#9`, `13#9`, `7b5`, `9b5`, …)
by matching the tension independently of the base quality.

An alternative considered: pull in a third-party chord-symbol parsing package. Rejected —
the grammar is well-bounded and already hand-rolled in this file; adding a dependency for
it would be the only non-Expo runtime dependency in the app.

### Case sensitivity

Word-based qualities (`maj`, `min`, `dim`, `sus`, `add`, `aug`) match case-insensitively
(`Maj7`, `MIN`, `Dim`, `SUS4`, `Add9`, `AUG` all recognized). The bare single-letter `m`
(minor) stays **lowercase-only** — it is never matched case-insensitively, so it can't be
confused with a major marker or misfire against unrelated uppercase text.

## Chord vocabulary additions

On top of what's already recognized, add:

- **New base qualities:** `5` (power chord), bare `sus` (defaults to sus4), `add2`,
  `add4`, `mMaj7` / `mM7` (minor-major seventh).
- **Sus dominants:** `7sus4`, `7sus2`, `9sus4`.
- **Altered tensions:** one optional trailing alteration on `7`/`9`/`11`/`13`/`aug`/`dim`
  chords: `#5`, `b5`, `#9`, `b9`, `#11`, `#13` (e.g. `7#9`, `9#11`, `13#11`, `7b5`).
- **No-chord marker:** `N.C.`, `NC`, `N/C` — recognized as a valid chord-line token (a
  line consisting only of `N.C.` still counts as a chord line per `isChordLine`), but
  `transposeToken` leaves it unchanged since it names no root to shift.

All of the above compose with the existing optional `/<bass-note>` slash-bass suffix.

## Data flow / API surface

No changes to the public functions of `chart.ts` (`isChordLine`, `transposeLine`,
`parseChart`) or their signatures — only `CHORD_TOKEN_RE` and `transposeToken`'s internal
handling change, plus the no-chord marker's carve-out in `transposeToken`. `notes.ts` is
unaffected. `ChordGrid.tsx` and `AddSongScreen.tsx` need no changes since they consume
`chart.ts`'s existing exports.

## Testing

The repo currently has no test runner configured. As part of planning, confirm/add a
minimal test setup (e.g. `jest` with `ts-jest` or `jest-expo`'s preset, whichever fits the
Expo 57 toolchain) and follow TDD: write failing tests first, then implement.

Coverage to include:
- Every new quality and altered-tension combination, transposed up/down across the octave
  boundary (e.g. `B` → `C`).
- Case-insensitivity for word qualities, and confirmation that bare lowercase `m` is not
  affected by the case-insensitive path.
- `N.C.` / `NC` / `N/C` recognized as chord-line tokens and left untransposed.
- Slash-bass chords combined with new qualities (e.g. `Dsus4/F#`, `G7#9/B`).
- Regression coverage for every quality already supported today, so none silently break
  during the regex restructuring.

## Out of scope

- Inline `[G]chord-in-lyric` markers — the two-line format is unchanged (see prior
  brainstorming decision).
- Auto-detecting a song's key from its chord progression.
- Anything related to MusicXML — fully separate feature, covered by its own spec.
