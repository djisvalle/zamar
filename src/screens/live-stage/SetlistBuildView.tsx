import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../../theme/ThemeContext';
import { useStore } from '../../data/store';
import { noteName } from '../../music/notes';
import { AlertTriangleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronUpIcon, PlusIcon, StarIcon, XIcon } from '../../ui/icons';

interface SetlistBuildViewProps {
  setlistId: string | null;
  onDone: () => void;
}

// Intervals (in semitones) from the previous song's key that read as a
// closely-related key change rather than an abrupt jump — per the design's
// CLOSELY_RELATED set.
const CLOSELY_RELATED_SEMITONES = [0, 2, 5, 7, 10];

export function SetlistBuildView({ setlistId, onDone }: SetlistBuildViewProps) {
  const { colors } = useTheme();
  const { library, setlists, settings, createSetlist, updateSetlist, setAutoOrderSetlists } = useStore();
  const existing = setlistId ? setlists.find((s) => s.id === setlistId) ?? null : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [draftIds, setDraftIds] = useState<string[]>(existing?.songIds ?? []);
  const [addFilter, setAddFilter] = useState<'all' | 'favorites'>('all');
  const autoOrder = settings.autoOrderSetlists;

  const draftSongsRaw = draftIds
    .map((id) => library.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const draftSongs = autoOrder ? [...draftSongsRaw].sort((a, b) => a.keyIdx - b.keyIdx) : draftSongsRaw;
  const abruptFlags = draftSongs.map((song, i) => {
    if (i === 0) return false;
    const interval = ((song.keyIdx - draftSongs[i - 1].keyIdx) % 12 + 12) % 12;
    return !CLOSELY_RELATED_SEMITONES.includes(interval);
  });
  const available = library
    .filter((s) => !draftIds.includes(s.id))
    .filter((s) => addFilter === 'all' || s.favorite);
  const keyMap = draftSongs.map((s) => noteName(s.keyIdx, settings.enharmonic)).join(' → ') || '—';
  const canSave = name.trim().length > 0;

  function moveDraft(index: number, dir: -1 | 1) {
    setDraftIds((ids) => {
      const target = index + dir;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    if (!canSave) return;
    // Persist whatever order is currently on screen — the auto-computed
    // key order when auto-order is on, the manually-arranged order otherwise.
    const orderedIds = draftSongs.map((s) => s.id);
    if (existing) {
      updateSetlist(existing.id, { name: name.trim(), songIds: orderedIds });
    } else {
      createSetlist(name.trim(), orderedIds);
    }
    onDone();
  }

  return (
    <ScrollView
      contentContainerClassName="gap-3 p-3"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Button variant="ghost" size="sm" onPress={onDone} className="flex-row gap-1 self-start px-2">
        <ChevronLeftIcon size={13} color={colors.accent} />
        <Text className="text-[12px] font-medium text-primary">Back</Text>
      </Button>

      <Input value={name} onChangeText={setName} placeholder="Setlist name (e.g. Sunday AM)" className="h-9 text-[13px]" />

      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] text-foreground/75">Auto-order by key</Text>
        <ToggleGroup type="single" value={autoOrder ? 'on' : 'off'} onValueChange={(v) => v && setAutoOrderSetlists(v === 'on')}>
          <ToggleGroupItem value="off" isFirst>
            <Text className="text-[11px]">Off</Text>
          </ToggleGroupItem>
          <ToggleGroupItem value="on" isLast>
            <Text className="text-[11px]">On</Text>
          </ToggleGroupItem>
        </ToggleGroup>
      </View>

      <Separator />

      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Draft order · {draftSongs.length} songs
        </Text>
        <Text className="text-[11px] text-primary">{keyMap}</Text>
      </View>

      <View className="gap-1.5">
        {draftSongs.map((song, i) => (
          <View key={song.id} className="gap-1">
            {abruptFlags[i] && (
              <View className="flex-row items-center gap-1.5 px-1">
                <AlertTriangleIcon size={11} color={colors.accent} />
                <Text className="text-[10px] text-primary">abrupt key change</Text>
              </View>
            )}
            <View className="flex-row items-center gap-2 rounded-md border border-border px-2.5 py-2">
              <View className="min-w-0 flex-1">
                <Text className="text-[13px] font-medium text-foreground" numberOfLines={1}>
                  {song.title}
                </Text>
                <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                  {song.artist} · Key of {noteName(song.keyIdx, settings.enharmonic)}
                </Text>
              </View>
              {!autoOrder && (
                <View className="gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-5"
                    hitSlop={10}
                    disabled={i === 0}
                    accessibilityLabel="Move up"
                    onPress={() => moveDraft(i, -1)}
                  >
                    <ChevronUpIcon size={11} color={colors.text} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-5"
                    hitSlop={10}
                    disabled={i === draftSongs.length - 1}
                    accessibilityLabel="Move down"
                    onPress={() => moveDraft(i, 1)}
                  >
                    <ChevronDownIcon size={11} color={colors.text} />
                  </Button>
                </View>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                hitSlop={8}
                accessibilityLabel="Remove from setlist"
                onPress={() => setDraftIds((ids) => ids.filter((x) => x !== song.id))}
              >
                <XIcon size={13} color={colors.text} />
              </Button>
            </View>
          </View>
        ))}
        {draftSongs.length === 0 && (
          <Text className="py-2 text-center text-[12px] text-muted-foreground">No songs yet — add one below.</Text>
        )}
      </View>

      <Separator />

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">Add songs</Text>
          <ToggleGroup type="single" value={addFilter} onValueChange={(v) => v && setAddFilter(v as 'all' | 'favorites')}>
            <ToggleGroupItem value="all" isFirst>
              <Text className="text-[11px]">All</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="favorites" className="flex-row gap-1" isLast>
              <StarIcon size={11} color={colors.accent} filled={addFilter === 'favorites'} />
              <Text className="text-[11px]">Favorites</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        </View>

        {available.map((song) => (
          <View key={song.id} className="flex-row items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
            <View className="min-w-0 flex-1">
              <Text className="text-[13px] font-medium text-foreground" numberOfLines={1}>
                {song.title}
              </Text>
              <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                {noteName(song.keyIdx, settings.enharmonic)}
              </Text>
            </View>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              hitSlop={6}
              accessibilityLabel={`Add ${song.title} to setlist`}
              onPress={() => setDraftIds((ids) => [...ids, song.id])}
            >
              <PlusIcon size={12} color={colors.text} />
            </Button>
          </View>
        ))}
        {available.length === 0 && (
          <Text className="py-2 text-center text-[12px] text-muted-foreground">
            {addFilter === 'favorites' ? 'No favorite songs left to add.' : 'All songs are already in this setlist.'}
          </Text>
        )}
      </View>

      <Button onPress={handleSave} disabled={!canSave} className="mt-1">
        <Text className="text-[13px] font-semibold">Save setlist</Text>
      </Button>
    </ScrollView>
  );
}
