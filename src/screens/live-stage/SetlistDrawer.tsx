import React from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fontHeading } from '../../theme/tokens';
import { Song } from '../../data/types';
import { noteName } from '../../music/notes';
import { Button } from '../../ui/Button';
import { Card, CardTitle, CardMeta } from '../../ui/Card';
import { GripIcon, PlusIcon } from '../../ui/icons';

interface SetlistDrawerProps {
  visible: boolean;
  onClose: () => void;
  songs: Song[];
  onPressSong: (id: string) => void;
  onAddSong: () => void;
}

export function SetlistDrawer({ visible, onClose, songs, onPressSong, onAddSong }: SetlistDrawerProps) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, flexDirection: 'row' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '78%',
            height: '100%',
            backgroundColor: colors.surface,
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
            overflow: 'hidden',
          }}
        >
          <SafeAreaView style={{ flex: 1, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[fontHeading, { fontSize: 16, color: colors.text }]}>Songs</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Button variant="secondary" icon size={34} accessibilityLabel="Add song to setlist" onPress={onAddSong}>
                  <PlusIcon size={16} color={colors.text} />
                </Button>
                <Button variant="ghost" icon size={34} accessibilityLabel="Close" onPress={onClose}>
                  <Text style={{ color: colors.accent, fontSize: 16 }}>✕</Text>
                </Button>
              </View>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
              {songs.map((song) => (
                <Pressable key={song.id} onPress={() => onPressSong(song.id)}>
                  <Card row style={{ paddingVertical: 10 }}>
                    <GripIcon size={14} color={colors.text} strokeWidth={2} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <CardTitle style={{ fontSize: 14 }}>{song.title}</CardTitle>
                      <CardMeta>Key of {noteName(song.keyIdx, 'sharp')}</CardMeta>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
