import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from '@shared/storage/persist';

export type Language = 'es' | 'en';

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'es', label: 'ES' },
  { value: 'en', label: 'EN' },
];

/** The device's language when it is English, Spanish otherwise — Spanish is
 *  the product's primary language. */
export const deviceLanguage = (): Language =>
  getLocales()[0]?.languageCode === 'en' ? 'en' : 'es';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

// Persisted on the device: the language is a device preference here, as it is
// a browser one on the web (the server does not store it).
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: deviceLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'bloom-language', storage: persistStorage },
  ),
);
