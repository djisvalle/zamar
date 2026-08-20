import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading } from '../theme/tokens';
import { useStore } from '../data/store';
import { groupLibrary } from '../data/librarySort';
import { noteName } from '../music/notes';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../ui/Button';
import { Card, CardMeta, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Segmented } from '../ui/Segmented';
import { EditIcon, PlusIcon, StarIcon } from '../ui/icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>;

export function LibraryScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { library, settings, setLibrarySort, updateSong } = useStore();
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? library.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            noteName(s.keyIdx, 'sharp').toLowerCase().includes(q),
        )
      : library;
    return groupLibrary(filtered, settings.librarySort, settings.enharmonic);
  }, [library, search, settings.librarySort, settings.enharmonic]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={settings.appearance === 'dark' ? 'light-content' : 'dark-content'} />

      <View
        style={{
          padding: 12,
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[fontHeading, { fontSize: 16, color: colors.text }]}>My Songs</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{library.length} songs</Text>
        </View>
        <Input value={search} onChangeText={setSearch} placeholder="Search songs, artists, keys…" fontSize={13} />
        <Segmented
          fontSize={11}
          value={settings.librarySort}
          onChange={setLibrarySort}
          options={[
            { value: 'letter', label: 'A–Z' },
            { value: 'key', label: 'By Key' },
            { value: 'artist', label: 'By Artist' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 10, gap: 8 }}>
        {items.map((item, i) =>
          item.type === 'divider' ? (
            <View key={`d-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 }}>
              <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted }}>
                {item.label}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
            </View>
          ) : (
            <Card key={item.song.id} row>
              <Pressable
                style={{ flex: 1, minWidth: 0 }}
                onPress={() => navigation.navigate('LiveStage', { songId: item.song.id })}
              >
                <CardTitle>{item.song.title}</CardTitle>
                <CardMeta>
                  {item.song.artist} · {noteName(item.song.keyIdx, settings.enharmonic)}
                </CardMeta>
              </Pressable>
              <Button
                variant="ghost"
                icon
                size={30}
                accessibilityLabel={item.song.favorite ? 'Remove from favorites' : 'Add to favorites'}
                onPress={() => updateSong(item.song.id, { favorite: !item.song.favorite })}
              >
                <StarIcon size={15} color={colors.accent} filled={item.song.favorite} />
              </Button>
              <Button
                variant="ghost"
                icon
                size={30}
                accessibilityLabel="Edit song"
                onPress={() => navigation.navigate('AddSong', { mode: 'edit', songId: item.song.id })}
              >
                <EditIcon size={14} color={colors.text} />
              </Button>
            </Card>
          ),
        )}
      </ScrollView>

      <View style={{ position: 'absolute', right: 14, bottom: 14 }}>
        <Button
          variant="primary"
          icon
          size={48}
          accessibilityLabel="Add song"
          onPress={() => navigation.navigate('AddSong', { mode: 'create' })}
          style={{ borderRadius: 24, backgroundColor: colors.surface }}
        >
          <PlusIcon size={20} color={colors.accent} />
        </Button>
      </View>
    </SafeAreaView>
  );
}
