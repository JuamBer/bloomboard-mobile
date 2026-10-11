import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@features/measurements/lib/measurements';
import { errorBody } from '@shared/api/errors';
import {
  importsService,
  type PickedFile,
} from '@shared/api/services/imports.service';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { HevyImportResult, HevyPreview } from '@shared/types/api.types';
import { Button, IconButton } from '@shared/ui/Button';
import { Card, Chip, Section } from '@shared/ui/controls';
import { PageHeader, Screen, StackHeader } from '@shared/ui/layout';
import { Text } from '@shared/ui/Text';
import {
  incomplete,
  initialDrafts,
  needsReview,
  quota,
  toDecisions,
  type Drafts,
} from './lib/decisions';
import { ExerciseDecisionCard } from './widgets/ExerciseDecisionCard';

type Step = 'upload' | 'review' | 'done';

/**
 * Bringing the member's history over from Hevy (backend
 * specs/hevy-import.md) — the web's /me/import: how to export it, the files,
 * a review of every exercise before anything is written, and the outcome.
 * Reached from Perfil and from the measurements screen.
 */
export function HevyImportScreen() {
  const { t, i18n } = useTranslation(['imports']);
  const lang = i18n.language;
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [preview, setPreview] = useState<HevyPreview | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [showAll, setShowAll] = useState(false);
  const [result, setResult] = useState<HevyImportResult | null>(null);

  const read = useMutation({
    mutationFn: () => importsService.previewHevy(files),
    onSuccess: (data) => {
      setPreview(data);
      setDrafts(initialDrafts(data));
      setShowAll(!data.exercises.some(needsReview));
      setStep('review');
    },
  });

  const commit = useMutation({
    mutationFn: () =>
      importsService.importHevy(files, toDecisions(preview!, drafts)),
    onSuccess: (data) => {
      setResult(data);
      setStep('done');
      void queryClient.invalidateQueries();
    },
  });

  const pick = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      // CSV arrives under several types depending on the app that saved it.
      type: [
        'text/csv',
        'text/comma-separated-values',
        'application/csv',
        'application/vnd.ms-excel',
        'text/plain',
      ],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    setFiles((prev) =>
      [...prev, ...picked.assets]
        .filter((f, i, all) => all.findIndex((o) => o.name === f.name) === i)
        .slice(-2),
    );
    read.reset();
  };

  const restart = () => {
    setStep('upload');
    setFiles([]);
    setPreview(null);
    setResult(null);
    read.reset();
    commit.reset();
  };

  const readError = () => {
    const body = errorBody(read.error) as
      { code?: string; file?: string } | undefined;
    return body?.code === 'IMPORT_UNKNOWN_FILE' ||
      body?.code === 'IMPORT_NO_FILES'
      ? t(`imports:errors.${body.code}`, { file: body.file })
      : t('imports:errors.generic');
  };

  // ── Review ──
  const q = preview ? quota(preview, drafts) : null;
  const newWorkouts = preview?.workouts
    ? preview.workouts.total - preview.workouts.alreadyImported
    : 0;
  const newMeasurements = preview?.measurements
    ? preview.measurements.total - preview.measurements.alreadyImported
    : 0;
  const blocked =
    !preview ||
    commit.isPending ||
    (q?.over ?? 0) > 0 ||
    Object.values(drafts).some(incomplete) ||
    newWorkouts + newMeasurements === 0;
  const dateOf = (iso: string | null) => (iso ? formatDate(iso, lang) : '');
  const toReview = preview?.exercises.filter(needsReview) ?? [];
  const shown = showAll ? (preview?.exercises ?? []) : toReview;

  return (
    <View style={styles.root}>
      <StackHeader
        title={t('imports:title')}
        onBack={step === 'review' ? restart : undefined}
      />
      <Screen safeTop={false}>
        <PageHeader
          title={t('imports:title')}
          subtitle={t('imports:subtitle')}
        />

        {step === 'upload' && (
          <>
            <Section title={t('imports:howTo.title')}>
              {(['step1', 'step2', 'step3', 'step4'] as const).map((s, i) => (
                <View key={s} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text variant="caption" weight="bold" accent>
                      {i + 1}
                    </Text>
                  </View>
                  <Text variant="bodySmall" muted={0.7} style={styles.flex}>
                    {t(`imports:howTo.${s}`)}
                  </Text>
                </View>
              ))}
            </Section>

            <Card style={styles.drop}>
              <Upload size={28} color={theme.text(0.3)} />
              <Text variant="bodySmall" weight="bold" center>
                {t('imports:drop')}
              </Text>
              <Text variant="caption" muted={0.45} center>
                {t('imports:dropHint')}
              </Text>
              <Button
                label={t('imports:choose')}
                variant="secondary"
                onPress={pick}
              />
            </Card>

            {files.map((f) => (
              <Card key={f.name} style={styles.file}>
                <FileSpreadsheet size={16} color={theme.colors.accentInk} />
                <Text variant="bodySmall" numberOfLines={1} style={styles.flex}>
                  {f.name}
                </Text>
                <IconButton
                  icon={X}
                  accessibilityLabel={t('imports:remove')}
                  onPress={() => {
                    setFiles((prev) => prev.filter((o) => o !== f));
                    read.reset();
                  }}
                />
              </Card>
            ))}

            {read.isError && (
              <Text variant="bodySmall" color={theme.colors.dangerInk}>
                {readError()}
              </Text>
            )}

            <Button
              label={
                read.isPending ? t('imports:analyzing') : t('imports:analyze')
              }
              size="lg"
              loading={read.isPending}
              disabled={!files.length}
              onPress={() => read.mutate()}
            />
          </>
        )}

        {step === 'review' && preview && (
          <>
            {preview.workouts && (
              <Card style={styles.total}>
                <Text variant="heading">
                  {t('imports:summary.workouts', {
                    count: preview.workouts.total,
                  })}
                </Text>
                <Text variant="caption" muted={0.5}>
                  {t('imports:summary.sets', { count: preview.workouts.sets })}{' '}
                  ·{' '}
                  {t('imports:summary.range', {
                    first: dateOf(preview.workouts.first),
                    last: dateOf(preview.workouts.last),
                  })}
                </Text>
                {preview.workouts.alreadyImported > 0 && (
                  <Text variant="caption" weight="bold" muted={0.6}>
                    {t('imports:summary.workoutsNew', { count: newWorkouts })} ·{' '}
                    {t('imports:summary.already', {
                      count: preview.workouts.alreadyImported,
                    })}
                  </Text>
                )}
              </Card>
            )}
            {preview.measurements && (
              <Card style={styles.total}>
                <Text variant="heading">
                  {t('imports:summary.measurements', {
                    count: preview.measurements.total,
                  })}
                </Text>
                <Text variant="caption" muted={0.5}>
                  {t('imports:summary.range', {
                    first: dateOf(preview.measurements.first),
                    last: dateOf(preview.measurements.last),
                  })}
                </Text>
                {preview.measurements.alreadyImported > 0 && (
                  <Text variant="caption" weight="bold" muted={0.6}>
                    {t('imports:summary.already', {
                      count: preview.measurements.alreadyImported,
                    })}
                  </Text>
                )}
              </Card>
            )}
            {preview.imperial && (
              <Text variant="caption" muted={0.6}>
                {t('imports:summary.imperial')}
              </Text>
            )}
            {preview.skippedRows > 0 && (
              <Text variant="caption" muted={0.6}>
                {t('imports:summary.skippedRows', {
                  count: preview.skippedRows,
                })}
              </Text>
            )}
            {newWorkouts + newMeasurements === 0 && (
              <Text variant="bodySmall" muted={0.6}>
                {t('imports:nothing')}
              </Text>
            )}

            {preview.exercises.length > 0 && (
              <Section
                title={t('imports:exercises.title')}
                subtitle={t('imports:exercises.intro')}
              >
                <View style={styles.filters}>
                  <Chip
                    label={t('imports:exercises.review', {
                      count: toReview.length,
                    })}
                    selected={!showAll}
                    onPress={() => setShowAll(false)}
                  />
                  <Chip
                    label={t('imports:exercises.all', {
                      count: preview.exercises.length,
                    })}
                    selected={showAll}
                    onPress={() => setShowAll(true)}
                  />
                </View>
                {shown.length === 0 ? (
                  <Text variant="bodySmall" muted={0.5}>
                    {t('imports:exercises.noneToReview')}
                  </Text>
                ) : (
                  shown.map((item, i) => (
                    <View key={item.key} style={i > 0 && styles.rule}>
                      <ExerciseDecisionCard
                        item={item}
                        draft={drafts[item.key] ?? { action: 'skip' }}
                        onChange={(draft) =>
                          setDrafts((prev) => ({ ...prev, [item.key]: draft }))
                        }
                      />
                    </View>
                  ))
                )}
              </Section>
            )}

            {q && q.count > 0 && (
              <Text
                variant="caption"
                weight={q.over > 0 ? 'bold' : undefined}
                color={q.over > 0 ? theme.colors.dangerInk : undefined}
                muted={q.over > 0 ? undefined : 0.55}
              >
                {q.limit === null
                  ? t('imports:exercises.quotaUnlimited', { count: q.count })
                  : q.over > 0
                    ? t('imports:exercises.quotaOver', {
                        limit: q.limit,
                        used: preview.customExercises.used,
                        over: q.over,
                      })
                    : t('imports:exercises.quota', {
                        creating: q.count,
                        left: q.left,
                        limit: q.limit,
                      })}
              </Text>
            )}
            <Button
              size="lg"
              loading={commit.isPending}
              disabled={blocked}
              label={
                commit.isPending
                  ? t('imports:importing')
                  : t('imports:importAction', {
                      what: [
                        newWorkouts > 0 &&
                          t('imports:importParts.workouts', {
                            count: newWorkouts,
                          }),
                        newMeasurements > 0 &&
                          t('imports:importParts.measurements', {
                            count: newMeasurements,
                          }),
                      ]
                        .filter(Boolean)
                        .join(` ${t('imports:importParts.and')} `),
                    })
              }
              onPress={() => commit.mutate()}
            />
            <Button
              label={t('imports:back')}
              variant="ghost"
              disabled={commit.isPending}
              onPress={restart}
            />
          </>
        )}

        {step === 'done' && result && (
          <Card style={styles.done}>
            <CheckCircle2 size={40} color={theme.colors.successInk} />
            <Text variant="heading" center>
              {t('imports:done.title')}
            </Text>
            {result.workouts.imported > 0 && (
              <Text variant="bodySmall" muted={0.7} center>
                {t('imports:done.workouts', {
                  count: result.workouts.imported,
                  sets: result.workouts.sets,
                })}
              </Text>
            )}
            {result.measurements.imported > 0 && (
              <Text variant="bodySmall" muted={0.7} center>
                {t('imports:done.measurements', {
                  count: result.measurements.imported,
                })}
              </Text>
            )}
            {result.exercisesCreated > 0 && (
              <Text variant="bodySmall" muted={0.7} center>
                {t('imports:done.created', { count: result.exercisesCreated })}
              </Text>
            )}
            {result.workouts.alreadyImported +
              result.measurements.alreadyImported >
              0 && (
              <Text variant="bodySmall" muted={0.45} center>
                {t('imports:done.already', {
                  count:
                    result.workouts.alreadyImported +
                    result.measurements.alreadyImported,
                })}
              </Text>
            )}
            {result.workouts.empty > 0 && (
              <Text variant="bodySmall" muted={0.45} center>
                {t('imports:done.empty', { count: result.workouts.empty })}
              </Text>
            )}
            <Button
              label={t('imports:done.toWorkouts')}
              fullWidth
              onPress={() => router.replace('/workouts')}
            />
            <Button
              label={t('imports:done.toMeasurements')}
              variant="secondary"
              fullWidth
              onPress={() => router.replace('/measurements')}
            />
            <Text variant="caption" muted={0.4} center>
              {t('imports:done.hint')}
            </Text>
            <Button
              label={t('imports:done.again')}
              variant="ghost"
              onPress={restart}
            />
          </Card>
        )}
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1, minWidth: 0 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: t.ink(0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  drop: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  total: { gap: 2 },
  filters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rule: { borderTopWidth: 1, borderTopColor: t.line(0.08) },
  done: { alignItems: 'center', gap: 10, paddingVertical: 28 },
}));
