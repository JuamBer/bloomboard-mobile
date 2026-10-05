import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  /** A password: masked, with a show/hide eye. */
  secret?: boolean;
  /** Grows with its content (notes). */
  multiline?: boolean;
  /** Rendered at the right edge inside the field. */
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps['style'];
}

/** A labelled input — the web's `bg-field border-foreground/10 rounded-xl`. */
export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField(
    {
      label,
      hint,
      error,
      secret,
      multiline,
      trailing,
      containerStyle,
      inputStyle,
      editable = true,
      ...props
    },
    ref,
  ) {
    const styles = useStyles();
    const theme = useTheme();
    const { t } = useTranslation(['app']);
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);
    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <Text variant="label" muted={0.6}>
            {label}
          </Text>
        ) : null}
        <View
          style={[
            styles.box,
            multiline && styles.boxMultiline,
            focused && { borderColor: theme.ink(0.5) },
            !!error && { borderColor: 'rgba(239,68,68,0.6)' },
            !editable && { opacity: 0.55 },
          ]}
        >
          <TextInput
            ref={ref}
            {...props}
            editable={editable}
            multiline={multiline}
            secureTextEntry={secret && !revealed}
            placeholderTextColor={theme.text(0.3)}
            selectionColor={theme.colors.accentInk}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            style={[
              styles.input,
              multiline && styles.inputMultiline,
              inputStyle,
            ]}
          />
          {secret ? (
            <Pressable
              onPress={() => setRevealed((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                revealed
                  ? t('app:actions.hidePassword')
                  : t('app:actions.showPassword')
              }
            >
              {revealed ? (
                <EyeOff size={18} color={theme.text(0.4)} />
              ) : (
                <Eye size={18} color={theme.text(0.4)} />
              )}
            </Pressable>
          ) : null}
          {trailing}
        </View>
        {error ? (
          <Text variant="caption" color={theme.colors.dangerInk}>
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" muted={0.45}>
            {hint}
          </Text>
        ) : null}
      </View>
    );
  },
);

const useStyles = makeStyles((t) => ({
  container: { gap: 6 },
  box: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.colors.field,
  },
  boxMultiline: { alignItems: 'flex-start', paddingVertical: 10 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: t.colors.foreground,
    paddingVertical: 0,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: 2 },
}));
