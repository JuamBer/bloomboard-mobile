import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { fonts } from '@shared/theme/theme';
import { useTheme } from '@shared/theme/ThemeProvider';

/**
 * Display variants are IBM Plex Mono italic — the brand's voice for headings
 * (the web styles every h1–h6 that way); everything readable is IBM Plex Sans
 * Arabic. Weights are font families on native, so never set fontWeight.
 */
export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'eyebrow'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption'
  | 'micro'
  | 'numeric';

export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

const SANS: Record<TextWeight, string> = {
  regular: fonts.sans,
  medium: fonts.sansMedium,
  semibold: fonts.sansSemiBold,
  bold: fonts.sansBold,
};

interface VariantSpec {
  fontSize: number;
  lineHeight: number;
  family?: string;
  letterSpacing?: number;
  weight?: TextWeight;
}

const VARIANTS: Record<TextVariant, VariantSpec> = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    family: fonts.display,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    family: fonts.display,
    letterSpacing: -0.48,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    family: fonts.display,
    letterSpacing: -0.36,
  },
  subheading: {
    fontSize: 15,
    lineHeight: 20,
    family: fonts.display,
    letterSpacing: -0.3,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    family: fonts.displayMedium,
    letterSpacing: -0.12,
  },
  body: { fontSize: 15, lineHeight: 21 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, lineHeight: 18, weight: 'semibold' },
  caption: { fontSize: 12, lineHeight: 16 },
  micro: { fontSize: 10.5, lineHeight: 14, weight: 'bold' },
  numeric: { fontSize: 15, lineHeight: 20, family: fonts.monoBold },
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  /** An exact colour; wins over `muted` and `accent`. */
  color?: string;
  /** Muted foreground — the web's `text-foreground/N` (0–1). */
  muted?: number;
  /** Accent ink — the web's `text-brand-strong`. */
  accent?: boolean;
  center?: boolean;
  uppercase?: boolean;
}

export function Text({
  variant = 'body',
  weight,
  color,
  muted,
  accent,
  center,
  uppercase,
  style,
  ...props
}: TextProps) {
  const theme = useTheme();
  const v = VARIANTS[variant];
  const family = v.family ?? SANS[weight ?? v.weight ?? 'regular'];
  const tint =
    color ??
    (accent
      ? theme.colors.accentInk
      : muted !== undefined
        ? theme.text(muted)
        : theme.colors.foreground);
  return (
    <RNText
      {...props}
      style={[
        {
          fontFamily: family,
          fontSize: v.fontSize,
          lineHeight: v.lineHeight,
          letterSpacing: v.letterSpacing,
          color: tint,
          textAlign: center ? 'center' : undefined,
          textTransform: uppercase ? 'uppercase' : undefined,
          fontVariant: variant === 'numeric' ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
    />
  );
}
