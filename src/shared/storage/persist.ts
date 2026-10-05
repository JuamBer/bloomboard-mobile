import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** zustand `persist` storage for preferences (theme, language, the signed-in
 *  user's profile) — never for tokens, which go to secureStorage. */
export const persistStorage = createJSONStorage(() => AsyncStorage);
