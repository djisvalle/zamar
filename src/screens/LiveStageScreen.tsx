import React, { useState } from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading } from '../theme/tokens';
import { useStore } from '../data/store';
import { noteName } from '../music/notes';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { EditIcon, MenuIcon, SettingsIcon } from '../ui/icons';
import { ChordGrid } from './live-stage/ChordGrid';
import { SheetView } from './live-stage/SheetView';
import { SettingsSheet } from './live-stage/SettingsSheet';
import { MenuDrawer } from './live-stage/MenuDrawer';
import { QuickToolsFab } from './live-stage/QuickToolsFab';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveStage'>;

export function LiveStageScreen({ route, navigation }: Props) {
  const { songId } = route.params;
  const { colors } = useTheme();
  const store = useStore();
  const song = store.songs[songId];

  const [view, setView] = useState<'chord' | 'sheet'>('chord');
  const [editMode, setEditMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  if (!song) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text }}>Song not found.</Text>
      </SafeAreaView>
    );
  }

  const liveKey = noteName(((song.keyIdx + song.transposeSemi) % 12 + 12) % 12, store.settings.enharmonic);
  const sourceLabel = song.sheetFileName
    ? `${song.sheetFileName} — ${song.sheetMode === 'pdf' ? 'static' : 'transposable'}`
    : song.sheetMode === 'pdf'
    ? 'Uploaded PDF — static'
    : 'MusicXML — transposable';

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
        <Button variant="secondary" icon size={36} accessibilityLabel="Menu" onPress={() => setMenuOpen(true)}>
          <MenuIcon size={16} color={colors.text} />
        </Button>
        <Text
          style={[fontHeading, { flex: 1, minWidth: 0, fontSize: 14, color: colors.text }]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Segmented
          fontSize={11}
          value={view}
          onChange={setView}
          options={[
            { value: 'chord', label: 'Chord' },
            { value: 'sheet', label: 'Sheet' },
          ]}
        />
        <Button
          variant="secondary"
          icon
          size={36}
          active={editMode}
          accessibilityLabel="Edit"
          onPress={() => setEditMode((v) => !v)}
        >
          <EditIcon size={16} color={editMode ? colors.accent : colors.text} />
        </Button>
        <Button variant="secondary" icon size={36} accessibilityLabel="Settings" onPress={() => setSettingsOpen(true)}>
          <SettingsIcon size={17} color={colors.text} />
        </Button>
      </View>

      <View style={{ flex: 1 }}>
        {view === 'chord' ? (
          <ChordGrid
            chart={song.chart}
            transposeSemi={song.transposeSemi}
            enharmonic={store.settings.enharmonic}
            editMode={editMode}
            onChangeChart={(raw) => store.updateSong(song.id, { chart: raw })}
            autoScroll={song.autoScroll}
          />
        ) : (
          <SheetView
            song={song}
            sourceLabel={sourceLabel}
            liveKey={liveKey}
            enharmonic={store.settings.enharmonic}
            onUpdateSong={(patch) => store.updateSong(song.id, patch)}
          />
        )}
        <QuickToolsFab open={fabOpen} onToggle={() => setFabOpen((v) => !v)} />
      </View>

      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        song={song}
        onUpdateSong={(patch) => store.updateSong(song.id, patch)}
        appearance={store.settings.appearance}
        onSetAppearance={store.setAppearance}
        enharmonic={store.settings.enharmonic}
        onSetEnharmonic={store.setEnharmonic}
      />

      <MenuDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        song={song}
        onNavigateSong={(id) => {
          setMenuOpen(false);
          navigation.push('LiveStage', { songId: id });
        }}
        onCreateSong={() => {
          setMenuOpen(false);
          navigation.navigate('AddSong', { mode: 'create' });
        }}
        onEditSong={(id) => {
          setMenuOpen(false);
          navigation.navigate('AddSong', { mode: 'edit', songId: id });
        }}
      />
    </SafeAreaView>
  );
}
