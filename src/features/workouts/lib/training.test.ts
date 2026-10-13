import { describe, expect, it } from '@jest/globals';
import { restDays } from './training';

describe('restDays', () => {
  const at = (iso: string) => new Date(iso);

  it('is null before the first workout', () => {
    expect(restDays(null)).toBeNull();
  });

  it('counts calendar days, not 24-hour spans', () => {
    // Late yesterday, early today: one day of rest.
    expect(
      restDays(
        at('2026-10-12T22:30:00').toISOString(),
        at('2026-10-13T07:00:00'),
      ),
    ).toBe(1);
    expect(
      restDays(
        at('2026-10-10T09:30:00').toISOString(),
        at('2026-10-13T20:00:00'),
      ),
    ).toBe(3);
  });

  it('is 0 on a day with a workout', () => {
    expect(
      restDays(
        at('2026-10-13T07:00:00').toISOString(),
        at('2026-10-13T21:00:00'),
      ),
    ).toBe(0);
  });
});
