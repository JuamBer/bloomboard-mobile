import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Dumbbell,
  ListOrdered,
  MoreVertical,
  Pencil,
  Timer,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { EditorBlock } from '@shared/types/api.types';
import { ActionSheet } from '@shared/ui/ActionSheet';
import { IconButton } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { ReorderSheet } from '@shared/ui/ReorderSheet';
import { Text } from '@shared/ui/Text';
import { useEditorSource, type EditorDoc } from '../lib/editor-source';
import { hasIncompleteWorkRest } from '../lib/workout-time';
import { AddZone } from './EditorParts';
import { ExerciseEntryCard } from './ExerciseEntryCard';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { SuperSetCard } from './SuperSetCard';

/**
 * A block — a heading over its exercises, not a card around them (a card
 * spends a border and a padding each side, and on a phone that is width the
 * sets need). A block with no name is the loose exercises at the plan's own
 * level: rows with no heading.
 */
export function BlockCard({
  block,
  docId,
  isReadOnly = false,
  collapsedExercises,
  onEdit,
  onRemove,
  onOpenSort,
  isLast = false,
  autoMetricsEntryId = null,
  onAutoMetricsConsumed,
}: {
  block: EditorBlock;
  docId: string;
  isReadOnly?: boolean;
  collapsedExercises: Set<string>;
  onEdit: () => void;
  onRemove: () => void;
  onOpenSort: () => void;
  /** The last block: a loose group there leaves its "add" to the plan-level
   *  button right below it. */
  isLast?: boolean;
  /** An entry added from the plan level, whose metrics sheet opens. */
  autoMetricsEntryId?: string | null;
  onAutoMetricsConsumed?: () => void;
}) {
  const { t } = useTranslation(['templates', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const editor = useEditorSource();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const exercises = block.exercises ?? [];
  const loose = block.name === null;
  const isWorkRest = block.mode === 'WORK_REST';
  const incomplete = isWorkRest && hasIncompleteWorkRest(block);
  const groups = block.superSetGroups ?? [];

  const writeDoc = (updated: EditorDoc) =>
    queryClient.setQueryData(editor.queryKey, updated);

  // The sort sheet lists loose exercises one by one and each super-set as one
  // row carrying its members; the order inside a super-set is its sequence's.
  const sortUnits = (() => {
    const seen = new Set<string>();
    const units: {
      id: string;
      label: string;
      sublabel?: string;
      entryIds: string[];
    }[] = [];
    for (const entry of exercises) {
      if (seen.has(entry.id)) continue;
      const group = groups.find((g) => g.id === entry.superSetGroupId);
      const members = group
        ? exercises.filter((e) => e.superSetGroupId === group.id)
        : [entry];
      for (const m of members) seen.add(m.id);
      units.push({
        id: group ? `group:${group.id}` : entry.id,
        label: group
          ? t('templates:superSet.title')
          : entry.customName || entry.exercise.name,
        sublabel: group
          ? members.map((m) => m.customName || m.exercise.name).join(' · ')
          : undefined,
        entryIds: members.map((m) => m.id),
      });
    }
    return units;
  })();

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      editor.api.reorderExercises(docId, block.id, ids),
    onSuccess: writeDoc,
  });
  const removeExercise = useMutation({
    mutationFn: (entryId: string) =>
      editor.api.removeExercise(docId, block.id, entryId),
    onSuccess: writeDoc,
  });

  return (
    <View style={styles.block}>
      {!loose && (
        <View style={styles.header}>
          <View
            style={[
              styles.stripe,
              { backgroundColor: block.color ?? theme.fill(0.15) },
            ]}
          />
          <View style={styles.titleBox}>
            <Text variant="subheading" numberOfLines={2}>
              {block.name}
            </Text>
            <View style={styles.badges}>
              {isWorkRest && (
                <View style={[styles.badge, styles.badgeAccent]}>
                  <Timer size={11} color={theme.colors.accentInk} />
                  <Text variant="micro" accent uppercase>
                    {t('templates:blockMode.WORK_REST')}
                  </Text>
                </View>
              )}
              {incomplete && (
                <View style={[styles.badge, styles.badgeWarning]}>
                  <AlertTriangle size={11} color={theme.colors.warningInk} />
                  <Text
                    variant="micro"
                    color={theme.colors.warningInk}
                    uppercase
                  >
                    {t('templates:blockMode.incomplete')}
                  </Text>
                </View>
              )}
            </View>
            {block.description ? (
              <Text variant="caption" muted={0.5}>
                {block.description}
              </Text>
            ) : null}
          </View>
          {!isReadOnly && (
            <IconButton
              icon={MoreVertical}
              size={34}
              accessibilityLabel={t('common:options')}
              onPress={() => setMenuOpen(true)}
            />
          )}
        </View>
      )}

      <View>
        {exercises.length === 0 && loose ? null : exercises.length === 0 ? (
          isReadOnly ? (
            <View style={styles.empty}>
              <Dumbbell size={22} color={theme.text(0.15)} />
              <Text variant="bodySmall" muted={0.3}>
                {t('templates:blockCard.noExercises')}
              </Text>
            </View>
          ) : (
            <AddZone
              icon={Dumbbell}
              label={t('templates:blockCard.addExercise')}
              description={t('templates:blockCard.addFirstExercise')}
              onPress={() => setAdding(true)}
              large
            />
          )
        ) : (
          exercises.map((entry) => {
            const group = groups.find((g) => g.id === entry.superSetGroupId);
            if (group) {
              const members = exercises.filter(
                (e) => e.superSetGroupId === group.id,
              );
              // A super-set draws once, at its first member's position.
              if (members[0]?.id !== entry.id) return null;
              return (
                <SuperSetCard
                  // Remount on a mode flip: switching to Work/Rest seeds
                  // TIME/REST server-side into these autosaving drafts.
                  key={`${group.id}:${block.mode}`}
                  group={group}
                  members={members}
                  docId={docId}
                  blockId={block.id}
                  isReadOnly={isReadOnly}
                  collapsed={members.every((m) => collapsedExercises.has(m.id))}
                  isWorkRest={isWorkRest}
                  onOpenSort={() => setSortOpen(true)}
                />
              );
            }
            return (
              <ExerciseEntryCard
                key={`${entry.id}:${block.mode}`}
                entry={entry}
                docId={docId}
                blockId={block.id}
                isReadOnly={isReadOnly}
                collapsed={collapsedExercises.has(entry.id)}
                superSetGroups={groups}
                blockExercises={exercises}
                isWorkRest={isWorkRest}
                autoOpenMetrics={
                  entry.id === justAdded || entry.id === autoMetricsEntryId
                }
                onAutoOpenConsumed={() => {
                  setJustAdded(null);
                  onAutoMetricsConsumed?.();
                }}
                onOpenSort={() => setSortOpen(true)}
                onRemove={() => removeExercise.mutate(entry.id)}
              />
            );
          })
        )}
        {!isReadOnly && exercises.length > 0 && !(loose && isLast) && (
          <AddZone
            icon={Dumbbell}
            label={t('templates:blockCard.addExercise')}
            onPress={() => setAdding(true)}
          />
        )}
      </View>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={block.name ?? undefined}
        actions={[
          {
            key: 'edit',
            label: t('templates:blockCard.editBlock'),
            icon: Pencil,
            onPress: onEdit,
          },
          exercises.length >= 2 && {
            key: 'sortExercises',
            label: t('templates:blockCard.sortExercises'),
            icon: ListOrdered,
            onPress: () => setSortOpen(true),
          },
          {
            key: 'sortBlocks',
            label: t('templates:blockCard.sortBlocks'),
            icon: ListOrdered,
            onPress: onOpenSort,
          },
          {
            key: 'delete',
            label: t('templates:blockCard.deleteBlock'),
            icon: Trash2,
            destructive: true,
            separated: true,
            onPress: () => setConfirmRemove(true),
          },
        ]}
      />

      <ExercisePickerSheet
        open={adding}
        onClose={() => setAdding(false)}
        docId={docId}
        blockId={block.id}
        title={
          block.name
            ? `${t('templates:addExercise.title')} · ${block.name}`
            : t('templates:addExercise.title')
        }
        onAdded={(entry) => {
          setJustAdded(entry.id);
          setAdding(false);
        }}
      />

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={t('templates:blockCard.deleteBlock')}
        description={t('templates:blockCard.deleteBlockConfirm', {
          name: block.name,
        })}
        confirmLabel={t('common:delete')}
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
      />

      <ReorderSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        title={t('templates:blockCard.sortExercises')}
        items={sortUnits}
        onSave={(ids) => {
          // Each unit back into its members, so a moved super-set keeps its
          // exercises together and the payload is a full permutation.
          const members = new Map(sortUnits.map((u) => [u.id, u.entryIds]));
          reorder.mutate(ids.flatMap((id) => members.get(id) ?? []));
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.line(0.08),
  },
  stripe: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  titleBox: { flex: 1, minWidth: 0, gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  badgeAccent: { backgroundColor: t.ink(0.1), borderColor: t.ink(0.2) },
  badgeWarning: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 24 },
}));
