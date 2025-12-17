import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type Language = 'en' | 'de';

const STORAGE_KEY = '@busted/language';

interface LanguageState {
  language: Language;
  isInitialized: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  initializeLanguage: () => Promise<void>;
}

/**
 * Detect browser language, returns 'de' for German, 'en' for everything else
 */
function detectBrowserLanguage(): Language {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'en';
  }

  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  const langCode = browserLang.toLowerCase().split('-')[0];

  return langCode === 'de' ? 'de' : 'en';
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',
  isInitialized: false,

  setLanguage: async (lang: Language) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        await AsyncStorage.setItem(STORAGE_KEY, lang);
      }
      set({ language: lang });
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  },

  initializeLanguage: async () => {
    try {
      // Check for saved preference first
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const savedLang = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedLang === 'de' || savedLang === 'en') {
          set({ language: savedLang, isInitialized: true });
          return;
        }
      }

      // Fall back to browser detection
      const detectedLang = detectBrowserLanguage();
      set({ language: detectedLang, isInitialized: true });
    } catch (error) {
      console.error('Failed to initialize language:', error);
      set({ language: 'en', isInitialized: true });
    }
  },
}));
