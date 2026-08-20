import React, { useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading, radius } from '../theme/tokens';
import { useStore } from '../data/store';
import { deriveSheetMode } from '../data/sheetMode';
import { SongSource } from '../data/types';
import { noteName } from '../music/notes';
import {
  pickAndCopySheetFile,
  discardCopiedSheetFile,
  PDF_MIME_TYPES,
  MUSICXML_MIME_TYPES,
} from '../data/importSheetFile';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tag } from '../ui/Tag';
import { ChevronLeftIcon, PdfFileIcon, StarIcon, TypeInIcon, UploadIcon, XmlFileIcon } from '../ui/icons';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSong'>;

const SOURCES: { value: SongSource; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'musicxml', label: 'MusicXML' },
  { value: 'type', label: 'Type it in' },
];

export function AddSongScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const store = useStore();

  const isEdit = route.params.mode === 'edit';
  const existing = isEdit ? store.songs[route.params.songId] : undefined;

  // The song's originally-saved file, captured once up front. `existing`
  // doesn't change during this screen's lifetime, so this is safe as a plain
  // const rather than state. Used to guard against discarding the live,
  // still-referenced-by-the-store file before a save actually happens, and
  // to know which file to discard once it's genuinely been superseded.
  const originalSheetFileUri = existing?.sheetFileUri ?? null;

  const [source, setSource] = useState<SongSource>(existing?.source ?? 'type');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [artist, setArtist] = useState(existing?.artist ?? '');
  const [keyIdx, setKeyIdx] = useState(existing?.keyIdx ?? 0);
  const [chart, setChart] = useState(existing?.chart ?? '');
  const [sheetFileUri, setSheetFileUri] = useState<string | null>(existing?.sheetFileUri ?? null);
  const [sheetFileName, setSheetFileName] = useState<string | null>(existing?.sheetFileName ?? null);
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  if (isEdit && !existing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text }}>Song not found.</Text>
      </SafeAreaView>
    );
  }

  const fileReady = source === 'type' || Boolean(sheetFileUri);
  const canSave = title.trim().length > 0 && fileReady;

  async function handlePickFile() {
    setPickError(null);
    setPicking(true);
    try {
      const picked = await pickAndCopySheetFile(source === 'pdf' ? PDF_MIME_TYPES : MUSICXML_MIME_TYPES);
      if (picked) {
        // The previous pick's copy in the document directory is now orphaned,
        // so drop it rather than leaking it — UNLESS it's still the song's
        // original, already-saved file (edit mode): that one is still
        // referenced by the store until a save actually happens, so it must
        // survive until then (see originalSheetFileUri above).
        if (sheetFileUri !== originalSheetFileUri) discardCopiedSheetFile(sheetFileUri);
        setSheetFileUri(picked.uri);
        setSheetFileName(picked.name);
      }
    } catch {
      setPickError('Could not import that file. Please try again.');
    } finally {
      setPicking(false);
    }
  }

  function handleSave() {
    if (!canSave) return;
    const input = {
      title: title.trim(),
      artist: artist.trim(),
      keyIdx,
      source,
      chart: source === 'type' ? chart : '',
      sheetFileUri: source === 'type' ? null : sheetFileUri,
      sheetFileName: source === 'type' ? null : sheetFileName,
    };
    if (isEdit && existing) {
      store.updateSong(existing.id, { ...input, favorite, sheetMode: deriveSheetMode(source) });
      // The song's record now points at whatever file it should (possibly
      // unchanged, possibly the freshly-picked replacement). If the original
      // file was superseded, nothing references it anymore, so it's now safe
      // to discard — this is the one place that's allowed to delete it.
      if (originalSheetFileUri && sheetFileUri !== originalSheetFileUri) {
        discardCopiedSheetFile(originalSheetFileUri);
      }
      navigation.goBack();
    } else {
      const id = store.addSong(input);
      if (favorite) store.updateSong(id, { favorite: true });
      navigation.replace('LiveStage', { songId: id });
    }
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
        <Text style={[fontHeading, { flex: 1, fontSize: 15, color: colors.text }]}>
          {isEdit ? 'Edit Song' : 'Add Song'}
        </Text>
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
                onPress={() => {
                  if (s.value === source) return;
                  // Switching tabs abandons whatever was picked for the old
                  // tab; delete its copy so it doesn't linger on disk forever.
                  // Exception: in edit mode, the old tab may still be showing
                  // the song's original, already-saved file rather than a
                  // fresh pick — that one is still referenced by the store
                  // until a save happens, so it must not be deleted here.
                  if (sheetFileUri !== originalSheetFileUri) discardCopiedSheetFile(sheetFileUri);
                  setSource(s.value);
                  if (isEdit && existing && s.value === existing.source) {
                    // Returning to the tab that matches the song's actual
                    // saved source — repopulate from the original file
                    // rather than nulling it out, so the user isn't locked
                    // out of saving just for navigating back to where they
                    // started.
                    setSheetFileUri(originalSheetFileUri);
                    setSheetFileName(existing.sheetFileName);
                  } else {
                    setSheetFileUri(null);
                    setSheetFileName(null);
                  }
                  setPickError(null);
                }}
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
            <Button
              variant={favorite ? 'primary' : 'secondary'}
              icon
              size={30}
              accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
              onPress={() => setFavorite((f) => !f)}
            >
              <StarIcon size={14} color={colors.accent} filled={favorite} />
            </Button>
          </View>
        </View>

        {source === 'pdf' && (
          <Dropzone
            text={
              sheetFileName
                ? `Selected: ${sheetFileName}`
                : picking
                ? 'Opening file browser…'
                : 'Tap to choose a PDF. Rendered as-is — annotation-only, no transposition.'
            }
            onPress={handlePickFile}
            disabled={picking}
          />
        )}
        {source === 'musicxml' && (
          <Dropzone
            text={
              sheetFileName
                ? `Selected: ${sheetFileName}`
                : picking
                ? 'Opening file browser…'
                : 'Tap to choose a .musicxml / .mxl file. Fully transposable once imported.'
            }
            onPress={handlePickFile}
            disabled={picking}
          />
        )}
        {pickError && (source === 'pdf' || source === 'musicxml') && (
          <Text style={{ fontSize: 12, color: colors.text, opacity: 0.75 }}>{pickError}</Text>
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

function Dropzone({ text, onPress, disabled }: { text: string; onPress?: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.divider,
        borderRadius: radius.md,
        padding: 24,
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <UploadIcon size={24} color={colors.text} strokeWidth={2} />
      <Text style={{ fontSize: 13, color: colors.text, opacity: 0.8, textAlign: 'center' }}>{text}</Text>
    </Pressable>
  );
}
