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
