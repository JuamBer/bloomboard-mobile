import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles } from '@shared/theme/ThemeProvider';
import { Button, IconButton } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface ReorderItem {
  id: string;
  label: string;
  sublabel?: string;
  /** Drawn before the label (a super-set slot's letter badge). */
  leading?: ReactNode;
}

/**
 * Puts a list in order — blocks, a block's exercises, a routine's workouts, a
 * super-set's sequence. The web drags rows; on a phone a drag fights the
 * scroll, so each row moves up or down a step, and nothing is saved until
 * "Guardar orden".
 */
export function ReorderSheet({
  open,
  onClose,
  title,
  items,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: ReorderItem[];
  onSave: (ids: string[]) => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation(['common', 'app']);
  const [order, setOrder] = useState<ReorderItem[]>(items);
  // Reseeded each time it opens, so a cancelled sort does not linger.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOrder(items);
  }

  const move = (index: number, by: -1 | 1) =>
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });

  const changed = order.some((item, i) => item.id !== items[i]?.id);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button
            label={t('common:cancel')}
            variant="secondary"
            flex
            onPress={onClose}
          />
          <Button
            label={t('common:reorder.save')}
            flex
            disabled={!changed}
            onPress={() => {
              onSave(order.map((item) => item.id));
              onClose();
            }}
          />
        </>
      }
    >
      <View style={styles.list}>
        {order.map((item, index) => (
          <View key={item.id} style={styles.row}>
            <Text
              variant="caption"
              weight="bold"
              muted={0.35}
              style={styles.index}
            >
              {index + 1}
            </Text>
            {item.leading}
            <View style={styles.texts}>
              <Text variant="bodySmall" weight="bold" numberOfLines={2}>
                {item.label}
              </Text>
              {item.sublabel ? (
                <Text variant="caption" muted={0.45} numberOfLines={2}>
                  {item.sublabel}
                </Text>
              ) : null}
            </View>
            <IconButton
              icon={ArrowUp}
              size={34}
              variant="secondary"
              accessibilityLabel={t('app:actions.moveUp')}
              disabled={index === 0}
              onPress={() => move(index, -1)}
            />
            <IconButton
              icon={ArrowDown}
              size={34}
              variant="secondary"
              accessibilityLabel={t('app:actions.moveDown')}
              disabled={index === order.length - 1}
              onPress={() => move(index, 1)}
            />
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  index: { width: 18, textAlign: 'right' },
  texts: { flex: 1, minWidth: 0 },
}));
