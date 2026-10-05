import { CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Text } from '../Text';
import { useToastStore, type ToastKind } from './toast.store';

/**
 * The toasts, at the top under the status bar. Rendered once at the root and
 * again inside every sheet and dialog: a platform Modal covers the root, so a
 * failure inside a sheet would otherwise be announced behind it. Tap to
 * dismiss.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const theme = useTheme();
  if (!toasts.length) return null;

  const icon = (kind: ToastKind) => {
    const props = { size: 18, strokeWidth: 2.25 };
    switch (kind) {
      case 'success':
        return <CheckCircle2 {...props} color={theme.colors.success} />;
      case 'error':
        return <XCircle {...props} color={theme.colors.danger} />;
      case 'info':
        return <Info {...props} color={theme.colors.accentInk} />;
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.stack, { top: insets.top + 8 }]}
    >
      {toasts.map((toast) => (
        <Pressable
          key={toast.id}
          onPress={() => dismiss(toast.id)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.toast}
        >
          {icon(toast.kind)}
          <View style={styles.texts}>
            <Text variant="bodySmall" weight="bold">
              {toast.title}
            </Text>
            {toast.description ? (
              <Text variant="caption" muted={0.65}>
                {toast.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  stack: {
    position: 'absolute',
    left: 12,
    right: 12,
    gap: 8,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius['2xl'],
    backgroundColor: t.colors.popover,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.line(0.15),
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  texts: { flex: 1, gap: 2 },
}));
