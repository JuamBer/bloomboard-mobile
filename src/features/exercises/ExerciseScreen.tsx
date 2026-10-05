import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  BookOpen,
  Copy,
  Dumbbell,
  Info,
  Lightbulb,
  ListTree,
  MoreVertical,
  Pencil,
  Shuffle,
  Trash2,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLimitGuard, useMemberProfile } from '@features/member/hooks';
import { UpgradeSheet } from '@features/member/widgets/MemberPlan';
import { ExerciseProgress } from '@features/workouts/widgets/ExerciseProgress';
import { meService } from '@shared/api/services/me.service';
import { exerciseMedia } from '@shared/lib/exercise-media';
import { isMemberOwned } from '@shared/lib/ownership';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { Exercise } from '@shared/types/api.types';
import { ActionSheet } from '@shared/ui/ActionSheet';
import { IconButton } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { Badge, Segmented } from '@shared/ui/controls';
import { Screen, StackHeader } from '@shared/ui/layout';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { toast } from '@shared/ui/toast/toast.store';
import {
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
} from './constants/exercise.labels';
import { isExerciseInUse, useExerciseOrigins } from './origins';
import { ExerciseFormSheet } from './widgets/ExerciseFormSheet';

type Tab = 'stats' | 'info';

/**
 * One exercise's full sheet, with a member's rights: their own can be edited
 * and deleted; anyone else's (the app's or a center's) can only be copied into
 * their own, which is how it becomes usable in their workouts. Under the
 * header, two tabs: the member's stats on it (first — the page is about
 * them), and how to do it.
 */
export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const { t } = useTranslation(['member', 'exercises', 'common']);
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useMemberProfile();
  const origins = useExerciseOrigins();
  const { guard, blocked, dismiss } = useLimitGuard();
  const [tab, setTab] = useState<Tab>('stats');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['me', 'exercise', exerciseId],
    queryFn: () => meService.getExercise(exerciseId),
  });
  const relatedIds = data?.relatedExerciseIds ?? [];
  const { data: related } = useQuery({
    queryKey: ['me', 'exercises', 'related', relatedIds],
    queryFn: () => meService.getExercisesByIds(relatedIds),
    enabled: relatedIds.length > 0,
  });

  const openUsages = () =>
    router.push({
      pathname: '/exercises/[exerciseId]/usages',
      params: { exerciseId },
    });

  const copy = useMutation({
    mutationFn: () => meService.copyExercise(exerciseId),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('member:exercise.copied', { name: created.name }));
      router.replace({
        pathname: '/exercises/[exerciseId]',
        params: { exerciseId: created.id },
      });
    },
  });
  const remove = useMutation({
    mutationFn: () => meService.removeExercise(exerciseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      router.back();
    },
    // Still in a workout: the toast says so; show where.
    onError: (error) => {
      if (isExerciseInUse(error)) openUsages();
    },
    onSettled: () => setConfirmDelete(false),
  });

  const own = !!data && isMemberOwned(data);
  const companyName = data?.companyId
    ? profile?.affiliations.find((a) => a.company.id === data.companyId)
        ?.company.commercialName
    : undefined;

  return (
    <View style={styles.root}>
      <StackHeader
        title={data?.name}
        backLabel={t('member:exercise.back')}
        right={
          data && (
            <IconButton
              icon={MoreVertical}
              size={36}
              accessibilityLabel={t('exercises:detail.actions')}
              onPress={() => setMenuOpen(true)}
            />
          )
        }
      />
      <Screen safeTop={false} onRefresh={refetch}>
        {!data ? (
          <QueryState
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        ) : (
          <>
            <Media exercise={data} />
            <View style={styles.titleBlock}>
              <Text variant="title">{data.name}</Text>
              <View style={styles.badges}>
                <Badge
                  label={origins.labelOf(data)}
                  tone={own ? 'accent' : 'neutral'}
                />
                {data.difficulty && (
                  <View style={styles.inline}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: DIFFICULTY_COLORS[data.difficulty] },
                      ]}
                    />
                    <Text variant="caption" muted={0.6}>
                      {DIFFICULTY_LABELS[data.difficulty]}
                    </Text>
                  </View>
                )}
              </View>
              {data.overview ? (
                <Text variant="bodySmall" muted={0.6}>
                  {data.overview}
                </Text>
              ) : null}
            </View>
            {!own && companyName && (
              <Text variant="caption" muted={0.6} style={styles.notice}>
                {t('member:exercise.centerHint', { company: companyName })}
              </Text>
            )}
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              options={[
                {
                  value: 'stats',
                  label: t('exercises:detail.tabs.stats'),
                  icon: BarChart3,
                },
                {
                  value: 'info',
                  label: t('exercises:detail.tabs.info'),
                  icon: Info,
                },
              ]}
            />
            {tab === 'stats' ? (
              <ExerciseProgress exerciseId={data.id} />
            ) : (
              <HowTo
                exercise={data}
                related={related ?? []}
                onOpenRelated={(id) =>
                  router.push({
                    pathname: '/exercises/[exerciseId]',
                    params: { exerciseId: id },
                  })
                }
              />
            )}
          </>
        )}
      </Screen>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={data?.name}
        actions={
          own
            ? [
                {
                  key: 'edit',
                  label: t('common:edit'),
                  icon: Pencil,
                  onPress: () => setEditing(true),
                },
                {
                  key: 'usages',
                  label: t('exercises:detail.whereUsed'),
                  icon: ListTree,
                  onPress: openUsages,
                },
                {
                  key: 'delete',
                  label: t('common:delete'),
                  icon: Trash2,
                  destructive: true,
                  separated: true,
                  onPress: () => setConfirmDelete(true),
                },
              ]
            : [
                {
                  key: 'copy',
                  label: t('exercises:detail.copyToOwn'),
                  icon: Copy,
                  pending: copy.isPending,
                  onPress: () => guard('exercises', () => copy.mutate()),
                },
                {
                  key: 'usages',
                  label: t('exercises:detail.whereUsed'),
                  icon: ListTree,
                  onPress: openUsages,
                },
              ]
        }
      />
      {data && (
        <ExerciseFormSheet
          open={editing}
          exercise={data}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('member:exercise.deleteTitle')}
        description={t('member:exercise.deleteConfirm', { name: data?.name })}
        confirmLabel={t('common:delete')}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
      <UpgradeSheet limit={blocked} onClose={dismiss} />
    </View>
  );
}

/** The demo — the gif when there is one (one asset in several sizes). */
function Media({ exercise }: { exercise: Exercise }) {
  const styles = useStyles();
  const theme = useTheme();
  const uri =
    exerciseMedia(exercise.gifUrls, 'large') ??
    exerciseMedia(exercise.imageUrls, 'large');
  return (
    <View style={styles.media}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.mediaImage}
          contentFit="contain"
          transition={200}
        />
      ) : (
        <Dumbbell size={48} color={theme.text(0.12)} />
      )}
    </View>
  );
}

/** How to do it, and what it is: steps, tips, variations, what it is logged
 *  with, the equipment, the muscles and the related exercises. */
function HowTo({
  exercise,
  related,
  onOpenRelated,
}: {
  exercise: Exercise;
  related: Exercise[];
  onOpenRelated: (id: string) => void;
}) {
  const { t } = useTranslation(['exercises', 'member']);
  const styles = useStyles();
  const theme = useTheme();
  const hasHowTo =
    exercise.instructions.length +
      exercise.exerciseTips.length +
      exercise.variations.length >
    0;
  const card = (icon: ReactNode, title: string, body: ReactNode) => (
    <View style={styles.card}>
      <View style={styles.inline}>
        {icon}
        <Text variant="subheading">{title}</Text>
      </View>
      {body}
    </View>
  );
  const chips = (values: string[]) => (
    <View style={styles.chipRow}>
      {values.map((v) => (
        <Badge key={v} label={v} />
      ))}
    </View>
  );
  return (
    <View style={styles.howTo}>
      {!hasHowTo && (
        <Text variant="bodySmall" muted={0.45}>
          {t('exercises:detail.noHowTo')}
        </Text>
      )}
      {exercise.instructions.length > 0 &&
        card(
          <BookOpen size={16} color={theme.colors.accentInk} />,
          t('exercises:detail.instructions'),
          exercise.instructions.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="micro" accent>
                  {i + 1}
                </Text>
              </View>
              <Text variant="bodySmall" muted={0.65} style={styles.flex}>
                {step}
              </Text>
            </View>
          )),
        )}
      {exercise.exerciseTips.length > 0 &&
        card(
          <Lightbulb size={16} color="#facc15" />,
          t('exercises:detail.tips'),
          exercise.exerciseTips.map((tip, i) => (
            <Text key={i} variant="bodySmall" muted={0.65}>
              • {tip}
            </Text>
          )),
        )}
      {exercise.variations.length > 0 &&
        card(
          <Shuffle size={16} color={theme.text(0.5)} />,
          t('exercises:detail.variations'),
          exercise.variations.map((v, i) => (
            <Text key={i} variant="bodySmall" muted={0.65}>
              • {v}
            </Text>
          )),
        )}
      {(exercise.metrics.length > 0 || exercise.compositeMetrics.length > 0) &&
        card(
          null,
          t('exercises:createModal.metricsLabel'),
          chips(
            [...exercise.metrics, ...exercise.compositeMetrics].map(
              (m) => m.name,
            ),
          ),
        )}
      {exercise.equipments.length > 0 &&
        card(
          null,
          t('member:exercise.equipment'),
          chips(exercise.equipments.map((e) => EQUIPMENT_LABELS[e])),
        )}
      {(exercise.targetMuscles.length > 0 ||
        exercise.secondaryMuscles.length > 0) &&
        card(
          null,
          t('exercises:detail.muscles'),
          <>
            {exercise.targetMuscles.length > 0 && (
              <>
                <Text variant="micro" muted={0.45} uppercase>
                  {t('exercises:detail.primary')}
                </Text>
                {chips(exercise.targetMuscles.map((m) => MUSCLE_LABELS[m]))}
              </>
            )}
            {exercise.secondaryMuscles.length > 0 && (
              <>
                <Text variant="micro" muted={0.45} uppercase>
                  {t('exercises:detail.secondary')}
                </Text>
                {chips(exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]))}
              </>
            )}
          </>,
        )}
      {exercise.keywords.length > 0 &&
        card(null, t('exercises:detail.keywords'), chips(exercise.keywords))}
      {related.length > 0 && (
        <View style={styles.howTo}>
          <Text variant="subheading">
            {t('exercises:detail.relatedExercises')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.related}
          >
            {related.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => onOpenRelated(r.id)}
                accessibilityRole="button"
                style={styles.relatedCard}
              >
                <View style={styles.relatedMedia}>
                  {exerciseMedia(r.imageUrls, 'small') ? (
                    <Image
                      source={{ uri: exerciseMedia(r.imageUrls, 'small') }}
                      style={styles.mediaImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Dumbbell size={22} color={theme.text(0.15)} />
                  )}
                </View>
                <Text variant="caption" weight="semibold" numberOfLines={2}>
                  {r.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  media: {
    aspectRatio: 4 / 3,
    borderRadius: radius['2xl'],
    // White behind the demos: they are drawn on plain white, so the sides read
    // as part of the picture (the web's hover preview does the same).
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.line(0.08),
  },
  mediaImage: { width: '100%', height: '100%' },
  titleBlock: { gap: 8 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  notice: {
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.fill(0.03),
  },
  howTo: { gap: 12 },
  card: {
    gap: 10,
    padding: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.06),
    backgroundColor: t.fill(0.03),
  },
  step: { flexDirection: 'row', gap: 10 },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginTop: 1,
    backgroundColor: t.ink(0.1),
    borderWidth: 1,
    borderColor: t.ink(0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  related: { gap: 10 },
  relatedCard: { width: 120, gap: 6 },
  relatedMedia: {
    width: 120,
    height: 120,
    borderRadius: radius.xl,
    backgroundColor: t.fill(0.05),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
}));
