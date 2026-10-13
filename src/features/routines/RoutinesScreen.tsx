import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ListOrdered,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NameSheet } from '@features/editor/widgets/EditorSheets';
import { useLimitGuard } from '@features/member/hooks';
import { UpgradeSheet } from '@features/member/widgets/MemberPlan';
import { useActiveWorkout, useStartWorkout } from '@features/workouts/hooks';
import { meService } from '@shared/api/services/me.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { MemberRoutine, RoutineWorkout } from '@shared/types/api.types';
import { ActionSheet, type SheetAction } from '@shared/ui/ActionSheet';
import { Button, IconButton } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { PageHeader, Screen } from '@shared/ui/layout';
import { ReorderSheet } from '@shared/ui/ReorderSheet';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';

const ROUTINES_KEY = ['me', 'routines'] as const;

/** The plan's exercises in order, by the name the plan gives them. */
const exerciseNames = (entry: RoutineWorkout) =>
  [...entry.workoutTemplate.blocks]
    .sort((a, b) => a.index - b.index)
    .flatMap((b) => b.exercises)
    .map((e) => e.customName || e.exercise.name);

interface RoutineGroup {
  key: string;
  title: string;
  routines: MemberRoutine[];
  editable: boolean;
}

type SheetState =
  | { kind: 'create-routine' }
  | { kind: 'edit-routine'; routine: MemberRoutine }
  | { kind: 'create-workout'; routineId: string }
  | null;

/**
 * Where training starts: an empty workout at the top, then every routine the
 * member has with its workouts in the order they rotate through them — their
 * own first (editable on their plan), then one group per company that
 * prepared some (read-only, which shows only as a missing ⋯). Each workout is
 * a card with its exercises and a Start button; a tap on the card opens its
 * plan, and a routine's settings are in its ⋯.
 */
export function RoutinesScreen() {
  const { t } = useTranslation([
    'member',
    'clients',
    'routines',
    'common',
    'app',
  ]);
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { guard, blocked, dismiss } = useLimitGuard();
  const start = useStartWorkout();
  const { data: active } = useActiveWorkout();
  // A session's workout is reached from its control; this is one's own.
  const ownActive = active && !active.sessionUserId ? active : null;
  const startingId = start.isPending
    ? (start.variables?.workoutTemplateId ?? 'empty')
    : null;
  const [sheet, setSheet] = useState<SheetState>(null);
  const [menu, setMenu] = useState<{
    title: string;
    actions: SheetAction[];
  } | null>(null);
  const [sortRoutine, setSortRoutine] = useState<MemberRoutine | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MemberRoutine | null>(
    null,
  );
  const [confirmRemove, setConfirmRemove] = useState<{
    routineId: string;
    entry: RoutineWorkout;
  } | null>(null);

  const {
    data: routines,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ROUTINES_KEY,
    queryFn: meService.getRoutines,
  });

  const groups = useMemo<RoutineGroup[]>(() => {
    const all = routines ?? [];
    const byCompany = new Map<string, RoutineGroup>();
    for (const routine of all) {
      if (!routine.assignedBy) continue;
      const group = byCompany.get(routine.assignedBy.id) ?? {
        key: routine.assignedBy.id,
        title: t('member:routines.byCompany', {
          company: routine.assignedBy.commercialName,
        }),
        routines: [],
        editable: false,
      };
      group.routines.push(routine);
      byCompany.set(routine.assignedBy.id, group);
    }
    return [
      {
        key: 'own',
        title: t('member:routines.own'),
        routines: all.filter((r) => !r.assignedBy),
        editable: true,
      },
      ...[...byCompany.values()].sort((a, b) => a.title.localeCompare(b.title)),
    ];
  }, [routines, t]);

  const writeRoutine = (updated: MemberRoutine) =>
    queryClient.setQueryData<MemberRoutine[]>(ROUTINES_KEY, (prev) =>
      (prev ?? []).map((r) => (r.id === updated.id ? updated : r)),
    );
  // A member's creates and deletes move their plan usage.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ROUTINES_KEY });
    void queryClient.invalidateQueries({ queryKey: ['me', 'plan'] });
  };
  const openTemplate = (templateId: string) =>
    router.push({
      pathname: '/templates/[templateId]',
      params: { templateId },
    });

  const createRoutine = useMutation({
    mutationFn: (dto: { name: string; description?: string }) =>
      meService.createRoutine(dto),
    onSuccess: (created) => {
      queryClient.setQueryData<MemberRoutine[]>(ROUTINES_KEY, (prev) => [
        ...(prev ?? []),
        created as MemberRoutine,
      ]);
      invalidate();
      setSheet(null);
    },
  });
  const updateRoutine = useMutation({
    mutationFn: (vars: {
      id: string;
      dto: { name: string; description?: string };
    }) => meService.updateRoutine(vars.id, vars.dto),
    onSuccess: (updated) => {
      writeRoutine(updated as MemberRoutine);
      setSheet(null);
    },
  });
  const removeRoutine = useMutation({
    mutationFn: (id: string) => meService.removeRoutine(id),
    onSuccess: invalidate,
  });
  const createWorkout = useMutation({
    mutationFn: (vars: {
      routineId: string;
      dto: { name: string; description?: string };
    }) => meService.addBlankWorkout(vars.routineId, vars.dto),
    onSuccess: (updated) => {
      writeRoutine(updated as MemberRoutine);
      invalidate();
      setSheet(null);
      const last = (updated.workouts ?? []).at(-1);
      if (last) openTemplate(last.workoutTemplateId);
    },
  });
  const reorderWorkouts = useMutation({
    mutationFn: (vars: { routineId: string; ids: string[] }) =>
      meService.reorderWorkouts(vars.routineId, vars.ids),
    onSuccess: (updated) => writeRoutine(updated as MemberRoutine),
  });
  const removeWorkout = useMutation({
    mutationFn: (vars: { routineId: string; entryId: string }) =>
      meService.removeWorkout(vars.routineId, vars.entryId),
    onSuccess: (updated) => {
      writeRoutine(updated as MemberRoutine);
      invalidate();
    },
  });

  const routineActions = (routine: MemberRoutine): SheetAction[] => [
    {
      key: 'edit',
      label: t('common:edit'),
      icon: Pencil,
      onPress: () => setSheet({ kind: 'edit-routine', routine }),
    },
    ...((routine.workouts?.length ?? 0) > 1
      ? [
          {
            key: 'sort',
            label: t('app:routines.sortWorkouts'),
            icon: ListOrdered,
            onPress: () => setSortRoutine(routine),
          },
        ]
      : []),
    {
      key: 'delete',
      label: t('common:delete'),
      icon: Trash2,
      destructive: true,
      separated: true,
      onPress: () => setConfirmDelete(routine),
    },
  ];

  const workoutActions = (
    routine: MemberRoutine,
    entry: RoutineWorkout,
  ): SheetAction[] => [
    ...((routine.workouts?.length ?? 0) > 1
      ? [
          {
            key: 'sort',
            label: t('app:routines.sortWorkouts'),
            icon: ListOrdered,
            onPress: () => setSortRoutine(routine),
          },
        ]
      : []),
    ...(entry.workoutTemplate.status === 'FINAL'
      ? []
      : [
          {
            key: 'remove',
            label: t('common:delete'),
            icon: Trash2,
            destructive: true,
            onPress: () => setConfirmRemove({ routineId: routine.id, entry }),
          },
        ]),
  ];

  return (
    <Screen onRefresh={refetch}>
      <PageHeader
        title={t('member:routines.title')}
        subtitle={t('member:routines.subtitle')}
        aside={
          <IconButton
            icon={Plus}
            variant="primary"
            size={42}
            accessibilityLabel={t('member:routines.new')}
            onPress={() =>
              guard('routines', () => setSheet({ kind: 'create-routine' }))
            }
          />
        }
      />
      {ownActive ? (
        <Button
          label={t('app:routines.continueWorkout')}
          icon={Play}
          size="lg"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/workouts/[workoutId]',
              params: { workoutId: ownActive.id },
            })
          }
        />
      ) : (
        <Button
          label={t('app:routines.emptyWorkout')}
          icon={Play}
          size="lg"
          fullWidth
          loading={startingId === 'empty'}
          disabled={start.isPending}
          onPress={() => start.mutate({})}
        />
      )}
      <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />
      {routines &&
        groups.map((group) =>
          !group.editable && group.routines.length === 0 ? null : (
            <View key={group.key} style={styles.group}>
              <Text variant="micro" muted={0.45} uppercase>
                {group.title}
              </Text>
              {group.routines.length === 0 ? (
                <View style={styles.emptyOwn}>
                  <Text variant="bodySmall" muted={0.5}>
                    {t('member:routines.ownEmpty')}
                  </Text>
                  <Button
                    label={t('member:routines.new')}
                    icon={Plus}
                    variant="soft"
                    size="sm"
                    onPress={() =>
                      guard('routines', () =>
                        setSheet({ kind: 'create-routine' }),
                      )
                    }
                  />
                </View>
              ) : (
                group.routines.map((routine) => {
                  const locked = !group.editable || routine.status === 'FINAL';
                  const entries = routine.workouts ?? [];
                  return (
                    <View key={routine.id} style={styles.routine}>
                      <View style={styles.routineHead}>
                        <View style={styles.flex}>
                          <Text variant="heading" numberOfLines={2}>
                            {routine.name}
                          </Text>
                          {routine.description ? (
                            <Text variant="bodySmall" muted={0.5}>
                              {routine.description}
                            </Text>
                          ) : null}
                        </View>
                        {!locked && (
                          <IconButton
                            icon={MoreVertical}
                            size={34}
                            accessibilityLabel={t('common:options')}
                            onPress={() =>
                              setMenu({
                                title: routine.name,
                                actions: routineActions(routine),
                              })
                            }
                          />
                        )}
                      </View>
                      {entries.map((entry) => {
                        const actions = locked
                          ? []
                          : workoutActions(routine, entry);
                        const names = exerciseNames(entry);
                        return (
                          <View key={entry.id} style={styles.workout}>
                            <Pressable
                              onPress={() =>
                                openTemplate(entry.workoutTemplateId)
                              }
                              accessibilityRole="button"
                              accessibilityHint={t('app:routines.openPlan')}
                              style={({ pressed }) => [
                                styles.workoutPress,
                                pressed && { opacity: 0.7 },
                              ]}
                            >
                              <View style={styles.workoutHead}>
                                <Text
                                  variant="subheading"
                                  numberOfLines={2}
                                  style={styles.flex}
                                >
                                  {entry.workoutTemplate.name}
                                </Text>
                                {actions.length > 0 && (
                                  <IconButton
                                    icon={MoreVertical}
                                    size={32}
                                    accessibilityLabel={t('common:options')}
                                    style={styles.cornerMenu}
                                    onPress={() =>
                                      setMenu({
                                        title: entry.workoutTemplate.name,
                                        actions,
                                      })
                                    }
                                  />
                                )}
                              </View>
                              {entry.workoutTemplate.description ? (
                                <Text
                                  variant="bodySmall"
                                  muted={0.55}
                                  numberOfLines={2}
                                >
                                  {entry.workoutTemplate.description}
                                </Text>
                              ) : null}
                              <Text
                                variant="caption"
                                muted={0.45}
                                numberOfLines={2}
                              >
                                {names.length > 0
                                  ? names.join(' · ')
                                  : t('app:routines.noExercises')}
                              </Text>
                            </Pressable>
                            <Button
                              label={t('app:routines.startWorkout')}
                              icon={Play}
                              variant="soft"
                              fullWidth
                              loading={startingId === entry.workoutTemplateId}
                              disabled={start.isPending}
                              onPress={() =>
                                start.mutate({
                                  workoutTemplateId: entry.workoutTemplateId,
                                })
                              }
                            />
                          </View>
                        );
                      })}
                      {entries.length === 0 && locked && (
                        <Text variant="caption" muted={0.4}>
                          {t('clients:routinesSection.noTemplatesInRoutine')}
                        </Text>
                      )}
                      {!locked && (
                        <Pressable
                          onPress={() =>
                            guard('workouts', () =>
                              setSheet({
                                kind: 'create-workout',
                                routineId: routine.id,
                              }),
                            )
                          }
                          accessibilityRole="button"
                          style={({ pressed }) => [
                            styles.addWorkout,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Plus size={15} color={theme.colors.accentInk} />
                          <Text variant="bodySmall" weight="bold" accent>
                            {t('member:routines.newWorkout')}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          ),
        )}

      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.title}
        actions={menu?.actions ?? []}
      />

      <NameSheet
        open={
          sheet?.kind === 'create-routine' || sheet?.kind === 'edit-routine'
        }
        onClose={() => setSheet(null)}
        title={
          sheet?.kind === 'edit-routine'
            ? t('member:routines.edit')
            : t('member:routines.new')
        }
        label={t('app:routines.name')}
        placeholder={t('clients:routinesSection.routineNamePlaceholder')}
        initialName={sheet?.kind === 'edit-routine' ? sheet.routine.name : ''}
        initialDescription={
          sheet?.kind === 'edit-routine'
            ? (sheet.routine.description ?? '')
            : ''
        }
        descriptionPlaceholder={t('app:routines.descriptionPlaceholder')}
        loading={createRoutine.isPending || updateRoutine.isPending}
        onConfirm={(name, description) => {
          const dto = { name, description: description || undefined };
          if (sheet?.kind === 'edit-routine')
            updateRoutine.mutate({ id: sheet.routine.id, dto });
          else createRoutine.mutate(dto);
        }}
      />
      <NameSheet
        open={sheet?.kind === 'create-workout'}
        onClose={() => setSheet(null)}
        title={t('member:routines.newWorkout')}
        label={t('app:routines.workoutName')}
        placeholder={t('clients:routinesSection.templateNamePlaceholder')}
        initialDescription=""
        descriptionPlaceholder={t('app:routines.descriptionPlaceholder')}
        loading={createWorkout.isPending}
        onConfirm={(name, description) =>
          sheet?.kind === 'create-workout' &&
          createWorkout.mutate({
            routineId: sheet.routineId,
            dto: { name, description: description || undefined },
          })
        }
      />

      <ReorderSheet
        open={!!sortRoutine}
        onClose={() => setSortRoutine(null)}
        title={t('app:routines.sortWorkouts')}
        items={(sortRoutine?.workouts ?? []).map((w) => ({
          id: w.id,
          label: w.workoutTemplate.name,
        }))}
        onSave={(ids) =>
          sortRoutine &&
          reorderWorkouts.mutate({ routineId: sortRoutine.id, ids })
        }
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={t('app:routines.deleteTitle')}
        description={t('app:routines.deleteDescription', {
          name: confirmDelete?.name,
        })}
        confirmLabel={t('common:delete')}
        loading={removeRoutine.isPending}
        onConfirm={() => {
          if (confirmDelete) removeRoutine.mutate(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title={t('app:routines.removeWorkoutTitle')}
        description={t('app:routines.removeWorkoutDescription', {
          name: confirmRemove?.entry.workoutTemplate.name,
        })}
        confirmLabel={t('common:delete')}
        onConfirm={() => {
          if (confirmRemove)
            removeWorkout.mutate({
              routineId: confirmRemove.routineId,
              entryId: confirmRemove.entry.id,
            });
          setConfirmRemove(null);
        }}
      />
      <UpgradeSheet limit={blocked} onClose={dismiss} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  group: { gap: 12 },
  emptyOwn: {
    gap: 12,
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.line(0.15),
  },
  routine: { gap: 10 },
  routineHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 2,
  },
  flex: { flex: 1, minWidth: 0 },
  workout: {
    gap: 12,
    padding: 14,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  workoutPress: { gap: 4 },
  workoutHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cornerMenu: { marginTop: -6, marginRight: -8, marginBottom: -8 },
  addWorkout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.ink(0.3),
  },
}));
