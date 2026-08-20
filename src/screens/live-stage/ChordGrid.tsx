import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fontMono } from '../../theme/tokens';
import { Enharmonic } from '../../music/notes';
import { parseChart, transposeLine } from '../../music/chart';

interface ChordGridProps {
  chart: string;
  transposeSemi: number;
  capo: number;
  enharmonic: Enharmonic;
}

const LINE_HEIGHT = 14 * 2.1;

export function ChordGrid({ chart, transposeSemi, capo, enharmonic }: ChordGridProps) {
  const { colors } = useTheme();

  const lines = useMemo(() => parseChart(chart), [chart]);
  // Capo raises the sounding pitch of a shape by `capo` semitones, so the
  // shape shown here needs to sit that many semitones below the live
  // transpose to still sound at `transposeSemi` once capo'd.
  const shapeSemi = transposeSemi - capo;
  const transposed = useMemo(
    () => lines.map((l) => (l.chord ? transposeLine(l.raw, shapeSemi, enharmonic) : l.raw)),
    [lines, shapeSemi, enharmonic],
  );

  if (!chart.trim()) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
          No chords yet — tap ✎ Edit to add lyrics & chords.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 14 }}
    >
      {transposed.map((text, i) => (
        <ChordLine key={i} text={text} isChord={lines[i]?.chord} />
      ))}
    </ScrollView>
  );
}

function ChordLine({ text, isChord }: { text: string; isChord?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        fontMono,
        {
          fontSize: 14,
          lineHeight: LINE_HEIGHT,
          color: isChord ? colors.accent : colors.text,
          opacity: isChord ? 1 : 0.9,
        },
      ]}
    >
      {text.length ? text : ' '}
    </Text>
  );
}
