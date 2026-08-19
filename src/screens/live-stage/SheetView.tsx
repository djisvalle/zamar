import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { Clef, SheetMode } from '../../data/types';
import { Card, CardTitle } from '../../ui/Card';
import { PdfFileIcon } from '../../ui/icons';
import { Tag } from '../../ui/Tag';

interface SheetViewProps {
  sheetMode: SheetMode;
  clef: Clef;
  sourceLabel: string;
  liveKey: string;
}

export function SheetView({ sheetMode, clef, sourceLabel, liveKey }: SheetViewProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{sourceLabel}</Text>
        <Tag mono>{liveKey}</Tag>
      </View>
      {sheetMode === 'pdf' ? (
        <Card style={{ minHeight: 220, justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <PdfFileIcon size={26} color={colors.text} strokeWidth={2} />
          <CardTitle style={{ fontSize: 14 }}>Static PDF</CardTitle>
          <Text style={{ fontSize: 13, color: colors.text, opacity: 0.8, textAlign: 'center' }}>
            Rendered as-is. Annotation and page-turn only — no transposition, no relayout.
          </Text>
          <Tag variant="neutral">Annotate-only</Tag>
        </Card>
      ) : (
        <View>
          <StaffGraphic clef={clef} color={colors.text} />
          <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
            fully transposable notation — re-engraves on key or clef change
          </Text>
        </View>
      )}
    </View>
  );
}

function StaffGraphic({ clef, color }: { clef: Clef; color: string }) {
  return (
    <Svg width="100%" height={140} viewBox="0 0 260 140">
      <Line x1="0" y1="40" x2="260" y2="40" stroke={color} strokeWidth={1} opacity={0.5} />
      <Line x1="0" y1="55" x2="260" y2="55" stroke={color} strokeWidth={1} opacity={0.5} />
      <Line x1="0" y1="70" x2="260" y2="70" stroke={color} strokeWidth={1} opacity={0.5} />
      <Line x1="0" y1="85" x2="260" y2="85" stroke={color} strokeWidth={1} opacity={0.5} />
      <Line x1="0" y1="100" x2="260" y2="100" stroke={color} strokeWidth={1} opacity={0.5} />
      {clef === 'alto' && (
        <>
          <Rect x="14" y="40" width="4" height="60" fill={color} opacity={0.75} />
          <Rect x="24" y="40" width="4" height="60" fill={color} opacity={0.75} />
          <Path d="M32 40 Q46 48 32 62 Q46 76 32 84" fill="none" stroke={color} strokeWidth={4} opacity={0.75} />
          <Path d="M32 56 Q46 64 32 78 Q46 92 32 100" fill="none" stroke={color} strokeWidth={4} opacity={0.75} />
        </>
      )}
      {clef === 'treble' && (
        <SvgText x="8" y="86" fontSize={38} fill={color} opacity={0.7}>
          {'\u{1D11E}'}
        </SvgText>
      )}
      {clef === 'bass' && (
        <SvgText x="8" y="86" fontSize={38} fill={color} opacity={0.7}>
          {'\u{1D122}'}
        </SvgText>
      )}
    </Svg>
  );
}
