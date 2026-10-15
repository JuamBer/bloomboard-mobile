import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BookmarkPlus, Share2, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NameSheet } from '@features/editor/widgets/EditorSheets';
import { useLimitGuard } from '@features/member/hooks';
import { UpgradeSheet } from '@features/member/widgets/MemberPlan';
import { meService } from '@shared/api/services/me.service';
import { workoutsService } from '@shared/api/services/workouts.service';
import type { SheetAction } from '@shared/ui/ActionSheet';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { toast } from '@shared/ui/toast/toast.store';
import { forgetWorkout } from '../hooks';

/** What the actions need to know about a workout. */
export interface WorkoutRef {
  id: string;
  name: string;
  finishedAt: string | null;
  /** Trained in a center session (its record there). */
  fromSession: boolean;
}

/**
 * What a member can do with one of their workouts (app 2.6.0), from the
 * profile's list and from the workout's own ⋯:
 * - **Guardar como rutina** — a routine of their own, outside any folder,
 *   made of what they did (`POST /me/workouts/:id/template`, backend 2.10.0);
 *   counted against the plan's routines, so guarded like creating one;
 * - **Compartir** — the share page: images and the text;
 * - **Eliminar** (only from the list: the workout screen has its own).
 *
 * Only for a finished workout: one under way is trained, not kept.
 *
 * An action remembers the workout it was pressed for (`target`): the menu
 * around it usually forgets its selection as it closes — which is before the
 * action runs — so reading `workout` later found nothing, and Guardar como
 * rutina opened empty and saved nothing.
 */
export function useWorkoutActions(
  workout: WorkoutRef | null,
  { withDelete = true }: { withDelete?: boolean } = {},
) {
  const { t } = useTranslation(['app', 'common', 'workouts']);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { guard, blocked, dismiss } = useLimitGuard();
  const [target, setTarget] = useState<WorkoutRef | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = useMutation({
    mutationFn: (vars: { workoutId: string; name: string }) =>
      meService.saveWorkoutAsTemplate(vars.workoutId, vars.name),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'templates'] });
      void queryClient.invalidateQueries({ queryKey: ['me', 'plan'] });
      setSaving(false);
      toast.success(
        t('app:saveAsRoutine.saved', { name: created.name }),
        created.skippedExerciseIds.length
          ? t('app:saveAsRoutine.skipped', {
              count: created.skippedExerciseIds.length,
            })
          : undefined,
      );
      router.push({
        pathname: '/templates/[templateId]',
        params: { templateId: created.id },
      });
    },
  });

  const remove = useMutation({
    mutationFn: (workoutId: string) => workoutsService.remove(workoutId),
    onSuccess: (_void, workoutId) => {
      forgetWorkout(queryClient, workoutId);
      void queryClient.invalidateQueries({ queryKey: ['me', 'session'] });
      setConfirmDelete(false);
    },
  });

  const actions: (SheetAction | false)[] =
    workout && workout.finishedAt
      ? [
          {
            key: 'saveAsRoutine',
            label: t('app:saveAsRoutine.action'),
            icon: BookmarkPlus,
            onPress: () =>
              guard('workouts', () => {
                setTarget(workout);
                setSaving(true);
              }),
          },
          {
            key: 'share',
            label: t('app:share.action'),
            icon: Share2,
            onPress: () =>
              router.push({
                pathname: '/workouts/[workoutId]/share',
                params: { workoutId: workout.id },
              }),
          },
          withDelete && {
            key: 'delete',
            label: t('common:delete'),
            icon: Trash2,
            destructive: true,
            separated: true,
            onPress: () => {
              setTarget(workout);
              setConfirmDelete(true);
            },
          },
        ]
      : [];

  const dialogs = (
    <>
      <NameSheet
        open={saving}
        onClose={() => setSaving(false)}
        title={t('app:saveAsRoutine.title')}
        description={t('app:saveAsRoutine.description')}
        label={t('app:routines.routineName')}
        initialName={target?.name ?? ''}
        confirmLabel={t('app:saveAsRoutine.confirm')}
        loading={save.isPending}
        onConfirm={(name) =>
          target && save.mutate({ workoutId: target.id, name })
        }
      />
      {withDelete && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title={t('workouts:detail.deleteTitle')}
          description={t(
            target?.fromSession
              ? 'workouts:detail.deleteSessionDescription'
              : 'workouts:detail.deleteDescription',
            { name: target?.name },
          )}
          confirmLabel={t('common:delete')}
          loading={remove.isPending}
          onConfirm={() => target && remove.mutate(target.id)}
        />
      )}
      <UpgradeSheet limit={blocked} onClose={dismiss} />
    </>
  );

  return {
    actions: actions.filter((a): a is SheetAction => !!a),
    dialogs,
  };
}
