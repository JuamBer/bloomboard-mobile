import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Layers, Rows3, Timer } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  BlockMode,
  EditorBlock,
  EditorExercise,
} from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { Checkbox, Segmented } from '@shared/ui/controls';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { PREDEFINED_BLOCKS } from '../constants/predefined-blocks';
import { useEditorSource, type EditorDoc } from '../lib/editor-source';
import { ExerciseThumb } from './EditorParts';

// The block colours offered — the presets' and a few more, as swatches.
const BLOCK_COLORS = [
  '#f59e0b',
  '#22c55e',
  '#ef4444',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#64748b',
];

/**
 * A block: its name, colour and how it is performed — the classic table, or a
 * timed Work/Rest circuit the TV runs on its own. New blocks can start from a
 * preset. Switching a block to Work/Rest makes the server seed TIME and REST
 * on every set, so it says so before saving.
 */
export function BlockEditorSheet({
  open,
  onClose,
  docId,
  block,
}: {
  open: boolean;
  onClose: () => void;
  docId: string;
  block?: EditorBlock | null;
}) {
  const { t } = useTranslation(['templates', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const editor = useEditorSource();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [mode, setMode] = useState<BlockMode>('NORMAL');
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(block?.name ?? '');
      setDescription(block?.description ?? '');
      setColor(block?.color ?? '');
      setMode(block?.mode ?? 'NORMAL');
    }
  }
  const willSeed = mode === 'WORK_REST' && block?.mode !== 'WORK_REST';

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        color: color || undefined,
        mode,
      };
      return block
        ? editor.api.updateBlock(docId, block.id, payload)
        : editor.api.addBlock(docId, payload);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(editor.queryKey, (old?: EditorDoc) => {
        if (!old) return old;
        const blocks = old.blocks ?? [];
        return {
          ...old,
          blocks: block
            ? blocks.map((b) => (b.id === saved.id ? saved : b))
            : [...blocks, saved],
        };
      });
      // A mode switch rewrote the sets: the cards remount on it.
      if (block && block.mode !== mode) {
        void queryClient.invalidateQueries({ queryKey: editor.queryKey });
      }
      onClose();
    },
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        block
          ? t('templates:blockEditor.editTitle')
          : t('templates:blockEditor.newTitle')
      }
      footer={
        <>
          <Button
            label={t('common:cancel')}
            variant="secondary"
            flex
            onPress={onClose}
          />
          <Button
            label={block ? t('common:save') : t('templates:blockEditor.create')}
            flex
            loading={save.isPending}
            disabled={!name.trim()}
            onPress={() => save.mutate()}
          />
        </>
      }
    >
      {!block && (
        <View style={styles.group}>
          <Text variant="label" muted={0.6}>
            {t('templates:blockEditor.presetsLabel')}
          </Text>
          <View style={styles.presets}>
            {PREDEFINED_BLOCKS.map((preset) => (
              <Pressable
                key={preset.name}
                onPress={() => {
                  setName(preset.name);
                  setDescription(preset.description);
                  setColor(preset.color);
                  setMode(preset.mode);
                }}
                accessibilityRole="button"
                style={styles.preset}
              >
                <View
                  style={[styles.swatch, { backgroundColor: preset.color }]}
                />
                <Text variant="caption" weight="bold">
                  {preset.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <TextField
        label={t('templates:blockEditor.nameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={t('templates:blockEditor.namePlaceholder')}
      />
      <View style={styles.group}>
        <Text variant="label" muted={0.6}>
          {t('templates:blockEditor.colorLabel')}
        </Text>
        <View style={styles.colors}>
          {BLOCK_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(color === c ? '' : c)}
              accessibilityRole="radio"
              accessibilityState={{ checked: color === c }}
              accessibilityLabel={c}
              style={[styles.colorDot, { backgroundColor: c }]}
            >
              {color === c && (
                <Check size={16} color="#ffffff" strokeWidth={3} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
      <TextField
        value={description}
        onChangeText={setDescription}
        placeholder={t('templates:blockEditor.descriptionPlaceholder')}
        multiline
      />
      <View style={styles.group}>
        <Text variant="label" muted={0.6}>
          {t('templates:blockEditor.modeLabel')}
        </Text>
        <Segmented<BlockMode>
          value={mode}
          onChange={setMode}
          options={[
            {
              value: 'NORMAL',
              label: t('templates:blockMode.NORMAL'),
              icon: Rows3,
            },
            {
              value: 'WORK_REST',
              label: t('templates:blockMode.WORK_REST'),
              icon: Timer,
            },
          ]}
        />
        <Text variant="caption" muted={0.5}>
          {mode === 'NORMAL'
            ? t('templates:blockMode.NORMALHint')
            : t('templates:blockMode.WORK_RESTHint')}
        </Text>
        {willSeed && (
          <Text variant="caption" color={theme.colors.warningInk}>
            {t('templates:blockMode.seedNotice')}
          </Text>
        )}
      </View>
    </Sheet>
  );
}

/**
 * A name (and, when asked, a description) — renaming an exercise in this plan,
 * a routine, a new workout.
 */
export function NameSheet({
  open,
  onClose,
  title,
  description,
  label,
  placeholder,
  initialName = '',
  initialDescription,
  descriptionPlaceholder,
  confirmLabel,
  loading,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  initialName?: string;
  /** Asks for a description too when set (even empty). */
  initialDescription?: string;
  descriptionPlaceholder?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: (name: string, description?: string) => void;
}) {
  const { t } = useTranslation(['common']);
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDescription ?? '');
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initialName);
      setDesc(initialDescription ?? '');
    }
  }
  const submit = () => {
    if (!name.trim()) return;
    onConfirm(
      name.trim(),
      initialDescription !== undefined ? desc.trim() : undefined,
    );
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={description}
      footer={
        <>
          <Button
            label={t('common:cancel')}
            variant="secondary"
            flex
            onPress={onClose}
          />
          <Button
            label={confirmLabel ?? t('common:save')}
            flex
            loading={loading}
            disabled={!name.trim()}
            onPress={submit}
          />
        </>
      }
    >
      <TextField
        label={label}
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {initialDescription !== undefined && (
        <TextField
          value={desc}
          onChangeText={setDesc}
          placeholder={descriptionPlaceholder}
          multiline
        />
      )}
    </Sheet>
  );
}

/**
 * Builds a super-set from one exercise: tick the partners it is performed
 * with. The *order* they are performed in is set afterwards, in the super-set
 * card's sequence — this only decides membership.
 */
export function CreateSuperSetSheet({
  open,
  onClose,
  docId,
  blockId,
  origin,
  candidates,
}: {
  open: boolean;
  onClose: () => void;
  docId: string;
  blockId: string;
  origin: EditorExercise;
  candidates: EditorExercise[];
}) {
  const { t } = useTranslation(['templates', 'common']);
  const styles = useStyles();
  const queryClient = useQueryClient();
  const editor = useEditorSource();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(new Set());
  }
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const create = useMutation({
    mutationFn: async () => {
      const result = await editor.api.createSuperSetGroup(docId, blockId, {});
      const groups =
        result.blocks?.find((b) => b.id === blockId)?.superSetGroups ?? [];
      const group = groups.reduce(
        (max, g) => (g.order > max.order ? g : max),
        groups[0],
      );
      if (!group) return result;
      // Membership only — no `sets`, so nothing about them is disturbed. The
      // server numbers them into a starting sequence (all of A, then B…).
      for (const entry of [origin, ...candidates]) {
        if (entry.id !== origin.id && !selected.has(entry.id)) continue;
        await editor.api.updateExercise(docId, blockId, entry.id, {
          exerciseId: entry.exerciseId,
          notes: entry.notes ?? undefined,
          customName: entry.customName ?? undefined,
          superSetGroupId: group.id,
          metricKeys: entry.metrics.map((m) => m.key),
          compositeMetricKeys: (entry.compositeMetrics ?? []).map((m) => m.key),
          metricOrder: entry.metricOrder ?? [],
        });
      }
      return editor.api.getById(docId);
    },
    onSuccess: (updated: EditorDoc) => {
      queryClient.setQueryData(editor.queryKey, updated);
      onClose();
    },
  });

  const row = (entry: EditorExercise, fixed = false) => {
    const grouped = !fixed && !!entry.superSetGroupId;
    return (
      <View
        key={entry.id}
        style={[
          styles.memberRow,
          fixed && styles.memberFixed,
          grouped && { opacity: 0.5 },
        ]}
      >
        <Checkbox
          checked={fixed || selected.has(entry.id)}
          disabled={fixed || grouped}
          onChange={() => toggle(entry.id)}
          label={
            <View style={styles.memberLabel}>
              <ExerciseThumb exercise={entry.exercise} size={36} />
              <View style={styles.flex}>
                <Text variant="bodySmall" weight="bold" numberOfLines={2}>
                  {entry.customName || entry.exercise.name}
                </Text>
                {fixed ? (
                  <Text variant="caption" accent>
                    {t('templates:superSet.origin')}
                  </Text>
                ) : grouped ? (
                  <Text variant="caption" muted={0.45}>
                    {t('templates:superSet.alreadyGrouped')}
                  </Text>
                ) : null}
              </View>
            </View>
          }
        />
      </View>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('templates:superSet.createTitle')}
      subtitle={t('templates:superSet.createHint')}
      footer={
        <>
          <Button
            label={t('common:cancel')}
            variant="secondary"
            flex
            onPress={onClose}
          />
          <Button
            label={t('templates:superSet.createCount', {
              count: selected.size + 1,
            })}
            icon={Layers}
            flex
            loading={create.isPending}
            disabled={selected.size === 0}
            onPress={() => create.mutate()}
          />
        </>
      }
    >
      {row(origin, true)}
      {candidates.length === 0 ? (
        <Text variant="bodySmall" muted={0.45}>
          {t('templates:superSet.noCandidates')}
        </Text>
      ) : (
        candidates.map((entry) => row(entry))
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  group: { gap: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.fill(0.04),
  },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRow: {
    padding: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.06),
    backgroundColor: t.fill(0.03),
  },
  memberFixed: { backgroundColor: t.ink(0.1), borderColor: t.ink(0.2) },
  memberLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
}));
