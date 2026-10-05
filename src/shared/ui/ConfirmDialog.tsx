import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles } from '@shared/theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';
import { Toaster } from './toast/Toaster';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red, for something that deletes. On by default, as on the web. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

/** A question that needs an answer before something irreversible happens. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  const styles = useStyles();
  const { t } = useTranslation(['common']);
  if (!open) return null;
  const cancel = cancelLabel ?? t('common:cancel');
  const confirm = confirmLabel ?? t('common:confirm');
  // Side by side while both labels fit half the card; stacked (the answer on
  // top), as the platform's own alerts do, once either would be cut.
  const stacked = Math.max(cancel.length, confirm.length) > 14;
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.center}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common:cancel')}
        />
        <View style={styles.card} accessibilityRole="alert">
          <Text variant="heading">{title}</Text>
          {typeof description === 'string' ? (
            <Text variant="bodySmall" muted={0.6}>
              {description}
            </Text>
          ) : (
            description
          )}
          <View style={[styles.actions, stacked && styles.stacked]}>
            <Button
              label={cancel}
              variant="secondary"
              onPress={onClose}
              flex={!stacked}
              fullWidth={stacked}
            />
            <Button
              label={confirm}
              variant={destructive ? 'danger' : 'primary'}
              loading={loading}
              onPress={onConfirm}
              flex={!stacked}
              fullWidth={stacked}
            />
          </View>
        </View>
      </View>
      <Toaster />
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrim: { backgroundColor: t.colors.scrim },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 10,
    padding: 20,
    borderRadius: radius['3xl'],
    backgroundColor: t.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.line(0.1),
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  stacked: { flexDirection: 'column-reverse' },
}));
