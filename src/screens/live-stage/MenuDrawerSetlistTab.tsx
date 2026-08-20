import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTheme } from '../../theme/ThemeContext';
import { useStore } from '../../data/store';
import { noteName } from '../../music/notes';
import { EditIcon, PlusIcon, TrashIcon } from '../../ui/icons';
import { SetlistBuildView } from './SetlistBuildView';

interface MenuDrawerSetlistTabProps {
  onOpenSetlistDetails: (id: string) => void;
}

export function MenuDrawerSetlistTab({ onOpenSetlistDetails }: MenuDrawerSetlistTabProps) {
  const { colors } = useTheme();
  const { setlists, songs, settings, deleteSetlist } = useStore();
  const [buildTarget, setBuildTarget] = useState<'new' | string | null>(null);

  if (buildTarget !== null) {
    return <SetlistBuildView setlistId={buildTarget === 'new' ? null : buildTarget} onDone={() => setBuildTarget(null)} />;
  }

  return (
    <ScrollView
      contentContainerClassName="gap-3 p-3"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-[14px] font-semibold text-foreground">Setlists</Text>

      <View className="gap-2">
        {setlists.map((setlist) => {
          const setlistSongs = setlist.songIds
            .map((id) => songs[id])
            .filter((s): s is NonNullable<typeof s> => Boolean(s));
          const keyMap = setlistSongs.map((s) => noteName(s.keyIdx, settings.enharmonic)).join(' → ') || '—';
          return (
            <View key={setlist.id} className="gap-2 rounded-xl border border-border bg-background p-4">
              <Pressable
                className="flex-row items-center justify-between gap-2"
                onPress={() => onOpenSetlistDetails(setlist.id)}
              >
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
                    {setlist.name}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    {setlistSongs.length} songs · {keyMap}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    hitSlop={6}
                    accessibilityLabel={`Edit ${setlist.name}`}
                    onPress={() => setBuildTarget(setlist.id)}
                  >
                    <EditIcon size={13} color={colors.text} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    hitSlop={6}
                    accessibilityLabel={`Delete ${setlist.name}`}
                    onPress={() => deleteSetlist(setlist.id)}
                  >
                    <TrashIcon size={13} color={colors.text} />
                  </Button>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Button variant="secondary" onPress={() => setBuildTarget('new')} className="flex-row gap-1.5">
        <PlusIcon size={14} color={colors.text} />
        <Text className="text-[13px] font-medium">Create a new Setlist</Text>
      </Button>
    </ScrollView>
  );
}
