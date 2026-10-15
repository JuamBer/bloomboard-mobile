/**
 * The widths of a sets table's metric columns, worked out from the room the
 * table has — never from what is typed in them.
 *
 * The columns used to be `flex: 1` inside a sideways ScrollView. A scroll
 * gives its content no width to share, so each column took the width of its
 * text: typing "102,5" in kg widened that column and shoved its neighbours
 * along. Now the table measures itself and hands every column a fixed width:
 * the room left by the fixed cells (type, tick…), shared equally, never under
 * a column's minimum. When the minimums do not fit, the table is wider than
 * the phone and scrolls sideways — only then.
 */
export interface GridLayout {
  /** Each metric column's width, in the order given. */
  widths: number[];
  /** The whole row: fixed cells plus every column. */
  total: number;
  /** Wider than the room it has: the table scrolls sideways. */
  overflow: boolean;
}

export function gridLayout(
  minimums: number[],
  fixed: number,
  available: number,
): GridLayout {
  const sum = minimums.reduce((a, b) => a + b, 0);
  if (available <= 0) {
    // Not measured yet: the minimums, as a first frame.
    return { widths: minimums, total: fixed + sum, overflow: false };
  }
  let room = Math.max(0, available - fixed);
  if (sum >= room) {
    return {
      widths: minimums,
      total: fixed + sum,
      overflow: fixed + sum > available + 0.5,
    };
  }

  // Equal shares, except a column whose minimum is above the share keeps its
  // minimum and the others share what is left.
  const widths = [...minimums];
  const open = new Set(minimums.map((_, i) => i));
  let settled = false;
  while (!settled && open.size > 0) {
    settled = true;
    const share = room / open.size;
    for (const i of open) {
      if (minimums[i] > share) {
        widths[i] = minimums[i];
        room -= minimums[i];
        open.delete(i);
        settled = false;
      }
    }
  }
  const share = open.size ? Math.floor((room / open.size) * 10) / 10 : 0;
  for (const i of open) widths[i] = share;
  const total = fixed + widths.reduce((a, b) => a + b, 0);
  return { widths, total, overflow: false };
}
