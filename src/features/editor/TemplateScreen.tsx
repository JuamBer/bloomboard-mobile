import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Pencil, Play } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMemberProfile } from '@features/member/hooks';
import { isOwnWorkout } from '@features/member/ownership';
import { useStartWorkout } from '@features/workouts/hooks';
import { workoutTemplatesService } from '@shared/api/services/workout-templates.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { WorkoutTemplate } from '@shared/types/api.types';
import { Button, IconButton } from '@shared/ui/Button';
import { StackHeader } from '@shared/ui/layout';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import {
  EditorSourceProvider,
  templateEditorSource,
  templateQueryKey,
} from './lib/editor-source';
import { EditorBody } from './widgets/EditorBody';
import { NameSheet } from './widgets/EditorSheets';
import { EditorScroll, type EditorScrollHandle } from './widgets/EditorScroll';

const NO_COLLAPSED = new Set<string>();

/**
 * A plan — a workout template — in the shared editor. Editable only when the
 * member built it (and it isn't final); a center's plan reads, and can be
 * trained: "Entrenar" starts a workout of one's own from it.
 */
export function TemplateScreen({
  templateId,
  entryId,
}: {
  templateId: string;
  /** Scrolled to once drawn ("Dónde lo usas" → this exercise). */
  entryId?: string;
}) {
  const { t } = useTranslation(['templates', 'workouts', 'common', 'app']);
  const styles = useStyles();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: profile } = useMemberProfile();
  const source = useMemo(() => templateEditorSource(templateId), [templateId]);
  const scrollRef = useRef<EditorScrollHandle>(null);
  const [editing, setEditing] = useState(false);
  const start = useStartWorkout();

  const {
    data: template,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: templateQueryKey(templateId),
    queryFn: () => workoutTemplatesService.getById(templateId),
  });

  // A linked exercise: scrolled to once the plan has drawn.
  const scrolled = useRef(false);
  const loaded = !!template;
  useEffect(() => {
    if (!loaded || !entryId || scrolled.current) return;
    const id = setTimeout(() => {
      scrolled.current = scrollRef.current?.scrollToEntry(entryId) ?? false;
    }, 350);
    return () => clearTimeout(id);
  }, [loaded, entryId]);

  const update = useMutation({
    mutationFn: (dto: { name: string; description?: string }) =>
      workoutTemplatesService.update(templateId, dto),
    onSuccess: (updated: WorkoutTemplate) => {
      queryClient.setQueryData(templateQueryKey(templateId), updated);
      // Routines list their plans by name.
      void queryClient.invalidateQueries({ queryKey: ['me', 'routines'] });
      setEditing(false);
    },
  });

  const own = !!template && isOwnWorkout(template, profile?.id);
  const isReadOnly = !template || !own || template.status === 'FINAL';

  return (
    <View style={styles.root}>
      <StackHeader
        title={template?.name}
        right={
          template && (
            <>
              <Button
                label={t('workouts:start.train')}
                icon={Play}
                size="sm"
                loading={start.isPending}
                onPress={() => start.mutate({ workoutTemplateId: templateId })}
              />
              {!isReadOnly && (
                <IconButton
                  icon={Pencil}
                  variant="soft"
                  size={36}
                  accessibilityLabel={t('common:edit')}
                  onPress={() => setEditing(true)}
                />
              )}
            </>
          )
        }
      />
      {!template ? (
        <View style={styles.state}>
          <QueryState
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        </View>
      ) : (
        <EditorScroll ref={scrollRef} onRefresh={refetch}>
          <View style={styles.head}>
            <Text variant="title">{template.name}</Text>
            {template.description ? (
              <Text variant="bodySmall" muted={0.55}>
                {template.description}
              </Text>
            ) : null}
            {isReadOnly && (
              <View style={styles.readOnly}>
                <Lock size={12} color={theme.text(0.45)} />
                <Text variant="caption" muted={0.5}>
                  {own
                    ? t('templates:status.lockedNotice')
                    : t('app:routines.readOnly')}
                </Text>
              </View>
            )}
          </View>
          <EditorSourceProvider value={source}>
            <EditorBody
              doc={template}
              isReadOnly={isReadOnly}
              collapsedExercises={NO_COLLAPSED}
              emptyReadOnly={t('templates:detail.noBlocksYet')}
            />
          </EditorSourceProvider>
        </EditorScroll>
      )}
      <NameSheet
        open={editing}
        onClose={() => setEditing(false)}
        title={t('templates:editModal.title')}
        label={t('templates:createModal.nameLabel')}
        initialName={template?.name ?? ''}
        initialDescription={template?.description ?? ''}
        descriptionPlaceholder={t(
          'templates:createModal.descriptionPlaceholder',
        )}
        loading={update.isPending}
        onConfirm={(name, description) => update.mutate({ name, description })}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  state: { padding: 16 },
  head: {
    gap: 8,
    padding: 16,
    marginBottom: 20,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.06),
    backgroundColor: t.fill(0.03),
  },
  readOnly: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
