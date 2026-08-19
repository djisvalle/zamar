import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading } from '../theme/tokens';
import { useStore } from '../data/store';
import { Song } from '../data/types';
import { noteName } from '../music/notes';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../ui/Button';
import { Card, CardMeta, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Segmented } from '../ui/Segmented';
import { PlusIcon } from '../ui/icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>;

type Item = { type: 'divider'; label: string } | { type: 'song'; song: Song };

export function LibraryScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { library, settings, setLibraryGroupByKey } = useStore();
  const [search, setSearch] = useState('');

  const items = useMemo<Item[]>(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? library.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            noteName(s.keyIdx, 'sharp').toLowerCase().includes(q),
        )
      : library;

    const groupByKey = settings.libraryGroupByKey;
    const sorted = [...filtered].sort((a, b) => {
      if (groupByKey) {
        const d = a.keyIdx - b.keyIdx;
        return d !== 0 ? d : a.title.localeCompare(b.title);
      }
      return a.title.localeCompare(b.title);
    });

    const out: Item[] = [];
    let lastGroup: string | null = null;
    for (const song of sorted) {
      const group = groupByKey ? `Key of ${noteName(song.keyIdx, 'sharp')}` : song.title[0]?.toUpperCase() ?? '#';
      if (group !== lastGroup) {
        out.push({ type: 'divider', label: group });
        lastGroup = group;
      }
      out.push({ type: 'song', song });
    }
    return out;
  }, [library, search, settings.libraryGroupByKey]);

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
          value={settings.libraryGroupByKey ? 'key' : 'alpha'}
          onChange={(v) => setLibraryGroupByKey(v === 'key')}
          options={[
            { value: 'alpha', label: 'A–Z' },
            { value: 'key', label: 'By Key' },
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
            <Pressable key={item.song.id} onPress={() => navigation.navigate('LiveStage', { songId: item.song.id })}>
              <Card row>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <CardTitle>{item.song.title}</CardTitle>
                  <CardMeta>
                    {item.song.artist} · {noteName(item.song.keyIdx, 'sharp')}
                  </CardMeta>
                </View>
              </Card>
            </Pressable>
          ),
        )}
      </ScrollView>

      <View style={{ position: 'absolute', right: 14, bottom: 14 }}>
        <Button
          variant="primary"
          icon
          size={48}
          accessibilityLabel="Add song"
          onPress={() => navigation.navigate('AddSong', { addToSetlist: false })}
          style={{ borderRadius: 24, backgroundColor: colors.surface }}
        >
          <PlusIcon size={20} color={colors.accent} />
        </Button>
      </View>
    </SafeAreaView>
  );
}
