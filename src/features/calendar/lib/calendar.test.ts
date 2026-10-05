import { describe, expect, it } from '@jest/globals';
import { byDay, gridRange, isRunning, monthGrid } from './calendar';

describe('the month grid', () => {
  it('draws whole weeks, Monday first', () => {
    // October 2026 starts on a Thursday and ends on a Saturday.
    const days = monthGrid(new Date(2026, 9, 15));
    expect(days).toHaveLength(35);
    expect(days[0]).toEqual(new Date(2026, 8, 28)); // Monday 28 Sep
    expect(days[34]).toEqual(new Date(2026, 10, 1)); // Sunday 1 Nov
    expect(
      days.every((d, i) => i === 0 || d.getDate() !== days[i - 1].getDate()),
    ).toBe(true);
  });

  it('runs to six weeks when the month needs them', () => {
    // August 2026 starts on a Saturday and has 31 days.
    expect(monthGrid(new Date(2026, 7, 1))).toHaveLength(42);
  });

  it('loads the sessions of every day it shows', () => {
    const { from, to } = gridRange(new Date(2026, 9, 15));
    expect(new Date(from)).toEqual(new Date(2026, 8, 28, 0, 0, 0, 0));
    expect(new Date(to)).toEqual(new Date(2026, 10, 1, 23, 59, 59, 999));
  });
});

describe('sessions by day', () => {
  it('groups by local day, earliest first', () => {
    const s = (id: string, startsAt: Date) => ({
      id,
      startsAt: startsAt.toISOString(),
    });
    const days = byDay([
      s('b', new Date(2026, 9, 5, 18, 0)),
      s('a', new Date(2026, 9, 5, 9, 0)),
      s('c', new Date(2026, 9, 6, 7, 30)),
    ]);
    expect([...days.keys()]).toEqual(['2026-10-05', '2026-10-06']);
    expect(days.get('2026-10-05')!.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('knows a session is running between its start and its end', () => {
    const session = {
      startsAt: new Date(2026, 9, 5, 9, 0).toISOString(),
      endsAt: new Date(2026, 9, 5, 10, 0).toISOString(),
    };
    expect(isRunning(session, new Date(2026, 9, 5, 9, 30).getTime())).toBe(
      true,
    );
    expect(isRunning(session, new Date(2026, 9, 5, 10, 0).getTime())).toBe(
      false,
    );
  });
});
