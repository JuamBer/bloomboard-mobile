/**
 * The brand palettes, token for token the web app's (bloomboard-frontend
 * src/index.css). Every palette declares the same contract for light and dark:
 *
 *   accent          fill for primary buttons / active states
 *   accentHover     its pressed step
 *   accentContrast  text drawn ON accent
 *   accentInk       accent used as text/icon/border ON a surface (≥4.5:1)
 *   background surface field popover card foreground
 *
 * `accent` and `accentInk` are deliberately two tokens: a pale cyan reads
 * beautifully as a button fill but is illegible as text on white. All ten
 * palette × mode combinations were contrast-audited for the web; change a hex
 * here only together with index.css (specs/design-system.md).
 */
export type ColorPalette = 'BLOOM' | 'SUNSET' | 'LAVENDER' | 'PULSE' | 'MENTAL';
export type SchemeName = 'light' | 'dark';

export interface PaletteTokens {
  background: string;
  surface: string;
  field: string;
  popover: string;
  card: string;
  foreground: string;
  accent: string;
  accentHover: string;
  accentContrast: string;
  accentInk: string;
  accentLight: string;
}

export const PALETTES: Record<
  ColorPalette,
  Record<SchemeName, PaletteTokens>
> = {
  // Bloom — the house palette: digital blues (Manual de marca p.4).
  BLOOM: {
    light: {
      background: '#f0f6fc',
      surface: '#ffffff',
      field: '#e8f1fa',
      popover: '#ffffff',
      card: '#ffffff',
      foreground: '#020c1c',
      accent: '#1345a8',
      accentHover: '#0f3785',
      accentContrast: '#ffffff',
      accentInk: '#1345a8',
      accentLight: '#80cff5',
    },
    dark: {
      background: '#020c1c',
      surface: '#061426',
      field: '#0a1c33',
      popover: '#0c2138',
      card: '#0e2440',
      foreground: '#ffffff',
      accent: '#80cff5',
      accentHover: '#a5def8',
      accentContrast: '#020c1c',
      accentInk: '#80cff5',
      accentLight: '#cce3ff',
    },
  },
  // Sunset — peach / teal.
  SUNSET: {
    light: {
      background: '#fdf6f1',
      surface: '#ffffff',
      field: '#faeade',
      popover: '#ffffff',
      card: '#ffffff',
      foreground: '#2b1b04',
      accent: '#00707e',
      accentHover: '#005c67',
      accentContrast: '#ffffff',
      accentInk: '#00707e',
      accentLight: '#97d0c7',
    },
    dark: {
      background: '#140d04',
      surface: '#1d1409',
      field: '#251b0e',
      popover: '#2a1f11',
      card: '#2f2313',
      foreground: '#fdf3ea',
      accent: '#00abbf',
      accentHover: '#2cc4d6',
      accentContrast: '#04191c',
      accentInk: '#4fd0e0',
      accentLight: '#f4c0a8',
    },
  },
  // Lavender — violet / olive.
  LAVENDER: {
    light: {
      background: '#faf4fd',
      surface: '#ffffff',
      field: '#f3e8fb',
      popover: '#ffffff',
      card: '#ffffff',
      foreground: '#2b0328',
      accent: '#7b3fb8',
      accentHover: '#67319e',
      accentContrast: '#ffffff',
      accentInk: '#7b3fb8',
      accentLight: '#d1c883',
    },
    dark: {
      background: '#150318',
      surface: '#1e0a23',
      field: '#26102c',
      popover: '#2b1332',
      card: '#311738',
      foreground: '#f8eefc',
      accent: '#c68ff4',
      accentHover: '#d6aff7',
      accentContrast: '#1b0620',
      accentInk: '#c68ff4',
      accentLight: '#c0bd00',
    },
  },
  // Pulse — deep red.
  PULSE: {
    light: {
      background: '#fdf5f4',
      surface: '#ffffff',
      field: '#fbe9e8',
      popover: '#ffffff',
      card: '#ffffff',
      foreground: '#371313',
      accent: '#c8151b',
      accentHover: '#a91116',
      accentContrast: '#ffffff',
      accentInk: '#c8151b',
      accentLight: '#652525',
    },
    dark: {
      background: '#170808',
      surface: '#210d0d',
      field: '#2a1211',
      popover: '#301514',
      card: '#371818',
      foreground: '#fff3f3',
      accent: '#e5202a',
      accentHover: '#f5434c',
      accentContrast: '#ffffff',
      accentInk: '#ff6b70',
      accentLight: '#5b2d1d',
    },
  },
  // Mental — violet ground, orange spark.
  MENTAL: {
    light: {
      background: '#fbf5fa',
      surface: '#ffffff',
      field: '#f6ecf4',
      popover: '#ffffff',
      card: '#ffffff',
      foreground: '#330e08',
      accent: '#c2410c',
      accentHover: '#9f350a',
      accentContrast: '#ffffff',
      accentInk: '#b23c0b',
      accentLight: '#470b6d',
    },
    dark: {
      background: '#180527',
      surface: '#200a33',
      field: '#29103f',
      popover: '#2e1346',
      card: '#34174e',
      foreground: '#fff5fe',
      accent: '#ff6634',
      accentHover: '#ff8558',
      accentContrast: '#1a0a05',
      accentInk: '#ff8a5c',
      accentLight: '#c68ff4',
    },
  },
};

/** The palette a member sees. A member may train with several companies, so
 *  no company's palette applies — the house palette does, as on the web. */
export const DEFAULT_PALETTE: ColorPalette = 'BLOOM';
