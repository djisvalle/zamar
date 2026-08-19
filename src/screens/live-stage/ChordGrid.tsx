import React, { useMemo, useRef } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fontMono } from '../../theme/tokens';
import { Enharmonic } from '../../music/notes';
import { parseChart, transposeLine } from '../../music/chart';
import { Input } from '../../ui/Input';

interface ChordGridProps {
  chart: string;
  transposeSemi: number;
  enharmonic: Enharmonic;
  editMode: boolean;
  onChangeChart: (raw: string) => void;
  autoScroll: boolean;
}

const LINE_HEIGHT = 14 * 2.1;

// Real auto-scroll (the settings sheet only exposes an Off/On toggle — the
// footer speed slider described in earlier drafts was cut, see chats/chat1.md)
// at a fixed, comfortable reading pace.
const AUTO_SCROLL_PX_PER_TICK = 0.6;
const AUTO_SCROLL_TICK_MS = 60;

export function ChordGrid({ chart, transposeSemi, enharmonic, editMode, onChangeChart, autoScroll }: ChordGridProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const viewportH = useRef(0);
  const contentH = useRef(0);
  const pulse = useRef(new Animated.Value(0.35)).current;

  const lines = useMemo(() => parseChart(chart), [chart]);
  const transposed = useMemo(
    () => lines.map((l) => (l.chord ? transposeLine(l.raw, transposeSemi, enharmonic) : l.raw)),
    [lines, transposeSemi, enharmonic],
  );

  React.useEffect(() => {
    if (!autoScroll) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    const id = setInterval(() => {
      const maxY = Math.max(contentH.current - viewportH.current, 0);
      const next = Math.min(scrollY.current + AUTO_SCROLL_PX_PER_TICK, maxY);
      scrollRef.current?.scrollTo({ y: next, animated: false });
      scrollY.current = next;
    }, AUTO_SCROLL_TICK_MS);
    return () => {
      anim.stop();
      clearInterval(id);
    };
  }, [autoScroll, pulse]);

  if (editMode) {
    return (
      <Input
        value={chart}
        onChangeText={onChangeChart}
        mono
        multiline
        fontSize={13}
        style={{ flex: 1, borderWidth: 0, borderRadius: 0, lineHeight: 22, padding: 14 }}
        placeholder={'G          D\nAmazing grace, how sweet the sound'}
      />
    );
  }

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
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 14 }}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={32}
        onLayout={(e) => {
          viewportH.current = e.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_, h) => {
          contentH.current = h;
        }}
      >
        <View
          style={{
            backgroundColor: colors.accentTint(14),
            borderLeftWidth: 2,
            borderLeftColor: colors.accent,
            marginHorizontal: -14,
            paddingHorizontal: 14,
          }}
        >
          {transposed.slice(0, 2).map((text, i) => (
            <ChordLine key={i} text={text} isChord={lines[i]?.chord} dim={false} />
          ))}
        </View>
        {transposed.slice(2).map((text, i) => (
          <ChordLine key={i + 2} text={text} isChord={lines[i + 2]?.chord} dim={i + 2 >= transposed.length - 2} />
        ))}
      </ScrollView>
      <View
        style={{
          position: 'absolute',
          right: 6,
          top: 8,
          bottom: 8,
          width: 3,
          borderRadius: 2,
          backgroundColor: colors.divider,
        }}
      >
        {autoScroll && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '38%',
              borderRadius: 2,
              backgroundColor: colors.accent,
              opacity: pulse,
            }}
          />
        )}
      </View>
    </View>
  );
}

function ChordLine({ text, isChord, dim }: { text: string; isChord?: boolean; dim: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        fontMono,
        {
          fontSize: 14,
          lineHeight: LINE_HEIGHT,
          color: isChord ? colors.accent : colors.text,
          opacity: isChord ? 1 : dim ? 0.55 : 0.9,
        },
      ]}
    >
      {text.length ? text : ' '}
    </Text>
  );
}
