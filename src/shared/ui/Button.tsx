import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radius, type Theme } from '@shared/theme/theme';
import { useTheme } from '@shared/theme/ThemeProvider';
import { Text } from './Text';

export type ButtonVariant =
  'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'dangerSoft';
export type ButtonSize = 'sm' | 'md' | 'lg';

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 50 };

/** Fill, border and ink per variant — the web's button classes. */
export const buttonLook = (
  t: Theme,
  variant: ButtonVariant,
  pressed: boolean,
) => {
  switch (variant) {
    case 'primary':
      return {
        bg: pressed ? t.colors.accentHover : t.colors.accent,
        border: 'transparent',
        ink: t.colors.accentContrast,
      };
    case 'secondary':
      return {
        bg: pressed ? t.fill(0.1) : t.fill(0.05),
        border: t.line(0.1),
        ink: t.text(0.8),
      };
    case 'soft':
      return {
        bg: pressed ? t.ink(0.2) : t.ink(0.1),
        border: t.ink(0.2),
        ink: t.colors.accentInk,
      };
    case 'ghost':
      return {
        bg: pressed ? t.fill(0.08) : 'transparent',
        border: 'transparent',
        ink: t.text(0.6),
      };
    case 'danger':
      return {
        bg: pressed ? '#dc2626' : t.colors.danger,
        border: 'transparent',
        ink: '#ffffff',
      };
    case 'dangerSoft':
      return {
        bg: pressed ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.1)',
        border: 'rgba(239,68,68,0.2)',
        ink: t.colors.dangerInk,
      };
  }
};

export interface ButtonProps {
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Takes the row's spare width (flex: 1). */
  flex?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading,
  disabled,
  fullWidth,
  flex,
  accessibilityLabel,
  style,
  children,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = !!(disabled || loading);
  const iconSize = size === 'sm' ? 15 : 17;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      hitSlop={size === 'sm' ? 4 : 0}
      style={({ pressed }) => {
        const l = buttonLook(theme, variant, pressed);
        return [
          {
            height: HEIGHT[size],
            paddingHorizontal: size === 'sm' ? 12 : 16,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: l.border,
            backgroundColor: l.bg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: inactive ? 0.5 : 1,
            alignSelf: fullWidth ? 'stretch' : undefined,
            flex: flex ? 1 : undefined,
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const l = buttonLook(theme, variant, pressed);
        return (
          <>
            {loading ? (
              <ActivityIndicator size="small" color={l.ink} />
            ) : (
              Icon && <Icon size={iconSize} color={l.ink} strokeWidth={2.25} />
            )}
            {label ? (
              <Text
                variant={size === 'sm' ? 'label' : 'bodySmall'}
                weight="bold"
                color={l.ink}
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {label}
              </Text>
            ) : null}
            {children}
            {IconRight && !loading ? (
              <IconRight size={iconSize} color={l.ink} strokeWidth={2.25} />
            ) : null}
          </>
        );
      }}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: 'ghost' | 'soft' | 'secondary' | 'primary';
  size?: number;
  disabled?: boolean;
  loading?: boolean;
  /** An exact ink, e.g. for a destructive or accent icon. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** An icon alone, with a 44pt hit area whatever its drawn size. */
export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 36,
  disabled,
  loading,
  color,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const slop = Math.max(0, (44 - size) / 2);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={slop}
      style={({ pressed }) => {
        const l = buttonLook(theme, variant, pressed);
        return [
          {
            width: size,
            height: size,
            borderRadius: radius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: l.bg,
            borderWidth: variant === 'ghost' ? 0 : 1,
            borderColor: l.border,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ];
      }}
    >
      {({ pressed }) =>
        loading ? (
          <ActivityIndicator size="small" color={theme.colors.accentInk} />
        ) : (
          <Icon
            size={Math.round(size * 0.48)}
            strokeWidth={2.25}
            color={color ?? buttonLook(theme, variant, pressed).ink}
          />
        )
      }
    </Pressable>
  );
}
