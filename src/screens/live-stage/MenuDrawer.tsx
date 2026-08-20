import React, { useState } from 'react';
import { Modal, Pressable, SafeAreaView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTheme } from '../../theme/ThemeContext';
import { Song } from '../../data/types';
import { LibraryIcon, SetlistIcon, SettingsIcon, XIcon } from '../../ui/icons';
import { MenuDrawerLibraryTab } from './MenuDrawerLibraryTab';
import { MenuDrawerSetlistTab } from './MenuDrawerSetlistTab';
import { MenuDrawerSettingsTab } from './MenuDrawerSettingsTab';

type RailTab = 'library' | 'setlist' | 'settings';

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  song: Song;
  onNavigateSong: (id: string) => void;
  onCreateSong: () => void;
  onEditSong: (id: string) => void;
}

export function MenuDrawer({ visible, onClose, song, onNavigateSong, onCreateSong, onEditSong }: MenuDrawerProps) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<RailTab>('library');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 flex-row bg-black/45" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="h-full w-[78%] flex-row overflow-hidden rounded-r-2xl bg-card"
        >
          <SafeAreaView className="flex-1 flex-row">
            <View className="w-24 gap-3.5 border-r border-border px-1.5 py-2.5">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-[14px] font-semibold text-foreground">Menu</Text>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  hitSlop={8}
                  onPress={onClose}
                  accessibilityLabel="Close"
                >
                  <XIcon size={11} color={colors.text} />
                </Button>
              </View>
              <View className="gap-1.5">
                <RailButton active={tab === 'library'} label="Library" onPress={() => setTab('library')}>
                  <LibraryIcon size={18} color={tab === 'library' ? colors.accent : colors.text} />
                </RailButton>
                <RailButton active={tab === 'setlist'} label="Setlist" onPress={() => setTab('setlist')}>
                  <SetlistIcon size={18} color={tab === 'setlist' ? colors.accent : colors.text} />
                </RailButton>
                <RailButton active={tab === 'settings'} label="Settings" onPress={() => setTab('settings')}>
                  <SettingsIcon size={18} color={tab === 'settings' ? colors.accent : colors.text} />
                </RailButton>
              </View>
            </View>

            <View className="min-w-0 flex-1">
              {tab === 'library' && (
                <MenuDrawerLibraryTab onNavigateSong={onNavigateSong} onCreateSong={onCreateSong} onEditSong={onEditSong} />
              )}
              {tab === 'setlist' && <MenuDrawerSetlistTab onNavigateSong={onNavigateSong} />}
              {tab === 'settings' && <MenuDrawerSettingsTab song={song} />}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RailButton({
  active,
  label,
  onPress,
  children,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} className={`items-center gap-1 rounded-md px-1 py-2 ${active ? 'bg-accent' : 'bg-transparent'}`}>
      {children}
      <Text className={`text-[10.5px] ${active ? 'font-medium text-primary' : 'text-foreground/65'}`}>{label}</Text>
    </Pressable>
  );
}
