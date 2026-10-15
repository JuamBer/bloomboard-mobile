import { describe, expect, it } from '@jest/globals';
import { gridLayout } from './grid-layout';

describe('gridLayout — a sets table sized by its room, not its text', () => {
  it('shares the room left by the fixed cells equally', () => {
    const { widths, overflow } = gridLayout([64, 64, 52], 90, 390);
    expect(widths).toEqual([100, 100, 100]);
    expect(overflow).toBe(false);
  });

  it('keeps a minimum above the share and shares the rest', () => {
    // 3 columns, 200 to share: 104 is over 66.6, so it keeps 104 and the
    // other two split 96.
    const { widths } = gridLayout([104, 40, 40], 0, 200);
    expect(widths).toEqual([104, 48, 48]);
  });

  it('scrolls sideways only when the minimums do not fit', () => {
    const wide = gridLayout([64, 64, 64, 64, 64, 64], 90, 390);
    expect(wide.widths).toEqual([64, 64, 64, 64, 64, 64]);
    expect(wide.total).toBe(474);
    expect(wide.overflow).toBe(true);
    expect(gridLayout([64, 64], 90, 390).overflow).toBe(false);
  });

  it('draws the minimums before the table is measured', () => {
    expect(gridLayout([64, 52], 44, 0)).toEqual({
      widths: [64, 52],
      total: 160,
      overflow: false,
    });
  });
});
