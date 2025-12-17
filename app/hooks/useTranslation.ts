import { useCallback, useEffect } from 'react';
import { useLanguageStore, Language } from '@/stores/languageStore';
import { translations, TranslationKey, getTranslation } from '@/i18n/translations';

export function useTranslation() {
  const { language, isInitialized, setLanguage, initializeLanguage } = useLanguageStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeLanguage();
    }
  }, [isInitialized, initializeLanguage]);

  const t = useCallback(
    (key: TranslationKey): string => {
      return getTranslation(language, key);
    },
    [language]
  );

  return {
    t,
    language,
    setLanguage,
    isInitialized,
    languages: [
      { code: 'en' as Language, label: translations.en.english, flag: '🇬🇧' },
      { code: 'de' as Language, label: translations.de.german, flag: '🇩🇪' },
    ],
  };
}
