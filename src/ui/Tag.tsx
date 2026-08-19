import React from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { fontMono } from '../theme/tokens';

type Variant = 'outline' | 'neutral' | 'accent';

interface TagProps {
  children: React.ReactNode;
  variant?: Variant;
  mono?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

// Mirrors .tag / .tag-outline / .tag-neutral / .tag-accent from styles.css.
export function Tag({ children, variant = 'outline', mono, style, textStyle }: TagProps) {
  const { colors } = useTheme();

  const bg =
    variant === 'neutral' ? colors.neutral[100] : variant === 'accent' ? colors.accentRamp[100] : 'transparent';
  const fg =
    variant === 'neutral' ? colors.neutral[800] : variant === 'accent' ? colors.accentRamp[800] : colors.accent;
  const borderColor = variant === 'outline' ? colors.accent : 'transparent';

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: radius.md * 0.75,
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor,
        },
        style,
      ]}
    >
      <Text style={[mono ? fontMono : null, { fontSize: 11, letterSpacing: 0.2, color: fg }, textStyle]}>
        {children}
      </Text>
    </View>
  );
}
