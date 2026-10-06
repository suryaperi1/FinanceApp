import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette, type Palette } from './colors';

type Scheme = 'light' | 'dark';

interface ThemeValue {
  scheme: Scheme;
  colors: Palette;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Follows the device color scheme until the user taps "Toggle theme", after
 * which the explicit choice wins for the rest of the session.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [override, setOverride] = useState<Scheme | null>(null);
  const scheme = override ?? system;

  const value = useMemo<ThemeValue>(
    () => ({
      scheme,
      colors: scheme === 'dark' ? darkPalette : lightPalette,
      toggle: () => setOverride(scheme === 'dark' ? 'light' : 'dark'),
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
