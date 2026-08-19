import React, { createContext, useContext, useMemo } from 'react';
import { Appearance, makeTheme, ThemeColors } from './tokens';

interface ThemeContextValue {
  colors: ThemeColors;
  appearance: Appearance;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  appearance,
  children,
}: {
  appearance: Appearance;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ colors: makeTheme(appearance), appearance }), [appearance]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
