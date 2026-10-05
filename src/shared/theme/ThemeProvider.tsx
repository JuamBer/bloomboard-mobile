import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { DEFAULT_PALETTE } from './palettes';
import { getTheme, type Theme } from './theme';
import { useThemeStore } from './theme.store';

const ThemeContext = createContext<Theme>(getTheme(DEFAULT_PALETTE, 'light'));

/**
 * Light or dark from the member's ThemeMode (or the device, for SYSTEM), on
 * the house palette. Orthogonal axes, as on the web: the palette would come
 * from a company, the mode from the person.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const device = useColorScheme();
  const scheme =
    mode === 'SYSTEM'
      ? device === 'dark'
        ? 'dark'
        : 'light'
      : mode === 'DARK'
        ? 'dark'
        : 'light';
  return (
    <ThemeContext.Provider value={getTheme(DEFAULT_PALETTE, scheme)}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): Theme => useContext(ThemeContext);

// StyleSheet.create's own constraint, so a factory is checked like a literal.
type AnyStyles = StyleSheet.NamedStyles<any>;

/**
 * A hook returning a component's styles for the active theme. Each theme's
 * stylesheet is built once and cached by the theme's identity (there are ten,
 * built once), so a render costs a WeakMap lookup.
 *
 *   const useStyles = makeStyles((t) => ({
 *     card: { backgroundColor: t.colors.surface, borderColor: t.fg(0.1) },
 *   }));
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T> | AnyStyles>(
  factory: (theme: Theme) => T & AnyStyles,
): () => T {
  const cache = new WeakMap<Theme, T>();
  return function useStyles() {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create<T>(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
