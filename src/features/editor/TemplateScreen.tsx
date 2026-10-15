import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Play, Type } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMemberProfile } from '@features/member/hooks';
import { isOwnWorkout } from '@features/member/ownership';
import { useStartWorkout } from '@features/workouts/hooks';
import { workoutTemplatesService } from '@shared/api/services/workout-templates.service';
import { makeStyles } from '@shared/theme/ThemeProvider';
import type { WorkoutTemplate } from '@shared/types/api.types';
import { Button, IconButton } from '@shared/ui/Button';
import { StackHeader } from '@shared/ui/layout';
import { QueryState } from '@shared/ui/states';
import {
  EditorSourceProvider,
  templateEditorSource,
  templateQueryKey,
} from './lib/editor-source';
import { EditorBody } from './widgets/EditorBody';
import { NameSheet } from './widgets/EditorSheets';
import { EditorScroll, type EditorScrollHandle } from './widgets/EditorScroll';

/**
 * A routine (a workout template; the app's naming, decision 18) in the shared
 * editor. It opens to read — a routine is looked at far more often than
 * changed, and a scroll should never nudge a value — and one's own (not
 * final) has Editar, which turns the editor on until Hecho, as a finished
 * workout does. A new routine opens already editing. A center's only reads,
 * and any can be trained: "Entrenar" starts a workout of one's own from it.
 * The bar names it; while editing, its name and description are behind the
 * "Aa" button.
 */
export function TemplateScreen({
  templateId,
  entryId,
  startEditing = false,
}: {
  templateId: string;
  /** Scrolled to once drawn ("Dónde lo usas" → this exercise). */
  entryId?: string;
  /** Just created: open with the editor on. */
  startEditing?: boolean;
}) {
  const { t } = useTranslation(['templates', 'workouts', 'common', 'app']);
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { data: profile } = useMemberProfile();
  const source = useMemo(() => templateEditorSource(templateId), [templateId]);
  const scrollRef = useRef<EditorScrollHandle>(null);
  const [editing, setEditing] = useState(startEditing);
  const [naming, setNaming] = useState(false);
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
      // Folders and the loose list show routines by name.
      void queryClient.invalidateQueries({ queryKey: ['me', 'routines'] });
      void queryClient.invalidateQueries({ queryKey: ['me', 'templates'] });
      setNaming(false);
    },
  });

  const own = !!template && isOwnWorkout(template, profile?.id);
  const canEdit = !!template && own && template.status !== 'FINAL';
  const isReadOnly = !canEdit || !editing;

  return (
    <View style={styles.root}>
      <StackHeader
        title={template?.name}
        right={
          template &&
          (canEdit && editing ? (
            <>
              <IconButton
                icon={Type}
                variant="soft"
                size={36}
                accessibilityLabel={t('app:routines.nameAndDescription')}
                onPress={() => setNaming(true)}
              />
              <Button
                label={t('app:workout.done')}
                icon={Check}
                size="sm"
                onPress={() => setEditing(false)}
              />
            </>
          ) : (
            <>
              <Button
                label={t('workouts:start.train')}
                icon={Play}
                size="sm"
                loading={start.isPending}
                onPress={() => start.mutate({ workoutTemplateId: templateId })}
              />
              {canEdit && (
                <IconButton
                  icon={Pencil}
                  variant="soft"
                  size={36}
                  accessibilityLabel={t('common:edit')}
                  onPress={() => setEditing(true)}
                />
              )}
            </>
          ))
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
          <EditorSourceProvider value={source}>
            <EditorBody
              doc={template}
              isReadOnly={isReadOnly}
              emptyReadOnly={t('templates:detail.noBlocksYet')}
            />
          </EditorSourceProvider>
        </EditorScroll>
      )}
      <NameSheet
        open={naming}
        onClose={() => setNaming(false)}
        title={t('app:routines.editRoutine')}
        label={t('app:routines.routineName')}
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
}));
