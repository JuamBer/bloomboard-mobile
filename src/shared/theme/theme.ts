import {
  PALETTES,
  type ColorPalette,
  type PaletteTokens,
  type SchemeName,
} from './palettes';

/** `#rrggbb` + alpha → `rgba()`. The web writes `text-foreground/50`; this is
 *  that `/50`, so opacity steps read the same in both codebases. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Status colours the web takes from Tailwind's scale, with an ink per mode
 *  that keeps text legible on the surface (the web's `text-red-600
 *  dark:text-red-400` pairs). */
const STATUS = {
  light: {
    danger: '#ef4444',
    dangerInk: '#dc2626',
    success: '#10b981',
    successInk: '#047857',
    warning: '#f59e0b',
    warningInk: '#b45309',
  },
  dark: {
    danger: '#ef4444',
    dangerInk: '#f87171',
    success: '#10b981',
    successInk: '#34d399',
    warning: '#f59e0b',
    warningInk: '#fbbf24',
  },
} as const;

export interface ThemeColors extends PaletteTokens {
  danger: string;
  dangerInk: string;
  success: string;
  successInk: string;
  warning: string;
  warningInk: string;
  /** The record trophy's yellow (amber-400) and what sits on it. */
  gold: string;
  onGold: string;
  /** Behind a sheet or dialog. */
  scrim: string;
}

export interface Theme {
  palette: ColorPalette;
  scheme: SchemeName;
  dark: boolean;
  colors: ThemeColors;
  /** foreground at an opacity, as is — the web's `foreground/N`. */
  fg: (a: number) => string;
  /** Muted text: `text-foreground/N`, lifted in light mode. */
  text: (a: number) => string;
  /** Hairlines: `border-foreground/N`, lifted in light mode. */
  line: (a: number) => string;
  /** Tinted fills: `bg-foreground/N`, lifted in light mode. */
  fill: (a: number) => string;
  /** accent ink at an opacity — the web's `brand-strong-10/20`. */
  ink: (a: number) => string;
}

/*
 * The UI is built on foreground + opacity steps tuned for dark mode, where a
 * white foreground at low alpha still reads. In light mode the same steps turn
 * near-black at a tiny alpha, so borders vanish and muted text drops below a
 * comfortable contrast. The web re-maps the steps that matter under
 * html:not(.dark) (index.css → "Light-mode contrast tuning"); these are the
 * same numbers.
 */
const LIGHT_TEXT: Record<number, number> = {
  0.15: 0.42,
  0.2: 0.46,
  0.25: 0.5,
  0.3: 0.55,
  0.35: 0.58,
  0.4: 0.6,
  0.45: 0.62,
  0.5: 0.68,
  0.55: 0.72,
  0.6: 0.74,
  0.7: 0.82,
};
const LIGHT_LINE: Record<number, number> = {
  0.05: 0.1,
  0.06: 0.11,
  0.08: 0.13,
  0.1: 0.15,
  0.15: 0.2,
  0.2: 0.26,
  0.3: 0.36,
};
const LIGHT_FILL: Record<number, number> = {
  0.02: 0.035,
  0.03: 0.05,
  0.04: 0.06,
  0.05: 0.06,
  0.06: 0.08,
  0.08: 0.1,
};

const build = (palette: ColorPalette, scheme: SchemeName): Theme => {
  const tokens = PALETTES[palette][scheme];
  return {
    palette,
    scheme,
    dark: scheme === 'dark',
    colors: {
      ...tokens,
      ...STATUS[scheme],
      gold: '#fbbf24',
      onGold: '#451a03',
      scrim: 'rgba(0, 0, 0, 0.55)',
    },
    fg: (a) => alpha(tokens.foreground, a),
    text: (a) =>
      alpha(tokens.foreground, scheme === 'light' ? (LIGHT_TEXT[a] ?? a) : a),
    line: (a) =>
      alpha(tokens.foreground, scheme === 'light' ? (LIGHT_LINE[a] ?? a) : a),
    fill: (a) =>
      alpha(tokens.foreground, scheme === 'light' ? (LIGHT_FILL[a] ?? a) : a),
    ink: (a) => alpha(tokens.accentInk, a),
  };
};

// Ten fixed objects, built once: their identity is what the style cache keys
// on, so a re-render never rebuilds a stylesheet.
const THEMES = new Map<string, Theme>();
export function getTheme(palette: ColorPalette, scheme: SchemeName): Theme {
  const key = `${palette}:${scheme}`;
  let theme = THEMES.get(key);
  if (!theme) {
    theme = build(palette, scheme);
    THEMES.set(key, theme);
  }
  return theme;
}

/** Radii — the web's tight scale: every control 8, cards and sheets 12. */
export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 8,
  '2xl': 12,
  '3xl': 16,
  full: 999,
} as const;

export const space = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

/**
 * Brand typefaces (Manual de marca p.6–8): IBM Plex Mono, always italic, for
 * display; IBM Plex Sans Arabic for everything readable. A custom font on
 * native has one family per weight, so weights are families here.
 */
export const fonts = {
  sans: 'IBMPlexSansArabic_400Regular',
  sansMedium: 'IBMPlexSansArabic_500Medium',
  sansSemiBold: 'IBMPlexSansArabic_600SemiBold',
  sansBold: 'IBMPlexSansArabic_700Bold',
  display: 'IBMPlexMono_700Bold_Italic',
  displayMedium: 'IBMPlexMono_500Medium_Italic',
  mono: 'IBMPlexMono_400Regular',
  monoBold: 'IBMPlexMono_700Bold',
} as const;
