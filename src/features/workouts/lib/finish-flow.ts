import { create } from 'zustand';

interface FinishFlowState {
  /** The workout just finished, while its summary or wrap-up is open. */
  workoutId: string | null;
  start: (workoutId: string) => void;
  close: () => void;
}

/**
 * What follows finishing a workout: its summary, then the wrap-up (notes,
 * name, times) — WorkoutFinishFlow, mounted once by the member layout. Held here
 * rather than in the page that finished it, because finishing a session's
 * workout ends the session page: the member moves on to the workout's own
 * page while the flow carries on over it.
 */
export const useFinishFlow = create<FinishFlowState>()((set) => ({
  workoutId: null,
  start: (workoutId) => set({ workoutId }),
  close: () => set({ workoutId: null }),
}));
