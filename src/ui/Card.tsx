import React from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading, radius, space } from '../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  row?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Mirrors .card from styles.css — bordered, unfilled surface.
export function Card({ children, row, style }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: row ? 'row' : 'column',
          alignItems: row ? 'center' : undefined,
          gap: space[2],
          padding: space[3],
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.divider,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return (
    <Text style={[fontHeading, { fontSize: 17, color: colors.text }, style]} numberOfLines={1}>
      {children}
    </Text>
  );
}

export function CardMeta({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
      {children}
    </Text>
  );
}
