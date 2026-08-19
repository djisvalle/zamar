import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../ui/Button';
import { PitchPipeIcon, StageDarkIcon, TunerIcon, ZapIcon } from '../../ui/icons';

interface QuickToolsFabProps {
  open: boolean;
  onToggle: () => void;
}

// "Emergency quick-tools" — persistent FAB that fans out tuner, pitch pipe
// and a stage-dark mask (see the Interaction & state specs section of the
// design). The three tools are icon-only placeholders in the spec itself
// (no onClick handlers given), so they stay inert here too.
export function QuickToolsFab({ open, onToggle }: QuickToolsFabProps) {
  const { colors } = useTheme();
  return (
    <View style={{ position: 'absolute', right: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {open && (
        <>
          <Button variant="secondary" icon size={44} accessibilityLabel="Tuner">
            <TunerIcon size={17} color={colors.text} />
          </Button>
          <Button variant="secondary" icon size={44} accessibilityLabel="Pitch pipe">
            <PitchPipeIcon size={17} color={colors.text} />
          </Button>
          <Button variant="secondary" icon size={44} accessibilityLabel="Stage-dark mask">
            <StageDarkIcon size={17} color={colors.text} />
          </Button>
        </>
      )}
      <Button
        variant="primary"
        icon
        size={48}
        accessibilityLabel="Quick tools"
        onPress={onToggle}
        style={{ borderRadius: 24, backgroundColor: colors.surface }}
      >
        <ZapIcon size={20} color={colors.accent} />
      </Button>
    </View>
  );
}
