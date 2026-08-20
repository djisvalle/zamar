// Classical design-system tokens, ported from
// project/_ds/classical-.../styles.css — with the app-wide override from the
// spec's assumptions: sans-serif system type in place of Cormorant/Lora, and
// a "Stage Dark" scoped re-point of --color-bg/surface/text/divider/accent
// (see StageChart Design Spec.dc.html, Component.frameStyle()).
import { Platform } from 'react-native';

export const space = {
  1: 4.6,
  2: 9.2,
  3: 13.8,
  4: 18.4,
  6: 27.6,
  8: 36.8,
} as const;

export const radius = {
  sm: 2,
  md: 4,
  lg: 7,
} as const;

// Shared ramps — identical in both appearances (only bg/surface/text/divider/
// accent get re-pointed for Stage Dark).
export const neutral = {
  100: '#f8f4f4',
  200: '#eae7e7',
  300: '#d7d3d3',
  400: '#bab6b6',
  500: '#9b9797',
  600: '#7d7979',
  700: '#605d5d',
  800: '#444141',
  900: '#2d2b2b',
} as const;

export const accentLight = {
  100: '#fff3e4',
  200: '#ffe3bf',
  300: '#facb8d',
  400: '#e1ad66',
  500: '#c28d41',
  600: '#a06f24',
  700: '#7d5411',
  800: '#5a3b0a',
  900: '#3a270d',
} as const;

export type Appearance = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  divider: string;
  accent: string;
  accentTint: (pct: number) => string;
  overlay: string;
  neutral: typeof neutral;
  accentRamp: typeof accentLight;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Mirrors CSS color-mix(in srgb, <base> <pct>%, transparent).
function mix(hex: string, pct: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${pct / 100})`;
}

export function makeTheme(appearance: Appearance): ThemeColors {
  const isDark = appearance === 'dark';
  const text = isDark ? neutral[100] : '#201f1d';
  const accent = isDark ? accentLight[400] : '#b68235';
  return {
    bg: isDark ? '#10100f' : '#f6f4f0',
    surface: isDark ? '#191816' : '#eeece7',
    text,
    textMuted: isDark ? '#b9b3aa' : '#716d66',
    divider: isDark ? 'rgba(248, 244, 244, 0.16)' : 'rgba(32, 31, 29, 0.14)',
    accent,
    accentTint: (pct: number) => mix(accent, pct),
    overlay: mix(neutral[900], 55),
    neutral,
    accentRamp: accentLight,
  };
}

export const fontHeading = {
  fontWeight: '600' as const,
};

export const fontBody = {
  fontWeight: '400' as const,
};

// ui-monospace / "SF Mono" / Menlo, monospace — the one deliberate
// exception to the system sans, scoped to the chord-over-lyric grid.
export const fontMono = {
  fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const shadow = {
  lg: {
    shadowColor: '#2d2b2b',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
} as const;
