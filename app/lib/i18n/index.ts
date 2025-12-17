import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language } from './translations';

const STORAGE_KEY = '@busted/language';

interface I18nState {
  language: Language;
  isLoading: boolean;
  setLanguage: (language: Language) => Promise<void>;
  initializeLanguage: () => Promise<void>;
}

/**
 * i18n Store für Sprachauswahl
 */
export const useI18nStore = create<I18nState>((set) => ({
  language: 'de', // Default: German
  isLoading: true,

  setLanguage: async (language: Language) => {
    await AsyncStorage.setItem(STORAGE_KEY, language);
    set({ language });
  },

  initializeLanguage: async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedLanguage && (savedLanguage === 'de' || savedLanguage === 'en')) {
        set({ language: savedLanguage as Language, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load language:', error);
      set({ isLoading: false });
    }
  },
}));

/**
 * Hook für Übersetzungen
 *
 * @example
 * const { t, language, setLanguage } = useI18n();
 * console.log(t.home.welcome_back); // "Willkommen zurück, {username}!"
 */
export function useI18n() {
  const { language, setLanguage, initializeLanguage, isLoading } = useI18nStore();

  const t = translations[language];

  return {
    t,
    language,
    setLanguage,
    initializeLanguage,
    isLoading,
  };
}

/**
 * Helper function to interpolate variables in translation strings
 *
 * @example
 * interpolate(t.home.welcome_back, { username: 'Max' })
 * // "Willkommen zurück, Max!"
 */
export function interpolate(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/{(\w+)}/g, (_, key) =>
    variables[key]?.toString() ?? `{${key}}`
  );
}

export { translations, Language };
