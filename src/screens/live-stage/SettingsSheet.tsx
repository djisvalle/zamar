import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fontHeading, radius, space } from '../../theme/tokens';
import { NOTES_SHARP, noteName, Enharmonic } from '../../music/notes';
import { Song, Clef, SheetMode } from '../../data/types';
import { Appearance } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';
import { Tag } from '../../ui/Tag';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  song: Song;
  onUpdateSong: (patch: Partial<Song>) => void;
  appearance: Appearance;
  onSetAppearance: (a: Appearance) => void;
  enharmonic: Enharmonic;
  onSetEnharmonic: (e: Enharmonic) => void;
}

export function SettingsSheet({
  visible,
  onClose,
  song,
  onUpdateSong,
  appearance,
  onSetAppearance,
  enharmonic,
  onSetEnharmonic,
}: SettingsSheetProps) {
  const { colors } = useTheme();
  const currentIdx = ((song.keyIdx + song.transposeSemi) % 12 + 12) % 12;
  const liveKey = noteName(currentIdx, enharmonic);

  const glow = useRef(new Animated.Value(0)).current;
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    glow.setValue(1);
    Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: false }).start();
  }, [song.transposeSemi, glow]);

  const glowShadow = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose}>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 16,
            gap: 14,
            maxHeight: '86%',
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[fontHeading, { fontSize: 16, color: colors.text }]}>Settings</Text>
              <Button variant="ghost" icon size={32} onPress={onClose} accessibilityLabel="Close">
                <Text style={{ color: colors.accent, fontSize: 16 }}>✕</Text>
              </Button>
            </View>

            <Row label="Key / Transpose">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Button
                  variant="primary"
                  icon
                  size={34}
                  accessibilityLabel="Transpose down"
                  onPress={() => onUpdateSong({ transposeSemi: song.transposeSemi - 1 })}
                >
                  <Text style={[fontHeading, { color: colors.accent, fontSize: 18 }]}>−</Text>
                </Button>
                <Animated.View
                  style={{
                    borderRadius: radius.md * 0.75,
                    shadowColor: colors.accent,
                    shadowOpacity: 0.7,
                    shadowRadius: glowShadow,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                >
                  <Tag mono style={{ minWidth: 32, justifyContent: 'center' }} textStyle={{ fontSize: 14 }}>
                    {liveKey}
                  </Tag>
                </Animated.View>
                <Button
                  variant="primary"
                  icon
                  size={34}
                  accessibilityLabel="Transpose up"
                  onPress={() => onUpdateSong({ transposeSemi: song.transposeSemi + 1 })}
                >
                  <Text style={[fontHeading, { color: colors.accent, fontSize: 18 }]}>+</Text>
                </Button>
              </View>
            </Row>

            <View style={{ gap: 4, marginTop: 4 }}>
              {[NOTES_SHARP.slice(0, 6), NOTES_SHARP.slice(6, 12)].map((row, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: 'row', gap: 4 }}>
                  {row.map((_, colIdx) => {
                    const idx = rowIdx * 6 + colIdx;
                    const label = noteName(idx, enharmonic);
                    const active = idx === currentIdx;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => onUpdateSong({ transposeSemi: idx - song.keyIdx })}
                        style={{
                          flex: 1,
                          paddingVertical: 5,
                          alignItems: 'center',
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: active ? colors.accent : colors.divider,
                          backgroundColor: active ? colors.accentTint(16) : 'transparent',
                        }}
                      >
                        <Text
                          style={{ fontSize: 11, color: active ? colors.accent : colors.text, opacity: active ? 1 : 0.7 }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <Row label="Sheet source" hint="(auto-detected)">
              <Segmented<SheetMode>
                value={song.sheetMode}
                onChange={(v) => onUpdateSong({ sheetMode: v })}
                options={[
                  { value: 'pdf', label: 'PDF' },
                  { value: 'musicxml', label: 'MusicXML' },
                ]}
              />
            </Row>

            <Row label="Clef" hint="(sheet music)">
              <Segmented<Clef>
                value={song.clef}
                onChange={(v) => onUpdateSong({ clef: v })}
                options={[
                  { value: 'treble', label: 'Treble' },
                  { value: 'alto', label: 'Alto' },
                  { value: 'bass', label: 'Bass' },
                ]}
              />
            </Row>

            <Row label="Auto-scroll">
              <Segmented<'off' | 'on'>
                value={song.autoScroll ? 'on' : 'off'}
                onChange={(v) => onUpdateSong({ autoScroll: v === 'on' })}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'on', label: 'On' },
                ]}
              />
            </Row>

            <Row label="Capo">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Button
                  variant="secondary"
                  icon
                  size={34}
                  accessibilityLabel="Capo down"
                  onPress={() => onUpdateSong({ capo: Math.max(song.capo - 1, 0) })}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>−</Text>
                </Button>
                <Tag variant="neutral" mono style={{ minWidth: 48, justifyContent: 'center' }}>
                  Fret {song.capo}
                </Tag>
                <Button
                  variant="secondary"
                  icon
                  size={34}
                  accessibilityLabel="Capo up"
                  onPress={() => onUpdateSong({ capo: Math.min(song.capo + 1, 11) })}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>+</Text>
                </Button>
              </View>
            </Row>

            <Row label="Tempo / Meter">
              <Tag variant="neutral" mono>
                {song.tempo} BPM · {song.meter}
              </Tag>
            </Row>

            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: space[1] }} />

            <Row label="Appearance" hint="(app-wide)">
              <Segmented<Appearance>
                value={appearance}
                onChange={onSetAppearance}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Stage Dark' },
                ]}
              />
            </Row>

            <Row label="Enharmonic">
              <Segmented<Enharmonic>
                value={enharmonic}
                onChange={onSetEnharmonic}
                options={[
                  { value: 'sharp', label: '♯' },
                  { value: 'flat', label: '♭' },
                ]}
              />
            </Row>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.text, opacity: 0.75 }}>
        {label} {hint && <Text style={{ fontSize: 11, opacity: 0.8 }}>{hint}</Text>}
      </Text>
      {children}
    </View>
  );
}
