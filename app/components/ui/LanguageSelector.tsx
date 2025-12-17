import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { Language } from '@/stores/languageStore';

interface LanguageSelectorProps {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { language, setLanguage, languages } = useTranslation();

  if (compact) {
    return (
      <View className="flex-row items-center gap-2">
        {languages.map((lang) => (
          <Pressable
            key={lang.code}
            onPress={() => setLanguage(lang.code)}
            className={`px-3 py-2 rounded-lg ${
              language === lang.code
                ? 'bg-primary'
                : 'bg-surface'
            }`}
          >
            <Text className="text-lg">{lang.flag}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3">
      {languages.map((lang) => (
        <Pressable
          key={lang.code}
          onPress={() => setLanguage(lang.code)}
          className={`flex-row items-center px-4 py-3 rounded-xl ${
            language === lang.code
              ? 'bg-primary'
              : 'bg-surface border border-white/10'
          }`}
        >
          <Text className="text-xl mr-2">{lang.flag}</Text>
          <Text
            className={`font-medium ${
              language === lang.code ? 'text-white' : 'text-text-muted'
            }`}
          >
            {lang.code === 'en' ? 'English' : 'Deutsch'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
