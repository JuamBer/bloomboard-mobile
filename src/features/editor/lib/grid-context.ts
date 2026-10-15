import { createContext, useContext } from 'react';

/** What a sets table (widgets/SetGrid) shares with its rows and cells. */
export interface GridState {
  /** Each metric column's width, by key — fixed, from the table's room. */
  widths: Map<string, number>;
  /** The set whose Delete is showing, if any: one at a time. */
  openRow: string | null;
  setOpenRow: (id: string | null) => void;
}

export const GridContext = createContext<GridState | null>(null);

/** Closes a swiped row — a field of the table taking the focus does. */
export function useCloseSwipe() {
  const grid = useContext(GridContext);
  return () => grid?.setOpenRow(null);
}
