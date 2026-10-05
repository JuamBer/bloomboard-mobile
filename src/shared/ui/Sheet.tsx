import { X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from '@shared/theme/theme';
import { useTranslation } from 'react-i18next';
import { makeStyles } from '@shared/theme/ThemeProvider';
import { IconButton } from './Button';
import { Text } from './Text';
import { Toaster } from './toast/Toaster';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Fixed at the foot, outside the scroll — the sheet's actions. */
  footer?: ReactNode;
  /** Most of the screen, for a page-like sheet (the web's `mobileFullScreen`
   *  dialogs: pickers, forms, the finish summary). */
  full?: boolean;
  /** The body scrolls (default). Off when the child is its own list. */
  scroll?: boolean;
  /** Closing by the scrim or the back gesture is not offered. */
  dismissable?: boolean;
}

const DURATION = 220;

/**
 * A bottom sheet — on a phone, the web app opens every choice from the bottom
 * (ActionMenu, the set-type and RPE pickers, the dialogs that become pages);
 * this is that surface. Built on the platform Modal, so it sits above the
 * navigation and the system back gesture closes it.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  full = false,
  scroll = true,
  dismissable = true,
}: SheetProps) {
  const styles = useStyles();
  const { t } = useTranslation(['common']);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Stays mounted through the closing animation.
  const [mounted, setMounted] = useState(open);
  // A useState, not a ref: the value is read while rendering (the styles).
  const [progress] = useState(() => new Animated.Value(0));

  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: DURATION - 60,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [open, mounted, progress]);

  if (!mounted) return null;

  const maxHeight = height - insets.top - 12;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.min(maxHeight, 600), 0],
  });

  const body = scroll ? (
    <ScrollView
      style={styles.flexShrink}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flexShrink, full && styles.flex]}>{children}</View>
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => dismissable && onClose()}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={() => dismissable && onClose()}
          accessibilityRole="button"
          accessibilityLabel={t('common:close')}
        />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.anchor}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight,
              height: full ? maxHeight : undefined,
              paddingBottom: footer ? 0 : Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />
          {(title || dismissable) && (
            <View style={styles.header}>
              <View style={styles.flex}>
                {title ? (
                  <Text variant="heading" numberOfLines={2}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text variant="bodySmall" muted={0.5} numberOfLines={3}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {dismissable && (
                <IconButton
                  icon={X}
                  size={32}
                  accessibilityLabel={t('common:close')}
                  onPress={onClose}
                />
              )}
            </View>
          )}
          {body}
          {footer ? (
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 12) },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
      <Toaster />
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  scrim: { backgroundColor: t.colors.scrim },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: t.colors.card,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.line(0.1),
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    backgroundColor: t.fill(0.15),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line(0.1),
  },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
}));
