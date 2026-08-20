/**
 * @jest-environment jsdom
 */
import { transposePitch, clefForName, transposeKeyFifths, noteNameLabel, transformMusicXml } from './musicxmlTransform';
import { MUSIC_XML_VIEWER_HTML } from '../screens/live-stage/generated/musicXmlViewerHtml';

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

describe('noteNameLabel', () => {
  it('returns the bare step for a natural', () => {
    expect(noteNameLabel('C', 0)).toBe('C');
  });

  it('appends # for alter 1', () => {
    expect(noteNameLabel('F', 1)).toBe('F#');
  });

  it('appends b for alter -1', () => {
    expect(noteNameLabel('B', -1)).toBe('Bb');
  });
});

describe('clefForName', () => {
  it('maps treble to G/2, alto to C/3, bass to F/4', () => {
    expect(clefForName('treble')).toEqual({ sign: 'G', line: 2 });
    expect(clefForName('alto')).toEqual({ sign: 'C', line: 3 });
    expect(clefForName('bass')).toEqual({ sign: 'F', line: 4 });
  });
});

describe('transposeKeyFifths', () => {
  it('moves G major (1 sharp) up a whole step to A major (3 sharps)', () => {
    expect(transposeKeyFifths(1, 2, 'sharp')).toBe(3);
  });

  it('leaves the key alone for a zero transposition', () => {
    expect(transposeKeyFifths(-2, 0, 'sharp')).toBe(-2);
  });

  it('wraps back into the printable range instead of running off to 8 sharps', () => {
    // E major (4 sharps) up a semitone would be 11 fifths (F major with 11
    // sharps); the printable spelling of that pitch level is F major = -1.
    expect(transposeKeyFifths(4, 1, 'sharp')).toBe(-1);
  });

  it('wraps downward too', () => {
    // A-flat major (-4) down a whole step is G-flat major (-6).
    expect(transposeKeyFifths(-4, -2, 'flat')).toBe(-6);
  });

  it('biases the enharmonic edge toward sharps when sharp spelling is selected', () => {
    expect(transposeKeyFifths(-4, -2, 'sharp')).toBe(6);
    expect(transposeKeyFifths(-4, -2, 'flat')).toBe(-6);
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
        <key><fifths>1</fifths><mode>major</mode></key>
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

  it('keeps every part, in both <part> and <part-list> -- filtering is a WebView-side concern now', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' }));
    expect(out.getElementsByTagName('part')).toHaveLength(2);
    expect(Array.from(out.getElementsByTagName('part')).map((p) => p.getAttribute('id'))).toEqual(['P1', 'P2']);
    expect(out.getElementsByTagName('score-part')).toHaveLength(2);
    expect(Array.from(out.getElementsByTagName('score-part')).map((p) => p.getAttribute('id'))).toEqual([
      'P1',
      'P2',
    ]);
  });

  it('rewrites the clef of only the first part', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'alto' }));
    const clef = out.getElementsByTagName('clef')[0];
    expect(clef.getElementsByTagName('sign')[0].textContent).toBe('C');
    expect(clef.getElementsByTagName('line')[0].textContent).toBe('3');
  });

  it('transposes pitches in every part by the given semitones', () => {
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

  it('adds no <notehead-text> elements when showNoteNames is unset', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' }));
    expect(out.getElementsByTagName('notehead-text')).toHaveLength(0);
  });

  it('injects a notehead-text/display-text pair per pitched note when showNoteNames is set', () => {
    const out = parse(
      transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble', showNoteNames: true }),
    );
    const notes = Array.from(out.getElementsByTagName('note')).filter(
      (n) => n.getElementsByTagName('pitch').length > 0,
    );
    expect(notes).toHaveLength(2);
    for (const note of notes) {
      expect(note.getElementsByTagName('notehead-text')).toHaveLength(1);
    }
    expect(
      notes[0].getElementsByTagName('notehead-text')[0].getElementsByTagName('display-text')[0].textContent,
    ).toBe('C4');
    // F#4 -> sharp spelling keeps it F#
    expect(
      notes[1].getElementsByTagName('notehead-text')[0].getElementsByTagName('display-text')[0].textContent,
    ).toBe('F#4');
  });

  it('spells injected note names using the requested enharmonic and transposition', () => {
    const out = parse(
      transformMusicXml(SAMPLE_XML, { transposeSemi: 2, enharmonic: 'flat', clef: 'treble', showNoteNames: true }),
    );
    const notes = Array.from(out.getElementsByTagName('note')).filter(
      (n) => n.getElementsByTagName('pitch').length > 0,
    );
    // C4 + 2 semitones = D4 (flat spelling has no accidental here)
    expect(
      notes[0].getElementsByTagName('notehead-text')[0].getElementsByTagName('display-text')[0].textContent,
    ).toBe('D4');
    // F#4 (pc 6) + 2 semitones = pc 8 = Ab4 in flat spelling
    expect(
      notes[1].getElementsByTagName('notehead-text')[0].getElementsByTagName('display-text')[0].textContent,
    ).toBe('Ab4');
  });

  it('does not add a <notehead-text> to a rest', () => {
    const out = parse(
      transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble', showNoteNames: true }),
    );
    const restNote = Array.from(out.getElementsByTagName('note')).find((n) => n.getElementsByTagName('rest').length > 0)!;
    expect(restNote.getElementsByTagName('notehead-text')).toHaveLength(0);
  });

  const CHORD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <lyric number="1"><text>la</text></lyric>
      </note>
      <note>
        <chord/>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
      <note>
        <chord/>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>4</duration>
      </note>
    </measure>
  </part>
</score-partwise>`;

  it('gives every note in a chord stack its own notehead-text label, not just the base note', () => {
    const out = parse(
      transformMusicXml(CHORD_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble', showNoteNames: true }),
    );
    const notes = Array.from(out.getElementsByTagName('note'));
    expect(notes).toHaveLength(3);
    const labels = notes.map(
      (n) => n.getElementsByTagName('notehead-text')[0]?.getElementsByTagName('display-text')[0]?.textContent,
    );
    expect(labels).toEqual(['C4', 'E4', 'G4']);
  });

  it('inserts notehead-text before an existing <lyric> so the note stays schema-valid', () => {
    const out = parse(
      transformMusicXml(CHORD_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble', showNoteNames: true }),
    );
    const baseNote = out.getElementsByTagName('note')[0];
    const children = Array.from(baseNote.children).map((c) => c.tagName);
    expect(children.indexOf('notehead-text')).toBeLessThan(children.indexOf('lyric'));
  });

  it('transposes a second part independently of the first', () => {
    const twoMelodicParts = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Flute</part-name></score-part>
    <score-part id="P2"><part-name>Cello</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;
    const out = parse(transformMusicXml(twoMelodicParts, { transposeSemi: 2, enharmonic: 'sharp', clef: 'treble' }));
    const pitches = Array.from(out.getElementsByTagName('pitch'));
    expect(pitches).toHaveLength(2);
    expect(pitches[0].getElementsByTagName('step')[0].textContent).toBe('D');
    expect(pitches[0].getElementsByTagName('octave')[0].textContent).toBe('5');
    expect(pitches[1].getElementsByTagName('step')[0].textContent).toBe('D');
    expect(pitches[1].getElementsByTagName('octave')[0].textContent).toBe('3');
  });

  it('leaves a second part\'s own clef untouched', () => {
    const twoClefs = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Flute</part-name></score-part>
    <score-part id="P2"><part-name>Cello</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><rest/><duration>4</duration></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><clef><sign>F</sign><line>4</line></clef></attributes>
      <note><rest/><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;
    const out = parse(transformMusicXml(twoClefs, { transposeSemi: 0, enharmonic: 'sharp', clef: 'bass' }));
    const clefs = Array.from(out.getElementsByTagName('clef'));
    expect(clefs[0].getElementsByTagName('sign')[0].textContent).toBe('F'); // rewritten to bass
    expect(clefs[0].getElementsByTagName('line')[0].textContent).toBe('4');
    expect(clefs[1].getElementsByTagName('sign')[0].textContent).toBe('F'); // untouched, was already bass
    expect(clefs[1].getElementsByTagName('line')[0].textContent).toBe('4');
  });

  it('transposes the key signature along with the pitches', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 2, enharmonic: 'sharp', clef: 'treble' }));
    const key = out.getElementsByTagName('key')[0];
    // G major (1 sharp) up a whole step is A major (3 sharps).
    expect(key.getElementsByTagName('fifths')[0].textContent).toBe('3');
    expect(key.getElementsByTagName('mode')[0].textContent).toBe('major');
  });

  it('leaves the key signature untouched for a zero transposition', () => {
    const out = parse(transformMusicXml(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble' }));
    expect(out.getElementsByTagName('fifths')[0].textContent).toBe('1');
  });

  const GRAND_STAFF_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
    </measure>
    <measure number="2">
      <attributes>
        <clef number="1"><sign>F</sign><line>4</line></clef>
      </attributes>
    </measure>
  </part>
</score-partwise>`;

  it('rewrites only staff 1 of a grand staff, leaving staff 2 alone', () => {
    const out = parse(transformMusicXml(GRAND_STAFF_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'alto' }));
    const clefs = Array.from(out.getElementsByTagName('clef'));

    const staff1 = clefs[0];
    expect(staff1.getAttribute('number')).toBe('1');
    expect(staff1.getElementsByTagName('sign')[0].textContent).toBe('C');
    expect(staff1.getElementsByTagName('line')[0].textContent).toBe('3');

    const staff2 = clefs[1];
    expect(staff2.getAttribute('number')).toBe('2');
    expect(staff2.getElementsByTagName('sign')[0].textContent).toBe('F');
    expect(staff2.getElementsByTagName('line')[0].textContent).toBe('4');
  });

  it('leaves a mid-score clef change in a later measure untouched', () => {
    const out = parse(transformMusicXml(GRAND_STAFF_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'alto' }));
    const laterMeasure = Array.from(out.getElementsByTagName('measure')).find(
      (m) => m.getAttribute('number') === '2',
    )!;
    const laterClef = laterMeasure.getElementsByTagName('clef')[0];
    expect(laterClef.getElementsByTagName('sign')[0].textContent).toBe('F');
    expect(laterClef.getElementsByTagName('line')[0].textContent).toBe('4');
  });

  const LATE_CLEF_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><key><fifths>0</fifths></key></attributes>
      <note><rest/><duration>4</duration></note>
    </measure>
    <measure number="2">
      <attributes>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><rest/><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

  it('falls back to the part\'s first clef when measure 1 declares none', () => {
    const out = parse(transformMusicXml(LATE_CLEF_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'bass' }));
    const clefs = Array.from(out.getElementsByTagName('clef'));
    expect(clefs).toHaveLength(1);
    expect(clefs[0].getElementsByTagName('sign')[0].textContent).toBe('F');
    expect(clefs[0].getElementsByTagName('line')[0].textContent).toBe('4');
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

/**
 * These tests EXECUTE the checked-in generated WebView bundle rather than
 * inspecting it as text. A previous bug -- TypeScript emitting `exports.foo =
 * foo` under `module: None`, which throws `ReferenceError: exports is not
 * defined` inside a plain <script> tag -- survived several text-only reviews
 * precisely because nobody ever ran the emitted code. Running it also catches
 * the generated file going stale relative to musicxmlTransform.ts.
 */
describe('generated MusicXML WebView bundle', () => {
  // The generator emits exactly one script tag of the form
  // `<script>(function(){...}\nwindow.transformMusicXml = transformMusicXml;})();</script>`.
  function extractTransformScript(html: string): string {
    const tail = 'window.transformMusicXml = transformMusicXml;})();</script>';
    const tailIdx = html.indexOf(tail);
    if (tailIdx === -1) throw new Error('transform script block not found in the generated bundle');
    const head = '<script>(function(){';
    const headIdx = html.lastIndexOf(head, tailIdx);
    if (headIdx === -1) throw new Error('transform script opening tag not found in the generated bundle');
    return html.slice(headIdx + '<script>'.length, tailIdx + tail.length - '</script>'.length);
  }

  function evalBundleTransform() {
    const w = window as unknown as Record<string, unknown>;
    delete w.transformMusicXml;
    // Indirect eval so the script runs in the jsdom global scope, the same way
    // a real <script> tag would (DOMParser/XMLSerializer/window all resolve).
    // eslint-disable-next-line no-eval
    (0, eval)(extractTransformScript(MUSIC_XML_VIEWER_HTML));
    return w.transformMusicXml as (xml: string, opts: unknown) => string;
  }

  it('runs without throwing and assigns window.transformMusicXml', () => {
    const fn = evalBundleTransform();
    expect(typeof fn).toBe('function');
  });

  it('produces correctly transformed output when called from the bundle', () => {
    const fn = evalBundleTransform();
    const out = new DOMParser().parseFromString(
      fn(SAMPLE_XML, { transposeSemi: 2, enharmonic: 'sharp', clef: 'alto' }),
      'application/xml',
    );

    expect(out.getElementsByTagName('part')).toHaveLength(2);

    const pitches = Array.from(out.getElementsByTagName('pitch'));
    expect(pitches).toHaveLength(2);
    expect(pitches[0].getElementsByTagName('step')[0].textContent).toBe('D');
    expect(pitches[1].getElementsByTagName('step')[0].textContent).toBe('G');
    expect(pitches[1].getElementsByTagName('alter')[0].textContent).toBe('1');

    expect(out.getElementsByTagName('fifths')[0].textContent).toBe('3');

    const clef = out.getElementsByTagName('clef')[0];
    expect(clef.getElementsByTagName('sign')[0].textContent).toBe('C');
    expect(clef.getElementsByTagName('line')[0].textContent).toBe('3');
  });

  it('is not stale: the bundle carries the showNoteNames notehead-text injection from source', () => {
    const fn = evalBundleTransform();
    const out = new DOMParser().parseFromString(
      fn(SAMPLE_XML, { transposeSemi: 0, enharmonic: 'sharp', clef: 'treble', showNoteNames: true }),
      'application/xml',
    );
    const noteheadTexts = Array.from(out.getElementsByTagName('notehead-text'));
    expect(noteheadTexts).toHaveLength(2);
    expect(noteheadTexts[0].getElementsByTagName('display-text')[0].textContent).toBe('C4');
    expect(noteheadTexts[1].getElementsByTagName('display-text')[0].textContent).toBe('F#4');
  });

  it('is not stale: the bundle carries the late-clef fallback from source', () => {
    const fn = evalBundleTransform();
    const lateClef = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1"><note><rest/><duration>4</duration></note></measure>
    <measure number="2"><attributes><clef><sign>G</sign><line>2</line></clef></attributes></measure>
  </part>
</score-partwise>`;
    const out = new DOMParser().parseFromString(
      fn(lateClef, { transposeSemi: 0, enharmonic: 'sharp', clef: 'bass' }),
      'application/xml',
    );
    const clef = out.getElementsByTagName('clef')[0];
    expect(clef.getElementsByTagName('sign')[0].textContent).toBe('F');
    expect(clef.getElementsByTagName('line')[0].textContent).toBe('4');
  });
});
