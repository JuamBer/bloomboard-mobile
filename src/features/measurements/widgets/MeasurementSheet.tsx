import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeStyles } from '@shared/theme/ThemeProvider';
import type {
  BodyMeasurement,
  MeasurementField,
  MeasurementPayload,
} from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { DateField } from '@shared/ui/pickers';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import {
  MEASUREMENT_FIELDS,
  MEASUREMENT_GROUPS,
  dateToDay,
  dayToDate,
  parseMeasurementInput,
  unitOf,
} from '../lib/measurements';

const toText = (value: number | null | undefined) =>
  value == null ? '' : String(value);

/**
 * One day's measurements — the web's MeasurementDialog: the date, then every
 * value grouped the way a tape measure goes. Fill in only what was measured;
 * editing sends every value, so clearing a field clears it.
 */
export function MeasurementSheet({
  open,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: BodyMeasurement;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: MeasurementPayload & { measuredOn: string }) => void;
}) {
  const { t } = useTranslation(['measurements', 'common']);
  const styles = useStyles();
  const [date, setDate] = useState<Date>(
    initial ? dayToDate(initial.measuredOn) : new Date(),
  );
  const [texts, setTexts] = useState<Record<MeasurementField, string>>(
    () =>
      Object.fromEntries(
        MEASUREMENT_FIELDS.map((f) => [f, toText(initial?.[f])]),
      ) as Record<MeasurementField, string>,
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const parsed = MEASUREMENT_FIELDS.map((field) => ({
    field,
    result: parseMeasurementInput(field, texts[field]),
  }));
  const invalid = parsed.some((p) => !p.result.ok);
  const empty = parsed.every((p) => p.result.ok && p.result.value === null);

  const submit = () => {
    if (invalid || empty || saving) return;
    onSubmit({
      measuredOn: dateToDay(date),
      ...Object.fromEntries(
        parsed.map((p) => [p.field, p.result.ok ? p.result.value : null]),
      ),
      notes: notes.trim() || null,
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={
        initial
          ? t('measurements:dialog.titleEdit')
          : t('measurements:dialog.titleNew')
      }
      subtitle={t('measurements:dialog.hint')}
      footer={
        <View style={styles.footer}>
          {empty ? (
            <Text variant="caption" muted={0.45} center>
              {t('measurements:dialog.fillOne')}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <Button
              label={t('common:cancel')}
              variant="secondary"
              flex
              onPress={onClose}
            />
            <Button
              label={t('measurements:dialog.save')}
              flex
              loading={saving}
              disabled={invalid || empty}
              onPress={submit}
            />
          </View>
        </View>
      }
    >
      <View style={styles.body}>
        <DateField
          label={t('measurements:dialog.date')}
          value={date}
          onChange={(d) => d && setDate(d)}
          maximumDate={new Date()}
        />
        {MEASUREMENT_GROUPS.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text variant="eyebrow" muted={0.45}>
              {t(`measurements:groups.${group.key}`)}
            </Text>
            <View style={styles.grid}>
              {group.fields.map((field) => {
                const bad = !parseMeasurementInput(field, texts[field]).ok;
                return (
                  <View key={field} style={styles.cell}>
                    <TextField
                      label={t(`measurements:fields.${field}`)}
                      value={texts[field]}
                      onChangeText={(v) =>
                        setTexts((prev) => ({ ...prev, [field]: v }))
                      }
                      keyboardType="decimal-pad"
                      error={bad ? ' ' : undefined}
                      trailing={
                        <Text variant="caption" muted={0.45}>
                          {unitOf(field)}
                        </Text>
                      }
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <TextField
          label={t('measurements:dialog.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={2000}
          placeholder={t('measurements:dialog.notesPlaceholder')}
        />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles(() => ({
  body: { gap: 20 },
  group: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', paddingHorizontal: 6, paddingBottom: 10 },
  // The sheet's footer is a row; this column takes all of it.
  footer: { flex: 1, gap: 8 },
  buttons: { flexDirection: 'row', gap: 10 },
}));
