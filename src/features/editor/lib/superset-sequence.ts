import { alpha } from '@shared/theme/theme';
import type {
  CompositeMetric,
  Metric,
  EditorExercise,
} from '@shared/types/api.types';
import type { SuperSetSlotPayload } from '@shared/api/services/workout-templates.service';
import type { WorkoutSuperSetSlotPayload } from '@shared/api/services/workouts.service';
import type { EditorKind } from './editor-source';
import {
  buildColDefs,
  type MetricColDef,
} from '../constants/metric-field-config';
import {
  toEditableSet,
  toSetPayload,
  type EditableWorkoutSet,
} from '../types/workout-set.types';

/**
 * A super-set is an ordered list of **slots**, and a slot *is* one set of one
 * member exercise. That single idea is what makes any order expressible —
 * "bench, bench, biceps, bench, pull-up, biceps" is just six slots — and it is
 * why nothing here has to think in rounds.
 *
 * The order itself lives on `EditorSet.superSetOrder`; these helpers only
 * flatten it into a list and label it the way trainers write it down (A1, B1, A2).
 */
export interface SuperSetSlot {
  /** Which member exercise is performed at this position. */
  entryId: string;
  set: EditableWorkoutSet;
}

/** Members of a group, in block order — the order their letters are handed out. */
export const superSetMembers = (
  exercises: EditorExercise[],
  groupId: string,
): EditorExercise[] =>
  exercises.filter((entry) => entry.superSetGroupId === groupId);

/** Flattens the members' sets into the performed sequence. Sets without a
 *  position (just added elsewhere, or a group predating the column) sort to the
 *  end, mirroring exactly what the server's normalization does. */
export const buildSlots = (members: EditorExercise[]): SuperSetSlot[] =>
  members
    .flatMap((entry, memberIndex) =>
      entry.sets.map((set, setIndex) => ({
        entryId: entry.id,
        set: toEditableSet(set),
        superSetOrder: set.superSetOrder,
        memberIndex,
        setIndex,
      })),
    )
    .sort(
      (a, b) =>
        (a.superSetOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.superSetOrder ?? Number.MAX_SAFE_INTEGER) ||
        a.memberIndex - b.memberIndex ||
        a.setIndex - b.setIndex,
    )
    .map(({ entryId, set }) => ({ entryId, set }));

export const memberLetter = (
  entryId: string,
  members: { id: string }[],
): string => {
  const index = members.findIndex((m) => m.id === entryId);
  return index === -1 ? '?' : String.fromCharCode(65 + index);
};

/** "A1", "B1", "A2" — the letter identifies the exercise, the number says which
 *  of *its own* sets this is. Reads as the trainer's own notation and, unlike a
 *  plain 1..N, doesn't renumber every other row when one moves. */
export const slotLabel = (
  slots: SuperSetSlot[],
  index: number,
  members: { id: string }[],
): string => {
  const entryId = slots[index].entryId;
  const occurrence = slots
    .slice(0, index + 1)
    .filter((slot) => slot.entryId === entryId).length;
  return `${memberLetter(entryId, members)}${occurrence}`;
};

/** Which of its member's own sets a slot is, from 0 — the row of that
 *  member's last time its hints come from. */
export const memberSetIndexOf = (
  slots: SuperSetSlot[],
  index: number,
): number =>
  slots.slice(0, index).filter((slot) => slot.entryId === slots[index].entryId)
    .length;

/** How many sets a member holds — the count of its slots in the sequence. */
export const countSlotsFor = (slots: SuperSetSlot[], entryId: string): number =>
  slots.filter((slot) => slot.entryId === entryId).length;

/** The union of every member's metric columns, so one table can hold rows that
 *  don't share a metric. A cell whose metric its own exercise doesn't declare
 *  renders inert (see `SuperSetCard`), which keeps values aligned down the
 *  column instead of scattering them per row. */
export const unionColumns = (
  members: EditorExercise[],
  columnOrder: string[],
): MetricColDef[] => {
  const metrics = new Map<string, Metric>();
  const composites = new Map<string, CompositeMetric>();
  for (const member of members) {
    for (const metric of member.metrics) metrics.set(metric.key, metric);
    for (const composite of member.compositeMetrics ?? [])
      composites.set(composite.key, composite);
  }
  return buildColDefs(
    [...metrics.values()],
    [...composites.values()],
    columnOrder,
  );
};

export const toSlotPayload = (
  slots: SuperSetSlot[],
  kind: EditorKind = 'template',
): (SuperSetSlotPayload | WorkoutSuperSetSlotPayload)[] =>
  slots.map((slot) => ({
    exerciseEntryId: slot.entryId,
    set: toSetPayload(kind)(slot.set),
  }));

// ─── Read-only surfaces (TV, control board, result sheet, export) ────────────

/** setId → "A1" for every set in a block that belongs to a super-set. Derived
 *  straight from the API shape, with none of the editor's state. */
export const superSetSlotLabels = (
  exercises: EditorExercise[],
  groupIds: string[],
): Map<string, string> => {
  const labels = new Map<string, string>();
  for (const groupId of groupIds) {
    const members = superSetMembers(exercises, groupId);
    const slots = buildSlots(members);
    slots.forEach((slot, index) => {
      if (slot.set.id)
        labels.set(slot.set.id, slotLabel(slots, index, members));
    });
  }
  return labels;
};

/** Block exercises with each super-set's members pulled together at the first
 *  member's position, so a group always reads as one run instead of being split
 *  by whatever sits between them in the block order. */
export const groupedExercises = <
  T extends { id: string; superSetGroupId: string | null },
>(
  exercises: T[],
): T[] => {
  const emitted = new Set<string>();
  const ordered: T[] = [];
  for (const entry of exercises) {
    if (emitted.has(entry.id)) continue;
    const groupId = entry.superSetGroupId;
    const run = groupId
      ? exercises.filter((e) => e.superSetGroupId === groupId)
      : [entry];
    for (const member of run) {
      emitted.add(member.id);
      ordered.push(member);
    }
  }
  return ordered;
};

/** One hue per member letter (A, B, C…) so a trainer — or a client squinting at
 *  the TV — tells the exercises apart by colour before reading the letter. Mid
 *  shades, tinted with an alpha, stay legible on light and dark surfaces. Orange
 *  is skipped: it already means warm-up (W). */
const MEMBER_HUES = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#a855f7', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#eab308', // yellow
];

export interface MemberColor {
  /** The letter's ink. */
  color: string;
  backgroundColor: string;
  borderColor: string;
}

/** Colour for the member at `index`, or for a label like "B" / "B2". */
export const memberColor = (indexOrLabel: number | string): MemberColor => {
  const index =
    typeof indexOrLabel === 'number'
      ? indexOrLabel
      : Math.max(0, indexOrLabel.toUpperCase().charCodeAt(0) - 65);
  const hue = MEMBER_HUES[index % MEMBER_HUES.length];
  return {
    color: hue,
    backgroundColor: alpha(hue, 0.15),
    borderColor: alpha(hue, 0.4),
  };
};
