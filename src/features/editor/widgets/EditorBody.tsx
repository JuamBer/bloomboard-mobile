import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Layers } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { EditorBlock } from '@shared/types/api.types';
import { ReorderSheet } from '@shared/ui/ReorderSheet';
import { Text } from '@shared/ui/Text';
import { radius } from '@shared/theme/theme';
import { useEditorSource, type EditorDoc } from '../lib/editor-source';
import {
  TemplateSessionContext,
  type TemplateSessionView,
} from '../lib/template-session';
import { BlockCard } from './BlockCard';
import { AddZone } from './EditorParts';
import { BlockEditorSheet } from './EditorSheets';
import { ExercisePickerSheet } from './ExercisePickerSheet';

/**
 * The blocks and exercises of a plan or a workout, with everything that adds
 * to them: loose exercises at the top level, blocks, their editor and their
 * order. The screen around it supplies the header and the EditorSource.
 */
export function EditorBody({
  doc,
  isReadOnly,
  collapsedExercises,
  sessionView = null,
  emptyReadOnly,
}: {
  doc: EditorDoc;
  isReadOnly: boolean;
  /** Folded exercises — a live workout keeps all but the current one folded. */
  collapsedExercises: Set<string>;
  /** Set while a workout is trained live. */
  sessionView?: TemplateSessionView | null;
  /** Shown when there is nothing and nothing can be added. */
  emptyReadOnly: ReactNode;
}) {
  const { t } = useTranslation(['templates', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const editor = useEditorSource();
  const docId = editor.id;

  const [blockSheet, setBlockSheet] = useState<{
    block: EditorBlock | null;
  } | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [autoMetricsEntryId, setAutoMetricsEntryId] = useState<string | null>(
    null,
  );

  const writeDoc = (updated: EditorDoc) =>
    queryClient.setQueryData(editor.queryKey, updated);
  const reorderBlocks = useMutation({
    mutationFn: (blockIds: string[]) =>
      editor.api.reorderBlocks(docId, blockIds),
    onSuccess: writeDoc,
  });
  const removeBlock = useMutation({
    mutationFn: (blockId: string) => editor.api.removeBlock(docId, blockId),
    onSuccess: writeDoc,
  });

  // ─── Exercises without a block ────────────────────────────────────────────
  // "Añadir ejercicio" at the top level puts the exercise in the loose group
  // that ends the document, or starts one. A group started here and closed
  // without adding anything is removed again — no empty, invisible block.
  const [looseAdd, setLooseAdd] = useState<{
    blockId: string;
    created: boolean;
  } | null>(null);
  const startLoose = useMutation({
    mutationFn: () => editor.api.addBlock(docId, {}),
    onSuccess: (created) => {
      queryClient.setQueryData(editor.queryKey, (old?: EditorDoc) =>
        old
          ? {
              ...old,
              blocks: [
                ...(old.blocks ?? []),
                { ...created, exercises: created.exercises ?? [] },
              ],
            }
          : old,
      );
      setLooseAdd({ blockId: created.id, created: true });
    },
  });
  const addLoose = (last?: EditorBlock) => {
    if (startLoose.isPending) return;
    if (last && last.name === null)
      setLooseAdd({ blockId: last.id, created: false });
    else startLoose.mutate();
  };
  const closeLoose = () => {
    if (looseAdd?.created) {
      const block = queryClient
        .getQueryData<EditorDoc>(editor.queryKey)
        ?.blocks?.find((b) => b.id === looseAdd.blockId);
      if (block && (block.exercises ?? []).length === 0)
        removeBlock.mutate(block.id);
    }
    setLooseAdd(null);
  };

  const blocks = doc.blocks ?? [];

  return (
    <View>
      {blocks.length === 0 ? (
        isReadOnly ? (
          <View style={styles.empty}>
            <Layers size={30} color={theme.text(0.2)} />
            <Text variant="bodySmall" muted={0.4} center>
              {emptyReadOnly}
            </Text>
          </View>
        ) : (
          // Two ways to start: straight to exercises, or blocks first.
          <View style={styles.starts}>
            <AddZone
              icon={Dumbbell}
              label={t('templates:detail.addExercise')}
              description={t('templates:detail.addFirstExercise')}
              onPress={() => addLoose()}
              large
            />
            <AddZone
              icon={Layers}
              label={t('templates:detail.addBlock')}
              description={t('templates:detail.addFirstBlock')}
              onPress={() => setBlockSheet({ block: null })}
              large
            />
          </View>
        )
      ) : (
        <TemplateSessionContext.Provider value={sessionView}>
          <View style={styles.blocks}>
            {blocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                docId={docId}
                isReadOnly={isReadOnly}
                collapsedExercises={collapsedExercises}
                onEdit={() => setBlockSheet({ block })}
                onRemove={() => removeBlock.mutate(block.id)}
                onOpenSort={() => setSortOpen(true)}
                isLast={index === blocks.length - 1}
                autoMetricsEntryId={autoMetricsEntryId}
                onAutoMetricsConsumed={() => setAutoMetricsEntryId(null)}
              />
            ))}
            {!isReadOnly && (
              <View style={styles.addRow}>
                <View style={styles.flex}>
                  <AddZone
                    icon={Dumbbell}
                    label={
                      blocks.at(-1)?.name === null
                        ? t('templates:detail.addExercise')
                        : t('templates:detail.addLooseExercise')
                    }
                    onPress={() => addLoose(blocks.at(-1))}
                  />
                </View>
                <View style={styles.flex}>
                  <AddZone
                    icon={Layers}
                    label={t('templates:detail.addBlock')}
                    onPress={() => setBlockSheet({ block: null })}
                  />
                </View>
              </View>
            )}
          </View>
        </TemplateSessionContext.Provider>
      )}

      {looseAdd && (
        <ExercisePickerSheet
          open
          onClose={closeLoose}
          docId={docId}
          blockId={looseAdd.blockId}
          onAdded={(entry) => {
            setAutoMetricsEntryId(entry.id);
            setLooseAdd(null);
          }}
        />
      )}

      <BlockEditorSheet
        open={!!blockSheet}
        onClose={() => setBlockSheet(null)}
        docId={docId}
        block={blockSheet?.block}
      />

      <ReorderSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        title={t('templates:blockCard.sortBlocks')}
        items={blocks.map((b) => ({
          id: b.id,
          label: b.name ?? t('templates:blockCard.loose'),
          sublabel:
            b.name === null
              ? (b.exercises ?? [])
                  .map((e) => e.customName || e.exercise.name)
                  .join(' · ')
              : (b.description ?? undefined),
        }))}
        onSave={(ids) => reorderBlocks.mutate(ids)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  empty: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.06),
    backgroundColor: t.fill(0.03),
  },
  starts: { gap: 10 },
  blocks: { gap: 24 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: -8 },
  flex: { flex: 1 },
}));
