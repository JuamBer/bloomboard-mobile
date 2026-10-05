import type { MetricColDef } from '../constants/metric-field-config';

/** RPE is an OPTIONS metric (0–10) with its own coloured picker and chip. */
export const isRpeColumn = (col: Pick<MetricColDef, 'key'>) =>
  col.key.toUpperCase() === 'RPE';

export interface RpeTone {
  /** Hue of the band: the chip's fill (15%) and border (40%). */
  hue: string;
  /** Legible ink on the surface, per mode. */
  ink: { light: string; dark: string };
}

// The effort bands the TV uses: cool for easy work, through amber and orange,
// to red at maximal effort — with a light- and a dark-mode ink, since the
// editor runs in both. The catalog's own per-option colours are not used: its
// darkest reds vanish on a dark background. Same bands as the web's rpe.ts.
const BANDS: { max: number; tone: RpeTone }[] = [
  {
    max: 3,
    tone: { hue: '#10b981', ink: { light: '#047857', dark: '#6ee7b7' } },
  },
  {
    max: 5,
    tone: { hue: '#eab308', ink: { light: '#854d0e', dark: '#fde047' } },
  },
  {
    max: 7,
    tone: { hue: '#f97316', ink: { light: '#c2410c', dark: '#fdba74' } },
  },
  {
    max: 9,
    tone: { hue: '#ef4444', ink: { light: '#b91c1c', dark: '#fca5a5' } },
  },
  {
    max: Infinity,
    tone: { hue: '#dc2626', ink: { light: '#991b1b', dark: '#fecaca' } },
  },
];

/** The band of an RPE value; null when unknown (the chip is neutral). */
export const rpeTone = (
  value: number | string | null | undefined,
): RpeTone | null => {
  const n = value == null || value === '' ? NaN : Number(value);
  if (Number.isNaN(n)) return null;
  return BANDS.find((band) => n <= band.max)!.tone;
};
