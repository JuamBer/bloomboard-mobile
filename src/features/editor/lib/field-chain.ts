import { createContext, useContext } from 'react';
import type { TextInput } from 'react-native';

/**
 * The order the value fields of one sets table are filled in — row by row,
 * left to right — so "next" (the keyboard's key, or the digit cap: 3 digits of
 * kilos are a whole weight) moves to the next field instead of leaving the
 * member to aim at it. The web does the same with `useAutoAdvance`; here a
 * field registers its input under its position.
 */
export class FieldChain {
  private fields = new Map<number, TextInput>();

  register(position: number, input: TextInput | null) {
    if (input) this.fields.set(position, input);
    else this.fields.delete(position);
  }

  /** Focuses the first field after `position`; false at the end. */
  next(position: number): boolean {
    const after = [...this.fields.keys()]
      .filter((p) => p > position)
      .sort((a, b) => a - b)[0];
    if (after === undefined) return false;
    this.fields.get(after)?.focus();
    return true;
  }
}

export const FieldChainContext = createContext<FieldChain | null>(null);
export const useFieldChain = () => useContext(FieldChainContext);

/** A field's place in the chain: its row (a set, or a sub-set inside it) and
 *  its column. Sub-sets sort right after their set. */
export const fieldPosition = (row: number, column: number, sub = -1) =>
  row * 10_000 + (sub + 1) * 100 + column;

/** The input accessory bar's id on iOS (number pads have no return key). */
export const NUMPAD_ACCESSORY_ID = 'bloom-numpad';

/**
 * Which chain and position hold the focus — the iOS accessory bar's "Next"
 * reads it, as the bar is one view shared by every field.
 */
export const focusedField: {
  chain: FieldChain | null;
  position: number;
} = { chain: null, position: 0 };
