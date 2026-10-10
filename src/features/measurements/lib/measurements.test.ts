import { describe, expect, it } from '@jest/globals';
import type { BodyMeasurement } from '@shared/types/api.types';
import {
  MEASUREMENT_FIELDS,
  dateToDay,
  formatChange,
  formatMeasurement,
  latestValues,
  parseMeasurementInput,
} from './measurements';

const row = (
  measuredOn: string,
  values: Partial<BodyMeasurement>,
): BodyMeasurement =>
  ({
    ...Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f, null])),
    id: measuredOn,
    userId: 'u',
    measuredOn,
    notes: null,
    importSource: null,
    recordedBy: null,
    createdAt: `${measuredOn}T10:00:00Z`,
    updatedAt: `${measuredOn}T10:00:00Z`,
    ...values,
  }) as BodyMeasurement;

describe('latestValues', () => {
  it('reads every field on its own, with the value before it', () => {
    const rows = [
      row('2026-03-10', { weightKg: 100.7, bodyFatPercent: 22.3 }),
      row('2026-02-13', { weightKg: 99.2 }),
      row('2026-02-01', { weightKg: 99.2, bodyFatPercent: 19.6, waistCm: 90 }),
    ];
    expect(latestValues(rows)).toEqual([
      {
        field: 'weightKg',
        value: 100.7,
        measuredOn: '2026-03-10',
        previous: { value: 99.2, measuredOn: '2026-02-13' },
      },
      {
        field: 'bodyFatPercent',
        value: 22.3,
        measuredOn: '2026-03-10',
        previous: { value: 19.6, measuredOn: '2026-02-01' },
      },
      { field: 'waistCm', value: 90, measuredOn: '2026-02-01', previous: null },
    ]);
  });

  it('does not depend on the order it is given', () => {
    const rows = [
      row('2026-01-01', { weightKg: 90 }),
      row('2026-02-01', { weightKg: 91 }),
    ];
    expect(latestValues(rows)[0].value).toBe(91);
  });

  it('is empty with no rows', () => {
    expect(latestValues([])).toEqual([]);
  });
});

describe('formatting', () => {
  it('writes values and changes with their unit', () => {
    expect(formatMeasurement('weightKg', 82.5, 'es')).toBe('82,5 kg');
    expect(formatMeasurement('waistCm', 81, 'en')).toBe('81 cm');
    expect(formatChange('weightKg', 1.5, 'en')).toBe('+1.5 kg');
    expect(formatChange('bodyFatPercent', -2.7, 'es')).toBe('−2,7 %');
    expect(formatChange('waistCm', 0.001, 'es')).toBe('±0 cm');
  });

  it('writes a local day', () => {
    expect(dateToDay(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});

describe('parseMeasurementInput', () => {
  it('takes a comma as the decimal mark and empty as not measured', () => {
    expect(parseMeasurementInput('weightKg', '82,55')).toEqual({
      ok: true,
      value: 82.55,
    });
    expect(parseMeasurementInput('weightKg', '  ')).toEqual({
      ok: true,
      value: null,
    });
  });

  it('refuses what is not a number in range', () => {
    expect(parseMeasurementInput('weightKg', 'abc').ok).toBe(false);
    expect(parseMeasurementInput('weightKg', '0').ok).toBe(false);
    expect(parseMeasurementInput('bodyFatPercent', '80').ok).toBe(false);
  });
});
