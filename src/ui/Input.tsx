import React from 'react';
import { StyleProp, TextInput, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontMono, radius } from '../theme/tokens';

interface InputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  mono?: boolean;
  fontSize?: number;
  style?: StyleProp<ViewStyle & TextStyle>;
}

// Mirrors .input from styles.css.
export function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  mono,
  fontSize = 14,
  style,
}: InputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        {
          minHeight: multiline ? 90 : 36,
          paddingHorizontal: 10,
          paddingVertical: 6,
          fontSize,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.divider,
          borderRadius: radius.md,
        },
        mono && fontMono,
        style,
      ]}
    />
  );
}
