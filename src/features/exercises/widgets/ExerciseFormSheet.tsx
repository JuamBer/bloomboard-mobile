import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMetricsCatalog } from '@features/editor/hooks/useMetricsCatalog';
import {
  meService,
  type ExerciseWritePayload,
} from '@shared/api/services/me.service';
import { fonts, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  BodyPart,
  Difficulty,
  Equipment,
  Exercise,
  Muscle,
} from '@shared/types/api.types';
import { Button, IconButton } from '@shared/ui/Button';
import { MultiSelectField, SelectField } from '@shared/ui/pickers';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import {
  BODY_PART_LABELS,
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
} from '../constants/exercise.labels';

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

type NameStatus = 'idle' | 'checking' | 'available' | 'taken';

/** Whether the member already has an exercise with this exact name — their
 *  names are unique among their own (the catalog's may repeat). */
function useOwnNameStatus(name: string, excludeId?: string): NameStatus {
  const [settled, setSettled] = useState(name.trim());
  useEffect(() => {
    const id = setTimeout(() => setSettled(name.trim()), 400);
    return () => clearTimeout(id);
  }, [name]);
  const { data, isFetching } = useQuery({
    queryKey: ['me', 'exercises', 'name-available', settled, excludeId ?? null],
    queryFn: () => meService.isOwnExerciseNameAvailable(settled, excludeId),
    enabled: settled.length > 0,
  });
  if (!name.trim()) return 'idle';
  if (settled !== name.trim() || isFetching || data === undefined)
    return 'checking';
  return data ? 'available' : 'taken';
}

/**
 * A member's own exercise, created or edited: what it is called, what it is
 * logged with, what it works and how it is done. Members write their own —
 * the AI fill is a paid staff feature, so it is not here (as on the web).
 */
export function ExerciseFormSheet({
  open,
  exercise,
  initialName,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Editing this one; creating when absent. */
  exercise?: Exercise;
  /** Creating: start from what was searched for. */
  initialName?: string;
  onClose: () => void;
  onSaved: (exercise: Exercise) => void;
}) {
  const { t } = useTranslation(['exercises', 'common']);
  const queryClient = useQueryClient();
  const { data: catalog } = useMetricsCatalog();

  const blank = () => ({
    name: exercise?.name ?? initialName ?? '',
    metricKeys: exercise?.metrics.map((m) => m.key) ?? [],
    difficulty: (exercise?.difficulty ?? '') as Difficulty | '',
    equipments: exercise?.equipments ?? ([] as Equipment[]),
    targetMuscles: exercise?.targetMuscles ?? ([] as Muscle[]),
    secondaryMuscles: exercise?.secondaryMuscles ?? ([] as Muscle[]),
    bodyParts: exercise?.bodyParts ?? ([] as BodyPart[]),
    overview: exercise?.overview ?? '',
    instructions: exercise?.instructions ?? [],
    exerciseTips: exercise?.exerciseTips ?? [],
    variations: exercise?.variations ?? [],
    keywords: exercise?.keywords ?? [],
  });
  const [form, setForm] = useState(blank);
  // Fresh each time it opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setForm(blank());
  }
  const set = <K extends keyof ReturnType<typeof blank>>(
    key: K,
    value: ReturnType<typeof blank>[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const nameStatus = useOwnNameStatus(form.name, exercise?.id);
  const nameBlocked = nameStatus === 'taken' || nameStatus === 'checking';

  const save = useMutation({
    mutationFn: () => {
      const payload: ExerciseWritePayload = {
        name: form.name.trim(),
        metricKeys: form.metricKeys,
        difficulty: form.difficulty || null,
        equipments: form.equipments,
        targetMuscles: form.targetMuscles,
        secondaryMuscles: form.secondaryMuscles,
        bodyParts: form.bodyParts,
        overview: form.overview.trim() || null,
        instructions: form.instructions.map((s) => s.trim()).filter(Boolean),
        exerciseTips: form.exerciseTips.map((s) => s.trim()).filter(Boolean),
        variations: form.variations.map((s) => s.trim()).filter(Boolean),
        keywords: form.keywords,
      };
      return exercise
        ? meService.updateExercise(exercise.id, payload)
        : meService.createExercise(payload);
    },
    onSuccess: (saved) => {
      // The member's lists and plan usage.
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      onSaved(saved);
    },
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        exercise
          ? t('exercises:editModal.title')
          : t('exercises:createModal.title')
      }
      full
      footer={
        <>
          <Button
            label={t('common:cancel')}
            variant="secondary"
            flex
            onPress={onClose}
          />
          <Button
            label={t('common:save')}
            flex
            loading={save.isPending}
            disabled={!form.name.trim() || nameBlocked}
            onPress={() => save.mutate()}
          />
        </>
      }
    >
      <TextField
        label={t('exercises:createModal.nameLabel')}
        value={form.name}
        onChangeText={(v) => set('name', v)}
        placeholder="Ej: Press de Banca"
        error={nameStatus === 'taken' ? t('exercises:nameStatus.taken') : null}
        hint={
          nameStatus === 'checking'
            ? t('exercises:nameStatus.checking')
            : nameStatus === 'available'
              ? t('exercises:nameStatus.available')
              : undefined
        }
      />
      <SelectField
        label={t('exercises:createModal.difficultyLabel')}
        value={form.difficulty}
        onChange={(v) => set('difficulty', v as Difficulty | '')}
        options={toOptions(DIFFICULTY_LABELS)}
        clearable
      />
      <MultiSelectField
        label={t('exercises:createModal.metricsLabel')}
        values={form.metricKeys}
        options={(catalog?.metrics ?? []).map((m) => ({
          value: m.key,
          label: m.name,
        }))}
        onChange={(v) => set('metricKeys', v)}
        addLabel={t('exercises:editModal.addMetric')}
      />
      <MultiSelectField
        label={t('exercises:createModal.equipmentLabel')}
        values={form.equipments}
        options={toOptions(EQUIPMENT_LABELS)}
        onChange={(v) => set('equipments', v as Equipment[])}
        addLabel={t('exercises:editModal.addEquipment')}
      />
      <MultiSelectField
        label={t('exercises:createModal.primaryMusclesLabel')}
        values={form.targetMuscles}
        options={toOptions(MUSCLE_LABELS)}
        onChange={(v) => set('targetMuscles', v as Muscle[])}
        addLabel={t('exercises:editModal.addMuscle')}
      />
      <MultiSelectField
        label={t('exercises:createModal.secondaryMusclesLabel')}
        values={form.secondaryMuscles}
        options={toOptions(MUSCLE_LABELS)}
        onChange={(v) => set('secondaryMuscles', v as Muscle[])}
        addLabel={t('exercises:editModal.addMuscle')}
      />
      <MultiSelectField
        label={t('exercises:createModal.bodyPartsLabel')}
        values={form.bodyParts}
        options={toOptions(BODY_PART_LABELS)}
        onChange={(v) => set('bodyParts', v as BodyPart[])}
        addLabel={t('exercises:editModal.addBodyPart')}
      />
      <TextField
        label={t('exercises:createModal.overviewLabel')}
        value={form.overview}
        onChangeText={(v) => set('overview', v)}
        placeholder={t('exercises:editModal.overviewPlaceholder')}
        multiline
      />
      <StringListField
        label={t('exercises:createModal.instructionsLabel')}
        values={form.instructions}
        onChange={(v) => set('instructions', v)}
        placeholder={t('exercises:createModal.instructionsPlaceholder')}
        addLabel={t('exercises:createModal.addInstruction')}
        numbered
      />
      <StringListField
        label={t('exercises:createModal.tipsLabel')}
        values={form.exerciseTips}
        onChange={(v) => set('exerciseTips', v)}
        placeholder={t('exercises:createModal.tipsPlaceholder')}
        addLabel={t('exercises:createModal.addTip')}
      />
      <StringListField
        label={t('exercises:createModal.variationsLabel')}
        values={form.variations}
        onChange={(v) => set('variations', v)}
        placeholder={t('exercises:createModal.variationsPlaceholder')}
        addLabel={t('exercises:createModal.addVariation')}
      />
      <KeywordsField
        label={t('exercises:createModal.keywordsLabel')}
        values={form.keywords}
        onChange={(v) => set('keywords', v)}
        placeholder={t('exercises:createModal.keywordsPlaceholder')}
      />
    </Sheet>
  );
}

/** An ordered list of short texts — steps, tips, variations. */
function StringListField({
  label,
  values,
  onChange,
  placeholder,
  addLabel,
  numbered,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  addLabel: string;
  numbered?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['common']);
  return (
    <View style={styles.field}>
      <Text variant="label" muted={0.6}>
        {label}
      </Text>
      {values.map((value, i) => (
        <View key={i} style={styles.listRow}>
          {numbered ? (
            <View style={styles.step}>
              <Text variant="micro" accent>
                {i + 1}
              </Text>
            </View>
          ) : null}
          <TextInput
            value={value}
            onChangeText={(v) =>
              onChange(values.map((x, j) => (j === i ? v : x)))
            }
            placeholder={placeholder}
            placeholderTextColor={theme.text(0.3)}
            multiline
            style={styles.listInput}
          />
          <IconButton
            icon={X}
            size={32}
            accessibilityLabel={t('common:remove')}
            onPress={() => onChange(values.filter((_, j) => j !== i))}
          />
        </View>
      ))}
      <Button
        label={addLabel}
        icon={Plus}
        variant="secondary"
        size="sm"
        onPress={() => onChange([...values, ''])}
        style={{ alignSelf: 'flex-start' }}
      />
    </View>
  );
}

/** Free keywords as chips: type one and press return. */
function KeywordsField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const add = () => {
    const word = draft.trim();
    if (word && !values.includes(word)) onChange([...values, word]);
    setDraft('');
  };
  return (
    <View style={styles.field}>
      <Text variant="label" muted={0.6}>
        {label}
      </Text>
      {values.length > 0 && (
        <View style={styles.chips}>
          {values.map((word) => (
            <View key={word} style={styles.chip}>
              <Text variant="caption" weight="semibold">
                {word}
              </Text>
              <IconButton
                icon={X}
                size={22}
                accessibilityLabel={`${word} ✕`}
                onPress={() => onChange(values.filter((w) => w !== word))}
              />
            </View>
          ))}
        </View>
      )}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        onBlur={add}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder={placeholder}
        placeholderTextColor={theme.text(0.3)}
        style={styles.keywordInput}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: 8 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  step: {
    width: 22,
    height: 22,
    marginTop: 11,
    borderRadius: 11,
    backgroundColor: t.ink(0.1),
    borderWidth: 1,
    borderColor: t.ink(0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.colors.field,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: t.colors.foreground,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.line(0.12),
    backgroundColor: t.fill(0.04),
  },
  keywordInput: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.colors.field,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: t.colors.foreground,
  },
}));
