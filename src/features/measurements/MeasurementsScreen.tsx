import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Download,
  MoreVertical,
  Pencil,
  Plus,
  Ruler,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMemberProfile } from '@features/member/hooks';
import { ProgressChart } from '@features/workouts/widgets/ProgressChart';
import { measurementsService } from '@shared/api/services/measurements.service';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  BodyMeasurement,
  MeasurementPayload,
} from '@shared/types/api.types';
import { ActionSheet } from '@shared/ui/ActionSheet';
import { Button, IconButton } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { Card, Section } from '@shared/ui/controls';
import { PageHeader, Screen, StackHeader } from '@shared/ui/layout';
import { EmptyState, QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { toast } from '@shared/ui/toast/toast.store';
import {
  MEASUREMENT_FIELDS,
  formatChange,
  formatDate,
  formatDateTime,
  formatMeasurement,
  latestValues,
} from './lib/measurements';
import { MeasurementSheet } from './widgets/MeasurementSheet';

export const MY_MEASUREMENTS_KEY = ['me', 'measurements'] as const;

/**
 * The member's body measurements (backend specs/body-measurements.md) — the
 * web's /me/measurements: the latest value of each with its change, the
 * evolution of one at a time, and every day measured. Reached from Perfil.
 * Their trainers read and write the same list from the client profile.
 */
export function MeasurementsScreen() {
  const { t, i18n } = useTranslation(['measurements', 'common']);
  const lang = i18n.language;
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useMemberProfile();
  const api = measurementsService.mine;
  const [editing, setEditing] = useState<BodyMeasurement | 'new' | null>(null);
  const [menu, setMenu] = useState<BodyMeasurement | null>(null);
  const [deleting, setDeleting] = useState<BodyMeasurement | null>(null);

  const {
    data: rows = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: MY_MEASUREMENTS_KEY, queryFn: api.list });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: MY_MEASUREMENTS_KEY });

  const save = useMutation({
    mutationFn: (payload: MeasurementPayload & { measuredAt: string }) =>
      editing && editing !== 'new'
        ? api.update(editing.id, payload)
        : api.create(payload),
    onSuccess: () => {
      toast.success(t('measurements:saved'));
      setEditing(null);
      void refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => {
      toast.success(t('measurements:deleted'));
      setDeleting(null);
      void refresh();
    },
  });

  const latest = latestValues(rows);
  const points = [...rows]
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((r) => ({ ...r, performedAt: r.measuredAt }));
  const measures = MEASUREMENT_FIELDS.map((field) => ({
    key: field,
    label: t(`measurements:fields.${field}`),
    value: (p: BodyMeasurement) => p[field],
    format: (v: number) => formatMeasurement(field, v, lang),
  }));

  const author = (row: BodyMeasurement) => {
    if (row.importSource === 'HEVY' && !row.recordedBy) {
      return t('measurements:imported');
    }
    if (!row.recordedBy) return null;
    return row.recordedBy.id === profile?.id
      ? t('measurements:recordedByYou')
      : t('measurements:recordedBy', {
          name: `${row.recordedBy.firstName} ${row.recordedBy.lastName}`,
        });
  };

  const importLink = (
    <Button
      label={t('measurements:importAction')}
      icon={Download}
      variant="ghost"
      size="sm"
      onPress={() => router.push('/import')}
    />
  );

  return (
    <View style={styles.root}>
      <StackHeader title={t('measurements:title')} />
      <Screen safeTop={false} onRefresh={refetch}>
        <PageHeader
          title={t('measurements:title')}
          subtitle={t('measurements:subtitle')}
        />
        <Button
          label={t('measurements:add')}
          icon={Plus}
          onPress={() => setEditing('new')}
        />
        <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />
        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            icon={Ruler}
            description={t('measurements:empty')}
            action={importLink}
          />
        )}
        {rows.length > 0 && (
          <>
            <Text variant="subheading">{t('measurements:latest')}</Text>
            <View style={styles.grid}>
              {latest.map((l) => (
                <View key={l.field} style={styles.cell}>
                  <Card style={styles.latest}>
                    <Text variant="caption" muted={0.5}>
                      {t(`measurements:fields.${l.field}`)}
                    </Text>
                    <Text variant="heading" style={styles.value}>
                      {formatMeasurement(l.field, l.value, lang)}
                    </Text>
                    <Text variant="micro" muted={0.45}>
                      {l.previous
                        ? t('measurements:since', {
                            change: formatChange(
                              l.field,
                              l.value - l.previous.value,
                              lang,
                            ),
                            date: formatDate(l.previous.measuredAt, lang),
                          })
                        : formatDate(l.measuredAt, lang)}
                    </Text>
                  </Card>
                </View>
              ))}
            </View>

            {rows.length > 1 && (
              <Section title={t('measurements:evolution')}>
                <ProgressChart points={points} measures={measures} />
              </Section>
            )}

            <Section title={t('measurements:history')}>
              {rows.map((row, i) => (
                <View
                  key={row.id}
                  style={[styles.row, i > 0 && styles.rowRule]}
                >
                  <View style={styles.flex}>
                    <Text variant="bodySmall" weight="bold">
                      {formatDateTime(row.measuredAt, lang)}
                    </Text>
                    <View style={styles.chips}>
                      {MEASUREMENT_FIELDS.filter((f) => row[f] != null).map(
                        (f) => (
                          <View key={f} style={styles.chip}>
                            <Text variant="caption" muted={0.7}>
                              {t(`measurements:fields.${f}`)}{' '}
                              <Text variant="caption" weight="bold">
                                {formatMeasurement(f, row[f]!, lang)}
                              </Text>
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                    {row.notes ? (
                      <Text variant="caption" muted={0.6}>
                        {row.notes}
                      </Text>
                    ) : null}
                    {author(row) ? (
                      <Text variant="micro" muted={0.4}>
                        {author(row)}
                      </Text>
                    ) : null}
                  </View>
                  <IconButton
                    icon={MoreVertical}
                    accessibilityLabel={t('measurements:menu')}
                    color={theme.text(0.4)}
                    onPress={() => setMenu(row)}
                  />
                </View>
              ))}
            </Section>

            <View style={styles.importHint}>
              <Text variant="caption" muted={0.45} center>
                {t('measurements:importHint')}
              </Text>
              {importLink}
            </View>
          </>
        )}
      </Screen>

      {editing && (
        <MeasurementSheet
          open
          initial={editing === 'new' ? undefined : editing}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(payload) => save.mutate(payload)}
        />
      )}

      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu ? formatDateTime(menu.measuredAt, lang) : undefined}
        actions={[
          {
            key: 'edit',
            label: t('measurements:edit'),
            icon: Pencil,
            onPress: () => {
              setEditing(menu);
              setMenu(null);
            },
          },
          {
            key: 'delete',
            label: t('measurements:delete'),
            icon: Trash2,
            destructive: true,
            onPress: () => {
              setDeleting(menu);
              setMenu(null);
            },
          },
        ]}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => !remove.isPending && setDeleting(null)}
        title={t('measurements:confirmDelete.title')}
        description={
          deleting
            ? t('measurements:confirmDelete.text', {
                date: formatDateTime(deleting.measuredAt, lang),
              })
            : undefined
        }
        confirmLabel={t('measurements:delete')}
        cancelLabel={t('common:cancel')}
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', padding: 5 },
  latest: { gap: 2, padding: 14 },
  value: { fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  rowRule: { borderTopWidth: 1, borderTopColor: t.line(0.08) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: {
    backgroundColor: t.fill(0.05),
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  importHint: { alignItems: 'center', gap: 4 },
}));
