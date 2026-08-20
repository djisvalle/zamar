import React, { useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTheme } from '../../theme/ThemeContext';
import { Song } from '../../data/types';
import { ChevronLeftIcon, ChevronRightIcon, LibraryIcon, SetlistIcon, SettingsIcon, XIcon } from '../../ui/icons';
import { MenuDrawerLibraryTab } from './MenuDrawerLibraryTab';
import { MenuDrawerSetlistTab } from './MenuDrawerSetlistTab';
import { MenuDrawerSettingsTab } from './MenuDrawerSettingsTab';

type RailTab = 'library' | 'setlist' | 'settings';

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  song?: Song;
  onNavigateSong: (id: string) => void;
  onCreateSong: () => void;
  onOpenSetlistDetails: (id: string) => void;
}

const TAB_LABEL: Record<RailTab, string> = {
  library: 'Library',
  setlist: 'Setlist',
  settings: 'Settings',
};

export function MenuDrawer({ visible, onClose, song, onNavigateSong, onCreateSong, onOpenSetlistDetails }: MenuDrawerProps) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<RailTab | null>(null);

  useEffect(() => {
    if (visible) setTab(null);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 flex-row bg-black/45" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="h-full w-[78%] overflow-hidden rounded-r-2xl bg-card"
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View className="flex-row items-center justify-between border-b border-border px-3 py-2.5">
              <View className="flex-row items-center gap-1.5">
                {tab !== null && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    hitSlop={8}
                    onPress={() => setTab(null)}
                    accessibilityLabel="Back to menu"
                  >
                    <ChevronLeftIcon size={16} color={colors.text} />
                  </Button>
                )}
                <Text className="text-[14px] font-semibold text-foreground">{tab === null ? 'Menu' : TAB_LABEL[tab]}</Text>
              </View>
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

            <View className="min-w-0 flex-1">
              {tab === null && (
                <View className="gap-1 p-2.5">
                  <MenuListItem label="Library" onPress={() => setTab('library')}>
                    <LibraryIcon size={18} color={colors.text} />
                  </MenuListItem>
                  <MenuListItem label="Setlist" onPress={() => setTab('setlist')}>
                    <SetlistIcon size={18} color={colors.text} />
                  </MenuListItem>
                  <MenuListItem label="Settings" onPress={() => setTab('settings')}>
                    <SettingsIcon size={18} color={colors.text} />
                  </MenuListItem>
                </View>
              )}
              {tab === 'library' && (
                <MenuDrawerLibraryTab onNavigateSong={onNavigateSong} onCreateSong={onCreateSong} />
              )}
              {tab === 'setlist' && <MenuDrawerSetlistTab onOpenSetlistDetails={onOpenSetlistDetails} />}
              {tab === 'settings' && <MenuDrawerSettingsTab song={song} />}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuListItem({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-lg border border-border px-3 py-3 active:bg-accent/40"
    >
      {children}
      <Text className="flex-1 text-[15px] font-medium text-foreground">{label}</Text>
      <ChevronRightIcon size={16} color={colors.textMuted} />
    </Pressable>
  );
}
