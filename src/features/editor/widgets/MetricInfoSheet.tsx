import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeStyles } from '@shared/theme/ThemeProvider';
import { Button } from '@shared/ui/Button';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import type { MetricColDef } from '../constants/metric-field-config';
import { isRpeColumn } from '../lib/rpe';
import { RpeChip } from './MetricCell';

/**
 * What a column of the sets table measures and how to fill it in — opened
 * from its header, for someone who has never logged a set by RPE or tempo.
 * The app's own words for the catalog's metrics (`app:guide.metrics.items`,
 * also the guide's page), else the catalog's description; RPE adds its scale.
 */
export function MetricInfoSheet({
  open,
  onClose,
  col,
  unitLabel,
}: {
  open: boolean;
  onClose: () => void;
  col: MetricColDef;
  unitLabel?: string;
}) {
  const { t, i18n } = useTranslation(['app', 'templates', 'common']);
  const styles = useStyles();
  const router = useRouter();
  const key = `app:guide.metrics.items.${col.key}`;
  const own = i18n.exists(`${key}.body`);
  const body = own ? t(`${key}.body`) : (col.description ?? '');
  const tip = own && i18n.exists(`${key}.tip`) ? t(`${key}.tip`) : null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={col.label}
      subtitle={
        unitLabel ? t('app:metricInfo.unit', { unit: unitLabel }) : undefined
      }
      footer={
        <>
          <Button
            label={t('app:metricInfo.guide')}
            icon={BookOpen}
            variant="ghost"
            flex
            onPress={() => {
              onClose();
              router.push({
                pathname: '/settings/guide/[topic]',
                params: { topic: 'metrics' },
              });
            }}
          />
          <Button
            label={t('common:close')}
            variant="secondary"
            flex
            onPress={onClose}
          />
        </>
      }
    >
      <Text variant="body" muted={0.8}>
        {body || t('app:metricInfo.noDescription')}
      </Text>
      {tip ? (
        <Text variant="bodySmall" muted={0.6}>
          {tip}
        </Text>
      ) : null}
      {col.planOnly && (
        <Text variant="bodySmall" muted={0.6}>
          {t('app:metricInfo.planOnly')}
        </Text>
      )}
      {isRpeColumn(col) && (
        <View style={styles.scale}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <View key={n} style={styles.scaleRow}>
              <RpeChip value={n} />
              <Text variant="bodySmall" style={styles.flex}>
                {t(`templates:rpeLegend.rpe${n}`)}
              </Text>
              <Text variant="caption" muted={0.5}>
                {t('templates:rpePicker.rir', {
                  rir: t(`templates:rpeLegend.rir${n}`),
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles(() => ({
  scale: { gap: 6 },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
}));
