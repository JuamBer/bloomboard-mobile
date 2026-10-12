import { describe, expect, it } from '@jest/globals';
import type { BodyMeasurement } from '@shared/types/api.types';
import {
  MEASUREMENT_FIELDS,
  formatChange,
  formatMeasurement,
  latestValues,
  parseMeasurementInput,
  toTime,
  withTime,
} from './measurements';

const row = (
  measuredAt: string,
  values: Partial<BodyMeasurement>,
): BodyMeasurement =>
  ({
    ...Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f, null])),
    id: measuredAt,
    userId: 'u',
    measuredAt,
    notes: null,
    importSource: null,
    recordedBy: null,
    createdAt: measuredAt,
    updatedAt: measuredAt,
    ...values,
  }) as BodyMeasurement;

describe('latestValues', () => {
  it('reads every field on its own, with the value before it', () => {
    const rows = [
      row('2026-03-10T07:30:00.000Z', {
        weightKg: 100.7,
        bodyFatPercent: 22.3,
      }),
      row('2026-02-13T07:30:00.000Z', { weightKg: 99.2 }),
      row('2026-02-01T07:30:00.000Z', {
        weightKg: 99.2,
        bodyFatPercent: 19.6,
        waistCm: 90,
      }),
    ];
    expect(latestValues(rows)).toEqual([
      {
        field: 'weightKg',
        value: 100.7,
        measuredAt: '2026-03-10T07:30:00.000Z',
        previous: { value: 99.2, measuredAt: '2026-02-13T07:30:00.000Z' },
      },
      {
        field: 'bodyFatPercent',
        value: 22.3,
        measuredAt: '2026-03-10T07:30:00.000Z',
        previous: { value: 19.6, measuredAt: '2026-02-01T07:30:00.000Z' },
      },
      {
        field: 'waistCm',
        value: 90,
        measuredAt: '2026-02-01T07:30:00.000Z',
        previous: null,
      },
    ]);
  });

  it('does not depend on the order it is given', () => {
    const rows = [
      row('2026-01-01T07:30:00.000Z', { weightKg: 90 }),
      row('2026-02-01T07:30:00.000Z', { weightKg: 91 }),
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

  it('reads and sets the time of a local date', () => {
    const date = new Date(2026, 9, 5, 7, 5);
    expect(toTime(date)).toBe('07:05');
    const later = withTime(date, '18:30');
    expect([later.getDate(), later.getHours(), later.getMinutes()]).toEqual([
      5, 18, 30,
    ]);
  });

  it('orders two measurements of one day by their time', () => {
    const rows = [
      row('2026-02-01T07:00:00.000Z', { weightKg: 80 }),
      row('2026-02-01T19:00:00.000Z', { weightKg: 81 }),
    ];
    expect(latestValues(rows)[0]).toMatchObject({
      value: 81,
      previous: { value: 80 },
    });
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

describe('measurements in imperial units', () => {
  it('reads kg as lb and cm as inches', () => {
    expect(formatMeasurement('weightKg', 82.5, 'en', 'IMPERIAL')).toBe(
      '181.9 lb',
    );
    expect(formatMeasurement('waistCm', 81.28, 'en', 'IMPERIAL')).toBe('32 in');
    expect(formatMeasurement('bodyFatPercent', 18.2, 'en', 'IMPERIAL')).toBe(
      '18.2 %',
    );
  });

  it('stores what was typed in lb as kg, and reads it back the same', () => {
    const parsed = parseMeasurementInput('weightKg', '150', 'IMPERIAL');
    expect(parsed.ok && parsed.value).toBeCloseTo(68.0389, 4);
    if (!parsed.ok || parsed.value === null) throw new Error('unparsed');
    expect(formatMeasurement('weightKg', parsed.value, 'en', 'IMPERIAL')).toBe(
      '150 lb',
    );
  });

  it('checks the range in stored units', () => {
    // 900 lb is 408 kg, past the 400 kg the API takes.
    expect(parseMeasurementInput('weightKg', '900', 'IMPERIAL').ok).toBe(false);
  });
});
