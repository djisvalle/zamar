import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading } from '../theme/tokens';
import { useStore } from '../data/store';
import { noteName } from '../music/notes';
import { RootStackParamList } from '../navigation/types';
import { ChevronLeftIcon, GripIcon } from '../ui/icons';

type Props = NativeStackScreenProps<RootStackParamList, 'SetlistDetails'>;

export function SetlistDetailsScreen({ route, navigation }: Props) {
  const { setlistId } = route.params;
  const { colors } = useTheme();
  const store = useStore();
  const setlist = store.setlists.find((s) => s.id === setlistId);
  const isActive = store.activeSetlistId === setlistId;

  if (!setlist) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text className="text-foreground">Setlist not found.</Text>
      </SafeAreaView>
    );
  }

  const setlistSongs = setlist.songIds
    .map((id) => store.songs[id])
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={store.settings.appearance === 'dark' ? 'light-content' : 'dark-content'} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: 56,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.surface,
        }}
      >
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()} accessibilityLabel="Back" className="h-9 w-9 rounded-full">
          <ChevronLeftIcon size={18} color={colors.text} />
        </Button>
        <Text
          style={[fontHeading, { flex: 1, minWidth: 0, fontSize: 16, color: colors.text, textAlign: 'center' }]}
          numberOfLines={1}
        >
          {setlist.name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerClassName="gap-3 p-4" keyboardShouldPersistTaps="handled">
        <Button
          variant={isActive ? 'secondary' : 'default'}
          onPress={() => {
            if (isActive) {
              store.setActiveSetlist(null);
              return;
            }
            store.setActiveSetlist(setlistId);
            const firstSongId = setlist.songIds[0];
            if (firstSongId) {
              navigation.replace('LiveStage', { songId: firstSongId, setlistContext: true });
            }
          }}
          className="h-12"
        >
          <Text className="text-[15px] font-semibold">{isActive ? 'Stop Setlist' : 'Start Setlist'}</Text>
        </Button>

        <Text className="text-[12px] text-muted-foreground">
          {setlistSongs.length} {setlistSongs.length === 1 ? 'song' : 'songs'}
        </Text>

        <View className="gap-1.5">
          {setlistSongs.map((song) => (
            <Pressable
              key={song.id}
              className="flex-row items-center gap-3 rounded-xl border border-border bg-card px-4 py-4"
              onPress={() => navigation.replace('LiveStage', { songId: song.id, setlistContext: isActive })}
            >
              <GripIcon size={14} color={colors.text} />
              <View className="min-w-0 flex-1">
                <Text className="text-[14px] font-medium text-foreground" numberOfLines={1}>
                  {song.title}
                </Text>
                <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
                  Key of {noteName(song.keyIdx, store.settings.enharmonic)}
                </Text>
              </View>
            </Pressable>
          ))}
          {setlistSongs.length === 0 && (
            <Text className="text-[13px] text-muted-foreground">No songs in this setlist yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
