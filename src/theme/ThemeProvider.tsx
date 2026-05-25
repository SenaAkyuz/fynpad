import { createContext, useMemo, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';

import { useAppStore, type ThemeMode } from '@/stores/useAppStore';
import {
  blur,
  darkColors,
  lightColors,
  radii,
  shadows,
  spacing,
  typography,
  type ThemeColors,
} from '@/theme/tokens';

export type ResolvedMode = 'light' | 'dark';

export type Theme = {
  /** Kullanıcının seçimi: 'light' | 'dark' */
  mode: ThemeMode;
  /** uygulanan tema (mode ile aynı; system-follow kaldırıldı) */
  resolved: ResolvedMode;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  blur: typeof blur;
  setMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  const resolved: ResolvedMode = mode;

  const value = useMemo<Theme>(
    () => ({
      mode,
      resolved,
      colors: resolved === 'dark' ? darkColors : lightColors,
      typography,
      spacing,
      radii,
      shadows,
      blur,
      setMode: setThemeMode,
    }),
    [mode, resolved, setThemeMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}
