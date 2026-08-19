import React, { useState } from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading, radius } from '../theme/tokens';
import { useStore } from '../data/store';
import { SongSource } from '../data/types';
import { noteName } from '../music/notes';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tag } from '../ui/Tag';
import { ChevronLeftIcon, PdfFileIcon, TypeInIcon, UploadIcon, XmlFileIcon } from '../ui/icons';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSong'>;

const SOURCES: { value: SongSource; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'musicxml', label: 'MusicXML' },
  { value: 'type', label: 'Type it in' },
];

export function AddSongScreen({ route, navigation }: Props) {
  const { addToSetlist } = route.params;
  const { colors } = useTheme();
  const store = useStore();

  const [source, setSource] = useState<SongSource>('type');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [keyIdx, setKeyIdx] = useState(0);
  const [chart, setChart] = useState('');

  const canSave = title.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const id = store.addSong(
      {
        title: title.trim(),
        artist: artist.trim(),
        keyIdx,
        source,
        chart: source === 'type' ? chart : '',
        sheetFileUri: null,
        sheetFileName: null,
      },
      addToSetlist,
    );
    navigation.replace('LiveStage', { songId: id });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={store.settings.appearance === 'dark' ? 'light-content' : 'dark-content'} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.surface,
        }}
      >
        <Button variant="ghost" icon size={32} accessibilityLabel="Back" onPress={() => navigation.goBack()}>
          <ChevronLeftIcon size={16} color={colors.text} />
        </Button>
        <Text style={[fontHeading, { flex: 1, fontSize: 15, color: colors.text }]}>Add Song</Text>
        <Button variant="primary" onPress={handleSave} disabled={!canSave} fontSize={12}>
          Save
        </Button>
      </View>

      <View style={{ flex: 1, padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SOURCES.map((s) => {
            const active = s.value === source;
            return (
              <Button
                key={s.value}
                variant={active ? 'primary' : 'secondary'}
                fontSize={10}
                onPress={() => setSource(s.value)}
                style={{ flex: 1, paddingVertical: 5, gap: 5 }}
              >
                <SourceIcon value={s.value} color={active ? colors.accent : colors.text} />
                <Text style={{ fontSize: 10, color: active ? colors.accent : colors.text }}>{s.label}</Text>
              </Button>
            );
          })}
        </View>

        <Input value={title} onChangeText={setTitle} placeholder="Song title" fontSize={13} style={{ minHeight: 30 }} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input
            value={artist}
            onChangeText={setArtist}
            placeholder="Artist / songwriter"
            fontSize={13}
            style={{ minHeight: 30, flex: 1 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Button
              variant="secondary"
              icon
              size={30}
              accessibilityLabel="Key down"
              onPress={() => setKeyIdx((k) => (k + 11) % 12)}
            >
              <Text style={{ color: colors.text, fontSize: 14 }}>−</Text>
            </Button>
            <Tag mono style={{ minWidth: 28, justifyContent: 'center' }} textStyle={{ fontSize: 12 }}>
              {noteName(keyIdx, 'sharp')}
            </Tag>
            <Button
              variant="secondary"
              icon
              size={30}
              accessibilityLabel="Key up"
              onPress={() => setKeyIdx((k) => (k + 1) % 12)}
            >
              <Text style={{ color: colors.text, fontSize: 14 }}>+</Text>
            </Button>
          </View>
        </View>

        {source === 'pdf' && (
          <Dropzone text="Drop a PDF here or tap to browse. Rendered as-is — annotation-only, no transposition." />
        )}
        {source === 'musicxml' && (
          <Dropzone text="Drop a .musicxml / .mxl file here. Fully transposable once imported." />
        )}
        {source === 'type' && (
          <Input
            value={chart}
            onChangeText={setChart}
            mono
            multiline
            fontSize={12}
            placeholder={'G          D\nAmazing grace, how sweet the sound\nEm    C    G\nThat saved a wretch like me'}
            style={{ flex: 1, lineHeight: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SourceIcon({ value, color }: { value: SongSource; color: string }) {
  if (value === 'pdf') return <PdfFileIcon size={12} color={color} />;
  if (value === 'musicxml') return <XmlFileIcon size={12} color={color} />;
  return <TypeInIcon size={12} color={color} />;
}

function Dropzone({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.divider,
        borderRadius: radius.md,
        padding: 24,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <UploadIcon size={24} color={colors.text} strokeWidth={2} />
      <Text style={{ fontSize: 13, color: colors.text, opacity: 0.8, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}
