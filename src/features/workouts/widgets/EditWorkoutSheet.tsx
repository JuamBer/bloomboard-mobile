import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { workoutsService } from '@shared/api/services/workouts.service';
import type { Workout } from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { DateField } from '@shared/ui/pickers';
import { Sheet } from '@shared/ui/Sheet';
import { TextField } from '@shared/ui/TextField';

/**
 * A workout's name, notes and — for one trained on one's own — when it
 * started and finished. A center session's times are the attendance's
 * (check-in, checkout), so they are not offered. From the ⋯ menu it is an
 * edit; as the last step of finishing, a wrap-up ("¿Qué tal ha ido?"), notes
 * first, and closing it skips.
 */
export function EditWorkoutSheet({
  open,
  workout,
  wrapUp = false,
  onClose,
  onSaved,
}: {
  open: boolean;
  workout: Workout;
  wrapUp?: boolean;
  onClose: () => void;
  onSaved: (updated: Workout) => void;
}) {
  const { t } = useTranslation(['workouts', 'common']);
  const fromSession = !!workout.sessionUserId;
  const [name, setName] = useState(workout.name);
  const [notes, setNotes] = useState(workout.notes ?? '');
  const [startedAt, setStartedAt] = useState<Date | undefined>(
    new Date(workout.startedAt),
  );
  const [finishedAt, setFinishedAt] = useState<Date | undefined>(
    workout.finishedAt ? new Date(workout.finishedAt) : undefined,
  );
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(workout.name);
      setNotes(workout.notes ?? '');
      setStartedAt(new Date(workout.startedAt));
      setFinishedAt(
        workout.finishedAt ? new Date(workout.finishedAt) : undefined,
      );
    }
  }

  const invalid =
    !name.trim() ||
    (!fromSession && !!startedAt && !!finishedAt && finishedAt < startedAt);

  const save = useMutation({
    mutationFn: () =>
      workoutsService.update(workout.id, {
        name: name.trim(),
        notes: notes.trim() || null,
        ...(fromSession || !startedAt
          ? {}
          : {
              startedAt: startedAt.toISOString(),
              ...(workout.finishedAt && finishedAt
                ? { finishedAt: finishedAt.toISOString() }
                : {}),
            }),
      }),
    onSuccess: onSaved,
  });

  const notesField = (
    <TextField
      label={t('workouts:edit.notes')}
      value={notes}
      onChangeText={setNotes}
      placeholder={t('workouts:edit.notesPlaceholder')}
      maxLength={4000}
      multiline
    />
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={wrapUp ? t('workouts:wrapUp.title') : t('workouts:edit.title')}
      subtitle={
        wrapUp
          ? fromSession
            ? t('workouts:wrapUp.hintSession')
            : t('workouts:wrapUp.hint')
          : undefined
      }
      full={wrapUp}
      footer={
        <>
          <Button
            label={wrapUp ? t('workouts:wrapUp.skip') : t('common:cancel')}
            variant="secondary"
            flex
            onPress={onClose}
          />
          <Button
            label={t('common:save')}
            flex
            loading={save.isPending}
            disabled={invalid}
            onPress={() => save.mutate()}
          />
        </>
      }
    >
      {wrapUp && notesField}
      <TextField
        label={t('workouts:edit.name')}
        value={name}
        onChangeText={setName}
        maxLength={120}
      />
      {!fromSession && (
        <>
          <DateField
            label={t('workouts:edit.startedAt')}
            value={startedAt}
            onChange={setStartedAt}
            mode="datetime"
            maximumDate={new Date()}
          />
          {workout.finishedAt && (
            <DateField
              label={t('workouts:edit.finishedAt')}
              value={finishedAt}
              onChange={setFinishedAt}
              mode="datetime"
              maximumDate={new Date()}
            />
          )}
        </>
      )}
      {!wrapUp && notesField}
    </Sheet>
  );
}
