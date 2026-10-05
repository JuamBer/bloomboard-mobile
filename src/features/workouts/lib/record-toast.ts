import * as Haptics from 'expo-haptics';
import type { TFunction } from 'i18next';
import { Platform } from 'react-native';
import type { EditorExercise, RecordKind } from '@shared/types/api.types';
import { toast } from '@shared/ui/toast/toast.store';
import { recordLabel } from './records';

// The announcement on screen, so opening a trophy's details can put it away.
let lastRecordToast: string | undefined;

/** Puts away the "new record" toast, if it is still up. */
export function dismissRecordToast() {
  if (lastRecordToast) toast.dismiss(lastRecordToast);
  lastRecordToast = undefined;
}

// A record is the kind and the value it reached: the same set beating its own
// record again (60 → 65 kg) is news too.
type Recorded = Pick<
  EditorExercise['sets'][number],
  'records' | 'recordDetails'
>;
const recordKeys = (holder: Recorded | undefined): Map<string, RecordKind> =>
  new Map(
    holder?.recordDetails?.length
      ? holder.recordDetails.map((d) => [
          `${d.kind}|${d.at ?? ''}|${d.value}`,
          d.kind,
        ])
      : (holder?.records ?? []).map((kind) => [kind, kind]),
  );

/**
 * Announces the records a save just set — what the response has that the
 * exercise did not before. Sets are compared by position: a save rewrites
 * them, so their ids change, but the third set is still the third set.
 *
 * The web plays a synthesised fanfare; a phone at the gym is in a pocket or
 * on a bench, so it buzzes — the success haptic — instead.
 */
export function newRecordsToast(
  t: TFunction,
  before: EditorExercise,
  after: EditorExercise,
) {
  const fresh = new Set<RecordKind>();
  const collect = (was: Recorded | undefined, now: Recorded) => {
    const previous = recordKeys(was);
    for (const [key, kind] of recordKeys(now)) {
      if (!previous.has(key)) fresh.add(kind);
    }
  };
  after.sets.forEach((set, i) => collect(before.sets[i], set));
  collect(before, after);
  if (!fresh.size) return;
  if (Platform.OS !== 'web') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  lastRecordToast = toast.success(
    t('workouts:records.toastTitle', {
      exercise: after.customName || after.exercise.name,
    }),
    [...fresh].map((kind) => recordLabel(t, kind)).join(' · '),
  );
}
