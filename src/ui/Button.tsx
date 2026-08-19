import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading, radius, space } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  icon?: boolean;
  size?: number;
  fontSize?: number;
  active?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// Mirrors .btn / .btn-primary / .btn-secondary / .btn-ghost / .btn-icon from
// styles.css — outlined, never filled; icon buttons are square.
export function Button({
  children,
  onPress,
  variant = 'secondary',
  icon = false,
  size = 36,
  fontSize = 14,
  active,
  disabled,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const borderColor =
    variant === 'primary' || active
      ? colors.accent
      : variant === 'secondary'
      ? colors.divider
      : 'transparent';
  const textColor = variant === 'ghost' || variant === 'primary' || active ? colors.accent : colors.text;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor,
          borderWidth: variant === 'ghost' ? 0 : 1,
          paddingHorizontal: icon ? 0 : space[3] * 1.2,
          paddingVertical: icon ? 0 : space[2],
          width: icon ? size : undefined,
          height: icon ? size : undefined,
          borderRadius: radius.md,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          backgroundColor: pressed
            ? colors.accentTint(variant === 'primary' || active ? 22 : 10)
            : 'transparent',
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[fontHeading, { color: textColor, fontSize }]} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{children}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
