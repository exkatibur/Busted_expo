import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useUser } from '@/hooks/useUser';
import { useTranslation } from '@/hooks/useTranslation';
import { triggerHaptic } from '@/lib/haptics';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, isLoading } = useUser();
  const { t } = useTranslation();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsernameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Validation
    if (!email.includes('@')) {
      setError(t('authErrorInvalidEmail'));
      return;
    }

    if (password.length < 6) {
      setError(t('authErrorPasswordLength'));
      return;
    }

    if (isRegister && username.trim().length < 3) {
      setError(t('nameMin3Chars'));
      return;
    }

    try {
      if (isRegister) {
        const { error: signUpError } = await signUp(email, password, username.trim());
        if (signUpError) {
          setError(signUpError);
          return;
        }
        setSuccess(t('authRegisterSuccess'));
        triggerHaptic('success');
        // After a delay, go back or show success
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError);
          return;
        }
        triggerHaptic('success');
        router.back();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authErrorGeneric'));
    }
  };

  const handleBack = () => {
    router.back();
  };

  const toggleMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError(null);
    setSuccess(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 py-8">
            {/* Header */}
            <View className="flex-row items-center mb-8">
              <Pressable
                onPress={handleBack}
                className="w-12 h-12 items-center justify-center"
              >
                <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
              </Pressable>
              <Text className="text-text text-2xl font-bold ml-2">
                {isRegister ? t('authRegister') : t('authLogin')}
              </Text>
            </View>

            {/* Logo */}
            <View className="items-center mb-8">
              <View className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-4">
                <Text className="text-4xl">🔥</Text>
              </View>
              <Text className="text-text-muted text-center">
                {isRegister ? t('authRegisterSubtitle') : t('authLoginSubtitle')}
              </Text>
            </View>

            {/* Form */}
            <Card className="mb-6">
              {isRegister && (
                <>
                  <Text className="text-text font-semibold mb-2">{t('authDisplayName')}</Text>
                  <Input
                    placeholder={t('namePlaceholder')}
                    value={username}
                    onChangeText={setUsernameInput}
                    maxLength={20}
                    autoCapitalize="none"
                    className="mb-4"
                  />
                </>
              )}

              <Text className="text-text font-semibold mb-2">{t('authEmail')}</Text>
              <Input
                placeholder={t('authEmailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="mb-4"
              />

              <Text className="text-text font-semibold mb-2">{t('authPassword')}</Text>
              <Input
                placeholder={t('authPasswordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="mb-4"
              />

              {error && (
                <View className="bg-error/20 p-3 rounded-xl mb-4">
                  <Text className="text-error text-sm">{error}</Text>
                </View>
              )}

              {success && (
                <View className="bg-success/20 p-3 rounded-xl mb-4">
                  <Text className="text-success text-sm">{success}</Text>
                </View>
              )}

              <Button
                title={isLoading ? t('authPleaseWait') : (isRegister ? t('authRegister') : t('authLogin'))}
                onPress={handleSubmit}
                disabled={isLoading}
                fullWidth
              />
            </Card>

            {/* Toggle Mode */}
            <Pressable onPress={toggleMode} className="py-4">
              <Text className="text-text-muted text-center">
                {isRegister ? (
                  <>
                    {t('authAlreadyHaveAccount')} <Text className="text-primary">{t('authLogin')}</Text>
                  </>
                ) : (
                  <>
                    {t('authNoAccount')} <Text className="text-primary">{t('authRegister')}</Text>
                  </>
                )}
              </Text>
            </Pressable>

            {/* Info */}
            <Card variant="surface">
              <View className="flex-row items-start">
                <View className="bg-surface w-10 h-10 rounded-full items-center justify-center mr-4">
                  <MaterialCommunityIcons name="information" size={24} color="#9CA3AF" />
                </View>
                <View className="flex-1">
                  <Text className="text-text font-semibold mb-1">{t('authWhyRegister')}</Text>
                  <Text className="text-text-muted text-sm">
                    {t('authWhyRegisterIntro')}
                  </Text>
                  <Text className="text-text-muted text-sm mt-1">
                    • {t('authBenefit1')}
                  </Text>
                  <Text className="text-text-muted text-sm">
                    • {t('authBenefit2')}
                  </Text>
                  <Text className="text-text-muted text-sm">
                    • {t('authBenefit3')}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
