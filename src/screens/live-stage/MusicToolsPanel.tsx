import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../../theme/ThemeContext';
import { fontMono } from '../../theme/tokens';
import { NOTES_SHARP, noteName, Enharmonic } from '../../music/notes';
import { Song, Clef, SheetMode } from '../../data/types';
import { PitchPipeIcon, XIcon } from '../../ui/icons';

interface MusicToolsPanelProps {
  open: boolean;
  onToggle: () => void;
  song: Song;
  onUpdateSong: (patch: Partial<Song>) => void;
  enharmonic: Enharmonic;
  onSetEnharmonic: (e: Enharmonic) => void;
  showNoteNames: boolean;
  onSetShowNoteNames: (v: boolean) => void;
}

// Floating "Music Tools" FAB + panel — transpose, sheet source, clef,
// enharmonic (per the design), note names, plus capo folded in from the
// retired SettingsSheet. Replaces the old QuickToolsFab's inert tuner/pitch
// pipe/stage-dark stubs, which had no onPress handlers to begin with.
export function MusicToolsPanel({
  open,
  onToggle,
  song,
  onUpdateSong,
  enharmonic,
  onSetEnharmonic,
  showNoteNames,
  onSetShowNoteNames,
}: MusicToolsPanelProps) {
  const { colors } = useTheme();
  const currentIdx = ((song.keyIdx + song.transposeSemi) % 12 + 12) % 12;

  return (
    <>
      {open && (
        <Pressable
          onPress={onToggle}
          className="absolute inset-0 z-10"
          style={{ backgroundColor: colors.overlay }}
        />
      )}

      <Button
        variant={open ? 'default' : 'secondary'}
        size="icon"
        onPress={onToggle}
        accessibilityLabel="Music tools"
        className="absolute bottom-5 right-4 z-20 h-[72px] w-[72px] rounded-full"
      >
        <PitchPipeIcon size={30} color={open ? colors.neutral[900] : colors.accent} />
      </Button>

      {open && (
        <View
          className="absolute bottom-[104px] right-3.5 z-20 h-1/2 w-1/2 min-w-[240px] max-w-[360px] overflow-hidden rounded-lg border border-border bg-card"
          style={{ shadowColor: '#2d2b2b', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 }}
        >
          <View className="flex-row items-center justify-between p-6 pb-0">
            <Text className="text-[17px] font-semibold text-foreground">Music Tools</Text>
            <Button variant="ghost" size="icon" className="h-10 w-10" onPress={onToggle} accessibilityLabel="Close">
              <XIcon size={16} color={colors.text} />
            </Button>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 p-6 pt-4"
            showsVerticalScrollIndicator={false}
          >
          <View className="gap-2.5">
            <Text className="text-[13px] uppercase tracking-wide text-muted-foreground">Transpose</Text>
            <View className="gap-2">
              {[NOTES_SHARP.slice(0, 6), NOTES_SHARP.slice(6, 12)].map((row, rowIdx) => (
                <View key={rowIdx} className="flex-row gap-2">
                  {row.map((_, colIdx) => {
                    const idx = rowIdx * 6 + colIdx;
                    const active = idx === currentIdx;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => onUpdateSong({ transposeSemi: idx - song.keyIdx })}
                        className={`flex-1 items-center rounded-sm border py-3 ${
                          active ? 'border-border bg-accent' : 'border-border bg-transparent'
                        }`}
                      >
                        <Text className={`text-[15px] ${active ? 'text-accent-foreground' : 'text-foreground/75'}`}>
                          {noteName(idx, enharmonic)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <ToolRow label="Sheet source" hint="(auto)">
              <ToggleGroup
                type="single"
                value={song.sheetMode}
                onValueChange={(v) => v && onUpdateSong({ sheetMode: v as SheetMode })}
              >
                <ToggleGroupItem value="pdf" isFirst>
                  <Text className="text-[13px]">PDF</Text>
                </ToggleGroupItem>
                <ToggleGroupItem value="musicxml" isLast>
                  <Text className="text-[13px]">MusicXML</Text>
                </ToggleGroupItem>
              </ToggleGroup>
            </ToolRow>

            <ToolRow label="Clef">
              <ToggleGroup
                type="single"
                value={song.clef}
                onValueChange={(v) => v && onUpdateSong({ clef: v as Clef })}
              >
                <ToggleGroupItem value="treble" isFirst>
                  <Text className="text-[13px]">Treble</Text>
                </ToggleGroupItem>
                <ToggleGroupItem value="alto">
                  <Text className="text-[13px]">Alto</Text>
                </ToggleGroupItem>
                <ToggleGroupItem value="bass" isLast>
                  <Text className="text-[13px]">Bass</Text>
                </ToggleGroupItem>
              </ToggleGroup>
            </ToolRow>

            <ToolRow label="Enharmonic">
              <ToggleGroup
                type="single"
                value={enharmonic}
                onValueChange={(v) => v && onSetEnharmonic(v as Enharmonic)}
              >
                <ToggleGroupItem value="sharp" isFirst>
                  <Text className="text-[13px]">♯</Text>
                </ToggleGroupItem>
                <ToggleGroupItem value="flat" isLast>
                  <Text className="text-[13px]">♭</Text>
                </ToggleGroupItem>
              </ToggleGroup>
            </ToolRow>

            <ToolRow label="Note names" hint="(MusicXML)">
              <ToggleGroup
                type="single"
                value={showNoteNames ? 'on' : 'off'}
                onValueChange={(v) => v && onSetShowNoteNames(v === 'on')}
              >
                <ToggleGroupItem value="off" isFirst>
                  <Text className="text-[13px]">Off</Text>
                </ToggleGroupItem>
                <ToggleGroupItem value="on" isLast>
                  <Text className="text-[13px]">On</Text>
                </ToggleGroupItem>
              </ToggleGroup>
            </ToolRow>

            <ToolRow label="Capo">
              <View className="flex-row items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  accessibilityLabel="Capo down"
                  onPress={() => onUpdateSong({ capo: Math.max(song.capo - 1, 0) })}
                >
                  <Text className="text-[15px] text-foreground">−</Text>
                </Button>
                <Text style={fontMono} className="min-w-[52px] text-center text-[13px] text-foreground">
                  Fret {song.capo}
                </Text>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  accessibilityLabel="Capo up"
                  onPress={() => onUpdateSong({ capo: Math.min(song.capo + 1, 11) })}
                >
                  <Text className="text-[15px] text-foreground">+</Text>
                </Button>
              </View>
            </ToolRow>
          </View>
          </ScrollView>
        </View>
      )}
    </>
  );
}

function ToolRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-2.5">
      <Text className="text-[14px] text-foreground/80">
        {label} {hint && <Text className="text-[12px] text-muted-foreground">{hint}</Text>}
      </Text>
      {children}
    </View>
  );
}
