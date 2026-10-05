import { Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { RecordDetail } from '@shared/types/api.types';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import { dismissRecordToast } from '../lib/record-toast';
import {
  formatRecordAt,
  formatRecordGain,
  formatRecordValue,
  recordLabel,
} from '../lib/records';

/** What each record of a set is, its new best and how much it improved. */
export function RecordList({ records }: { records: RecordDetail[] }) {
  const { t } = useTranslation(['workouts']);
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.list}>
      {records.map((record) => {
        const at = formatRecordAt(t, record.kind, record.at);
        const gain = formatRecordGain(
          t,
          record.kind,
          record.value,
          record.previous,
        );
        return (
          <View key={`${record.kind}-${record.at ?? ''}`} style={styles.row}>
            <Trophy size={16} color={theme.colors.warning} />
            <View style={styles.flex}>
              <Text variant="bodySmall" weight="bold">
                {recordLabel(t, record.kind)}
                {at ? (
                  <Text variant="bodySmall" weight="medium" muted={0.5}>
                    {` ${at}`}
                  </Text>
                ) : null}
              </Text>
              {record.previous !== null && (
                <Text variant="caption" muted={0.5}>
                  {t('workouts:records.before', {
                    value: formatRecordValue(t, record.kind, record.previous),
                  })}
                </Text>
              )}
            </View>
            <View style={styles.right}>
              <Text variant="bodySmall" weight="bold" style={styles.tabular}>
                {formatRecordValue(t, record.kind, record.value)}
              </Text>
              {gain ? (
                <Text
                  variant="caption"
                  weight="bold"
                  color={theme.colors.successInk}
                  style={styles.tabular}
                >
                  {gain}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * The yellow trophy on a set that beat a personal record. Tapping it says
 * which records and by how much, in a bottom sheet — and puts away the "new
 * record" toast, which would otherwise sit over the sheet saying the same.
 */
export function RecordTrophy({ records }: { records: RecordDetail[] }) {
  const { t } = useTranslation(['workouts']);
  const styles = useStyles();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (!records.length) return null;
  const title = t('workouts:records.setTitle', {
    kinds: records.map((r) => recordLabel(t, r.kind)).join(' · '),
  });
  return (
    <>
      <Pressable
        onPress={() => {
          dismissRecordToast();
          setOpen(true);
        }}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={styles.trophy}
      >
        <Trophy size={11} color={theme.colors.onGold} strokeWidth={2.75} />
      </Pressable>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('workouts:records.detailTitle', { count: records.length })}
      >
        <RecordList records={records} />
      </Sheet>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  tabular: { fontVariant: ['tabular-nums'] },
  trophy: {
    position: 'absolute',
    right: -7,
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: t.colors.gold,
    borderWidth: 2,
    borderColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
}));
