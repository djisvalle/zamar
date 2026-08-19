/**
 * @jest-environment jsdom
 */
import { transposePitch, clefForName, transformMusicXml } from './musicxmlTransform';

describe('transposePitch', () => {
  it('shifts within an octave, sharp spelling', () => {
    expect(transposePitch('C', 0, 4, 1, 'sharp')).toEqual({ step: 'C', alter: 1, octave: 4 });
  });

  it('shifts within an octave, flat spelling', () => {
    expect(transposePitch('C', 0, 4, 1, 'flat')).toEqual({ step: 'D', alter: -1, octave: 4 });
  });

  it('rolls over into the next octave', () => {
    expect(transposePitch('B', 0, 4, 1, 'sharp')).toEqual({ step: 'C', alter: 0, octave: 5 });
  });

  it('rolls down into the previous octave', () => {
    expect(transposePitch('C', 0, 4, -1, 'sharp')).toEqual({ step: 'B', alter: 0, octave: 3 });
  });

  it('respells an already-altered pitch (F# up a whole step, sharp spelling)', () => {
    expect(transposePitch('F', 1, 4, 2, 'sharp')).toEqual({ step: 'G', alter: 1, octave: 4 });
  });

  it('handles zero transposition as a no-op respelling', () => {
    expect(transposePitch('E', 0, 5, 0, 'sharp')).toEqual({ step: 'E', alter: 0, octave: 5 });
  });
});

describe('clefForName', () => {
  it('maps treble to G/2, alto to C/3, bass to F/4', () => {
    expect(clefForName('treble')).toEqual({ sign: 'G', line: 2 });
    expect(clefForName('alto')).toEqual({ sign: 'C', line: 3 });
    expect(clefForName('bass')).toEqual({ sign: 'F', line: 4 });
  });
});

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
    <score-part id="P2"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
      <note>
        <pitch><step>F</step><alter>1</alter><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <note><rest/><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('transformMusicXml', () => {
  function parse(xml: string) {
    return new DOMParser().parseFromString(xml, 'application/xml');
  }

  it('keeps only the first part, in both <part> and <part-list>', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' }));
    expect(out.getElementsByTagName('part')).toHaveLength(1);
    expect(out.getElementsByTagName('part')[0].getAttribute('id')).toBe('P1');
    expect(out.getElementsByTagName('score-part')).toHaveLength(1);
    expect(out.getElementsByTagName('score-part')[0].getAttribute('id')).toBe('P1');
  });

  it('rewrites the clef', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'alto' }));
    const clef = out.getElementsByTagName('clef')[0];
    expect(clef.getElementsByTagName('sign')[0].textContent).toBe('C');
    expect(clef.getElementsByTagName('line')[0].textContent).toBe('3');
  });

  it('transposes every pitch in the kept part by the given semitones', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 2, enharmonic: 'sharp', clef: 'treble' }));
    const pitches = Array.from(out.getElementsByTagName('pitch'));
    expect(pitches).toHaveLength(2);

    const first = pitches[0];
    expect(first.getElementsByTagName('step')[0].textContent).toBe('D');
    expect(first.getElementsByTagName('octave')[0].textContent).toBe('4');
    expect(first.getElementsByTagName('alter')).toHaveLength(0);

    const second = pitches[1];
    // F#4 (pc 6) + 2 semitones = pc 8 = G#4 in sharp spelling
    expect(second.getElementsByTagName('step')[0].textContent).toBe('G');
    expect(second.getElementsByTagName('alter')[0].textContent).toBe('1');
    expect(second.getElementsByTagName('octave')[0].textContent).toBe('4');
  });

  it('throws on malformed XML', () => {
    expect(() => transformMusicXml('<not-valid', { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' })).toThrow();
  });

  it('throws on a score-timewise root', () => {
    const timewise = '<score-timewise version="3.1"></score-timewise>';
    expect(() => transformMusicXml(timewise, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' })).toThrow(
      'score-partwise',
    );
  });

  it('throws when there are no <part> elements', () => {
    const noParts = '<score-partwise version="3.1"><part-list></part-list></score-partwise>';
    expect(() => transformMusicXml(noParts, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' })).toThrow(
      'part',
    );
  });
});
