import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../../theme/ThemeContext';
import { XIcon } from '../../ui/icons';
import { MusicXmlInstrument } from './MusicXmlViewer';

interface InstrumentFilterModalProps {
  visible: boolean;
  onClose: () => void;
  instruments: MusicXmlInstrument[];
  visibleIds: string[];
  onChangeVisibleIds: (next: string[]) => void;
}

export function InstrumentFilterModal({
  visible,
  onClose,
  instruments,
  visibleIds,
  onChangeVisibleIds,
}: InstrumentFilterModalProps) {
  const { colors } = useTheme();

  // At least one instrument must stay selected -- silently ignore any change
  // that would leave the score with nothing to show.
  function handleValueChange(next: string[]) {
    if (next.length === 0) return;
    onChangeVisibleIds(next);
  }

  function selectAll() {
    onChangeVisibleIds(instruments.map((inst) => inst.id));
  }

  function deselectAll() {
    if (instruments.length === 0) return;
    onChangeVisibleIds([instruments[0].id]);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/45 px-8" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-card p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[14px] font-semibold text-foreground">Instruments</Text>
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

          <View className="mb-3 flex-row gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onPress={selectAll}>
              <Text>Select All</Text>
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onPress={deselectAll}>
              <Text>Deselect All</Text>
            </Button>
          </View>

          <Separator className="mb-2" />

          <ScrollView className="max-h-80">
            <ToggleGroup
              type="multiple"
              value={visibleIds}
              onValueChange={handleValueChange}
              className="flex-col items-stretch gap-1"
            >
              {instruments.map((inst) => (
                <ToggleGroupItem key={inst.id} value={inst.id} className="w-full justify-start rounded-md px-3">
                  <Text>{inst.name}</Text>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
