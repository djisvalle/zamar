import React, { useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading } from '../theme/tokens';
import { useStore } from '../data/store';
import { noteName } from '../music/notes';
import { RootStackParamList } from '../navigation/types';
import { EditIcon, PitchPipeIcon, ZapIcon } from '../ui/icons';
import { ChordGrid } from './live-stage/ChordGrid';
import { SheetView } from './live-stage/SheetView';
import { MenuDrawer } from './live-stage/MenuDrawer';
import { MusicToolsPanel } from './live-stage/MusicToolsPanel';
import { ViewMode } from './live-stage/liveStageTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveStage'>;

// Single persistent shell used for every screen size and for the app's home
// state — there is no separate "phone" vs. "control room" component to pick
// between; the Menu drawer and Music Tools panel are the only things that
// toggle over the main display. With no songId (fresh launch, or navigating
// here directly) the same shell renders with an empty body instead of
// pre-loading a song.
export function LiveStageScreen({ route, navigation }: Props) {
  const songId = route.params?.songId;
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors } = useTheme();
  const store = useStore();
  const song = songId ? store.songs[songId] : undefined;

  const [view, setView] = useState<ViewMode>('chord');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const activeSetlist = store.setlists.find((s) => s.id === store.activeSetlistId);
  const setlistSongIds = activeSetlist?.songIds ?? [];
  const setlistIndex = songId ? setlistSongIds.indexOf(songId) : -1;
  // Swiping only applies while the caller explicitly navigated here "inside" the
  // active setlist (Start, the Active Setlist FAB, or a prior swipe) — arriving
  // via the Library tab etc. never sets setlistContext, so browsing a song that
  // happens to also be in the active setlist doesn't unexpectedly enable swipe.
  const inSetlistContext = route.params?.setlistContext === true && setlistIndex !== -1;
  const canSwipePrev = inSetlistContext && setlistIndex > 0;
  const canSwipeNext = inSetlistContext && setlistIndex < setlistSongIds.length - 1;

  const goToSetlistSong = (index: number) => {
    const id = setlistSongIds[index];
    if (!id) return;
    store.setActiveSongId(id);
    navigation.replace('LiveStage', { songId: id, setlistContext: true });
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onEnd((e) => {
      if (!inSetlistContext) return;
      if (e.translationX < 0 && canSwipeNext) goToSetlistSong(setlistIndex + 1);
      else if (e.translationX > 0 && canSwipePrev) goToSetlistSong(setlistIndex - 1);
    });

  const liveKey = song
    ? noteName(((song.keyIdx + song.transposeSemi) % 12 + 12) % 12, store.settings.enharmonic)
    : null;
  const sourceLabel = song
    ? song.sheetFileName
      ? `${song.sheetFileName} — ${song.sheetMode === 'pdf' ? 'static' : 'transposable'}`
      : song.sheetMode === 'pdf'
      ? 'Uploaded PDF — static'
      : 'MusicXML — transposable'
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={store.settings.appearance === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Compact bar: Menu, title, edit (opens the full Edit Song screen) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: isTablet ? 54 : 48,
          paddingHorizontal: isTablet ? 18 : 10,
          paddingVertical: 4,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.surface,
        }}
      >
        <Button variant="ghost" onPress={() => setMenuOpen(true)} className="h-9 rounded-full px-3">
          <Text className="text-[14px] font-medium text-foreground">Menu</Text>
        </Button>
        <Text
          style={[
            fontHeading,
            { flex: 1, minWidth: 0, fontSize: 16, color: song ? colors.text : colors.textMuted, textAlign: 'center' },
          ]}
          numberOfLines={1}
        >
          {song ? song.title : 'No Song Selected'}
        </Text>
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel="Edit song"
          disabled={!song}
          onPress={() => song && navigation.navigate('AddSong', { mode: 'edit', songId: song.id })}
          className="h-9 w-9 rounded-full"
        >
          <EditIcon size={18} color={colors.text} />
        </Button>
      </View>

      {song ? (
        <>
          {/* Song header: title/subtitle, view tabs, live key */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 10,
              paddingHorizontal: isTablet ? 28 : 18,
              paddingTop: isTablet ? 22 : 16,
              paddingBottom: 4,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[fontHeading, { fontSize: 19, fontWeight: '700', color: colors.text, lineHeight: 22 }]} numberOfLines={1}>
                {song.title}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>
                {song.artist} · {sourceLabel}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ViewTab label="Chord Chart" active={view === 'chord'} onPress={() => setView('chord')} />
                <View style={{ width: 1, height: 12, backgroundColor: colors.divider }} />
                <ViewTab label="Sheet Music" active={view === 'sheet'} onPress={() => setView('sheet')} />
              </View>
              <Text style={{ fontSize: 12, color: colors.accent }}>Key of {liveKey}</Text>
              {inSetlistContext && (
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Song {setlistIndex + 1} of {setlistSongIds.length}
                </Text>
              )}
            </View>
          </View>

          <GestureDetector gesture={swipeGesture}>
            <View style={{ flex: 1 }}>
              {view === 'chord' ? (
                <ChordGrid
                  chart={song.chart}
                  transposeSemi={song.transposeSemi}
                  capo={song.capo}
                  enharmonic={store.settings.enharmonic}
                />
              ) : (
                <SheetView
                  song={song}
                  sourceLabel={sourceLabel}
                  enharmonic={store.settings.enharmonic}
                  showNoteNames={store.settings.showNoteNames}
                  onUpdateSong={(patch) => store.updateSong(song.id, patch)}
                />
              )}
              <MusicToolsPanel
                open={toolsOpen}
                onToggle={() => setToolsOpen((v) => !v)}
                song={song}
                onUpdateSong={(patch) => store.updateSong(song.id, patch)}
                enharmonic={store.settings.enharmonic}
                onSetEnharmonic={store.setEnharmonic}
                showNoteNames={store.settings.showNoteNames}
                onSetShowNoteNames={store.setShowNoteNames}
              />
              {store.activeSetlistId && (
                <Button
                  variant="secondary"
                  size="icon"
                  accessibilityLabel="Active setlist"
                  onPress={() => {
                    const targetId = store.activeSongId ?? activeSetlist?.songIds[0];
                    if (targetId) navigation.replace('LiveStage', { songId: targetId, setlistContext: true });
                  }}
                  className="absolute bottom-5 left-4 h-14 w-14 rounded-full"
                >
                  <ZapIcon size={22} color={colors.accent} />
                </Button>
              )}
            </View>
          </GestureDetector>
        </>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 6 }}>
            <Text style={[fontHeading, { fontSize: 16, color: colors.text }]}>No song selected</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
              Open the Menu to pick a song from your library or a setlist.
            </Text>
          </View>
          <Button
            variant="secondary"
            size="icon"
            disabled
            accessibilityLabel="Music tools"
            className="absolute bottom-5 right-4 h-[72px] w-[72px] rounded-full"
          >
            <PitchPipeIcon size={30} color={colors.accent} />
          </Button>
          {store.activeSetlistId && (
            <Button
              variant="secondary"
              size="icon"
              accessibilityLabel="Active setlist"
              onPress={() => {
                const targetId = store.activeSongId ?? activeSetlist?.songIds[0];
                if (targetId) navigation.replace('LiveStage', { songId: targetId, setlistContext: true });
              }}
              className="absolute bottom-5 left-4 h-14 w-14 rounded-full"
            >
              <ZapIcon size={22} color={colors.accent} />
            </Button>
          )}
        </View>
      )}

      <MenuDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        song={song}
        onNavigateSong={(id) => {
          setMenuOpen(false);
          navigation.replace('LiveStage', { songId: id });
        }}
        onCreateSong={() => {
          setMenuOpen(false);
          navigation.navigate('AddSong', { mode: 'create' });
        }}
        onOpenSetlistDetails={(id) => {
          setMenuOpen(false);
          navigation.navigate('SetlistDetails', { setlistId: id });
        }}
      />
    </SafeAreaView>
  );
}

function ViewTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Text
        style={[
          fontHeading,
          {
            fontSize: 12,
            fontWeight: '600',
            color: active ? colors.accent : colors.text,
            opacity: active ? 1 : 0.55,
            paddingBottom: 2,
            borderBottomWidth: 2,
            borderBottomColor: active ? colors.accent : 'transparent',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
