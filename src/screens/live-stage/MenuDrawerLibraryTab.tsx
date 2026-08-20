import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../../theme/ThemeContext';
import { useStore } from '../../data/store';
import { groupLibrary } from '../../data/librarySort';
import { LibrarySort } from '../../data/types';
import { noteName } from '../../music/notes';
import { PlusIcon, StarIcon } from '../../ui/icons';

interface MenuDrawerLibraryTabProps {
  onNavigateSong: (id: string) => void;
  onCreateSong: () => void;
}

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: 'letter', label: 'Letter' },
  { value: 'key', label: 'Key' },
  { value: 'artist', label: 'Artist' },
];

export function MenuDrawerLibraryTab({ onNavigateSong, onCreateSong }: MenuDrawerLibraryTabProps) {
  const { colors } = useTheme();
  const { library, settings, setLibrarySort, updateSong } = useStore();

  const items = useMemo(
    () => groupLibrary(library, settings.librarySort, settings.enharmonic),
    [library, settings.librarySort, settings.enharmonic],
  );

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between gap-2 border-b border-border px-3 pb-1.5 pt-2.5">
        <Text className="text-[15px] font-semibold text-foreground">
          Library <Text className="text-[11px] font-normal text-muted-foreground">· {library.length}</Text>
        </Text>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7"
          hitSlop={6}
          onPress={onCreateSong}
          accessibilityLabel="Create a new song"
        >
          <PlusIcon size={14} color={colors.text} />
        </Button>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-1 px-2.5 py-1.5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item, i) =>
          item.type === 'divider' ? (
            <View key={`d-${i}`} className="flex-row items-center gap-1.5 pb-0 pt-1.5">
              <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</Text>
              <View className="h-px flex-1 bg-border" />
            </View>
          ) : (
            <View key={item.song.id} className="flex-row items-center gap-2 rounded-md border border-border px-2 py-1.5">
              <Pressable className="min-w-0 flex-1" onPress={() => onNavigateSong(item.song.id)}>
                <Text className="text-[14px] font-medium text-foreground" numberOfLines={1}>
                  {item.song.title}
                </Text>
                <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
                  {item.song.artist} · {noteName(item.song.keyIdx, settings.enharmonic)}
                </Text>
              </Pressable>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                hitSlop={6}
                accessibilityLabel={item.song.favorite ? 'Remove from favorites' : 'Add to favorites'}
                onPress={() => updateSong(item.song.id, { favorite: !item.song.favorite })}
              >
                <StarIcon size={14} color={colors.accent} filled={item.song.favorite} />
              </Button>
            </View>
          ),
        )}
      </ScrollView>

      <View className="flex-row border-t border-border px-2 py-1">
        <ToggleGroup
          type="single"
          value={settings.librarySort}
          onValueChange={(v) => v && setLibrarySort(v as LibrarySort)}
          className="flex-1"
        >
          {SORT_OPTIONS.map((opt, i) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              className="flex-1"
              isFirst={i === 0}
              isLast={i === SORT_OPTIONS.length - 1}
            >
              <Text className="text-[12px] font-medium">{opt.label}</Text>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </View>
    </View>
  );
}
