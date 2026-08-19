import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontHeading, radius } from '../theme/tokens';

export interface SegOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

// Mirrors .seg / .seg-opt from styles.css: bordered container, active option
// gets an accent inset ring + accent text, inactive sits at 0.75 opacity.
// The active ring is drawn as an absolutely-positioned overlay (matching the
// CSS inset box-shadow) so it never perturbs layout the way a real border
// toggling on/off would.
export function Segmented<T extends string>({ options, value, onChange, fontSize = 12, style }: SegmentedProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: colors.divider,
          borderRadius: radius.md,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderLeftWidth: i === 0 ? 0 : 1,
              borderLeftColor: colors.divider,
            }}
          >
            {active && (
              <View
                pointerEvents="none"
                style={{ position: 'absolute', inset: 0, borderWidth: 1, borderColor: colors.accent }}
              />
            )}
            <Text
              style={[
                fontHeading,
                {
                  fontSize,
                  color: active ? colors.accent : colors.text,
                  opacity: active ? 1 : 0.75,
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
