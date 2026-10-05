import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from '@shared/storage/persist';

/** The member's choice — server-stored (GET/PATCH /configurations/me), shared
 *  with the web. SYSTEM follows the device. */
export type ThemeMode = 'SYSTEM' | 'LIGHT' | 'DARK';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

// Persisted on the device too, so the right theme paints on the first frame
// instead of waiting for the server's answer.
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'SYSTEM',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'bloom-theme', storage: persistStorage },
  ),
);
