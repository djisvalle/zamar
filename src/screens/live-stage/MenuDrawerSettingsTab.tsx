import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useStore } from '../../data/store';
import { Song, SheetMode } from '../../data/types';
import { Enharmonic } from '../../music/notes';
import { Appearance } from '../../theme/tokens';

interface MenuDrawerSettingsTabProps {
  song?: Song;
}

export function MenuDrawerSettingsTab({ song }: MenuDrawerSettingsTabProps) {
  const { settings, setEnharmonic, setAppearance, setAutoOrderSetlists, updateSong } = useStore();

  return (
    <View className="flex-1 gap-4 p-3.5">
      <Text className="text-[14px] font-semibold text-foreground">Settings</Text>

      <View className="gap-2">
        <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">Notation</Text>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[13px] text-foreground/80">Enharmonic spelling</Text>
          <ToggleGroup
            type="single"
            value={settings.enharmonic}
            onValueChange={(v) => v && setEnharmonic(v as Enharmonic)}
          >
            <ToggleGroupItem value="sharp" isFirst>
              <Text className="text-[12.5px]">♯ Sharp</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="flat" isLast>
              <Text className="text-[12.5px]">♭ Flat</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        </View>
      </View>

      {song && (
        <>
          <Separator />

          <View className="gap-2">
            <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">Sheet music</Text>
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-[13px] text-foreground/80" numberOfLines={1}>
                Source for "{song.title}"
              </Text>
              <ToggleGroup
                type="single"
                value={song.sheetMode}
                onValueChange={(v) => v && updateSong(song.id, { sheetMode: v as SheetMode })}
              >
                <ToggleGroupItem value="pdf" isFirst>
                  <Text className="text-[12.5px]">PDF</Text>
                </ToggleGroupItem>
                <ToggleGroupItem value="musicxml" isLast>
                  <Text className="text-[12.5px]">MusicXML</Text>
                </ToggleGroupItem>
              </ToggleGroup>
            </View>
          </View>
        </>
      )}

      <Separator />

      <View className="gap-2">
        <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">Appearance</Text>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[13px] text-foreground/80">Theme</Text>
          <ToggleGroup
            type="single"
            value={settings.appearance}
            onValueChange={(v) => v && setAppearance(v as Appearance)}
          >
            <ToggleGroupItem value="light" isFirst>
              <Text className="text-[12.5px]">Light</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" isLast>
              <Text className="text-[12.5px]">Stage Dark</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        </View>
      </View>

      <Separator />

      <View className="gap-2">
        <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">Setlists</Text>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[13px] text-foreground/80">Auto-order new setlists by key</Text>
          <ToggleGroup
            type="single"
            value={settings.autoOrderSetlists ? 'on' : 'off'}
            onValueChange={(v) => v && setAutoOrderSetlists(v === 'on')}
          >
            <ToggleGroupItem value="off" isFirst>
              <Text className="text-[12.5px]">Off</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="on" isLast>
              <Text className="text-[12.5px]">On</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        </View>
      </View>
    </View>
  );
}
