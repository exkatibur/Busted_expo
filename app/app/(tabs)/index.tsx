import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useUser } from '@/hooks/useUser';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';
import { useTranslation } from '@/hooks/useTranslation';

export default function HomeScreen() {
  const router = useRouter();
  const { t, isInitialized: langInitialized } = useTranslation();
  const { userId, username, isInitialized, isLoading, setUsername } = useUser();
  const { hasLastRoom, lastRoom, lastRoomCode, clearLastRoom } = useSessionRecovery(userId);
  const [usernameInput, setUsernameInput] = useState('');
  const [mounted, setMounted] = useState(false);

  // Track client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveUsername = async () => {
    if (usernameInput.trim().length >= 3) {
      try {
        await setUsername(usernameInput);
      } catch (error) {
        console.error('Failed to save username:', error);
      }
    }
  };

  // Show loading until mounted on client and user check is done
  if (!mounted || isLoading || !langInitialized) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-text-muted mt-4">{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Username-Auswahl Screen
  if (!isInitialized) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        {/* Language Selector - Top Right */}
        <View className="absolute top-14 right-6 z-10">
          <LanguageSelector compact />
        </View>

        <ScrollView
          contentContainerClassName="flex-1 justify-center px-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-12">
            <View className="w-32 h-32 bg-primary rounded-full items-center justify-center mb-6">
              <Text className="text-6xl">🔥</Text>
            </View>
            <Text className="text-text text-5xl font-bold mb-3">BUSTED!</Text>
            <Text className="text-text-muted text-lg text-center">
              {t('theUltimatePartyGame')}
            </Text>
          </View>

          <Card className="mb-6">
            <Text className="text-text text-xl font-semibold mb-4">
              {t('chooseYourName')}
            </Text>
            <Input
              placeholder={t('namePlaceholder')}
              value={usernameInput}
              onChangeText={setUsernameInput}
              maxLength={20}
              autoFocus
              className="mb-4"
            />
            <Text className="text-text-muted text-sm mb-4">
              {t('minCharacters')}
            </Text>
            <Button
              title={t('letsGo')}
              onPress={handleSaveUsername}
              disabled={usernameInput.trim().length < 3}
              fullWidth
            />
          </Card>

          <Text className="text-text-muted text-sm text-center mb-6">
            {t('nameStoredLocally')}
          </Text>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-surface" />
            <Text className="text-text-muted text-sm mx-4">{t('or')}</Text>
            <View className="flex-1 h-px bg-surface" />
          </View>

          {/* Sign In Option */}
          <Card variant="surface">
            <View className="flex-row items-center">
              <View className="bg-primary/20 w-12 h-12 rounded-full items-center justify-center mr-4">
                <MaterialCommunityIcons name="account-check" size={24} color="#FF6B35" />
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold mb-1">
                  {t('alreadyHaveAccount')}
                </Text>
                <Text className="text-text-muted text-sm">
                  {t('signInToSyncData')}
                </Text>
              </View>
            </View>
            <View className="mt-4">
              <Button
                title={t('signInRegister')}
                onPress={() => router.push('/auth')}
                variant="outline"
                fullWidth
              />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Haupt-Screen mit Willkommensnachricht
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Top Bar with Language Selector only */}
      <View className="absolute top-14 right-6 z-10">
        <LanguageSelector compact />
      </View>

      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-16">
          <View className="w-32 h-32 bg-primary rounded-full items-center justify-center mb-6">
            <Text className="text-6xl">🔥</Text>
          </View>
          <Text className="text-text text-5xl font-bold mb-3">BUSTED!</Text>
          <Text className="text-text-muted text-lg text-center">
            {t('welcomeBack')}, {username}! {t('readyToPlay')}
          </Text>
        </View>

        {/* Session Recovery Banner */}
        {hasLastRoom && lastRoomCode && (
          <Card className="mb-6 border-2 border-primary">
            <View className="flex-row items-center">
              <View className="bg-primary w-12 h-12 rounded-full items-center justify-center mr-4">
                <MaterialCommunityIcons name="reload" size={24} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold">
                  {t('activeGameFound')}
                </Text>
                <Text className="text-text-muted text-sm">
                  {t('room')} {lastRoomCode} • {lastRoom?.status === 'playing' ? t('inProgress') : t('inLobby')}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-3 mt-4">
              <Button
                title={t('returnToGame')}
                onPress={() => router.push(`/room/${lastRoomCode}`)}
                fullWidth
              />
              <Pressable
                onPress={clearLastRoom}
                className="px-4 py-3 items-center justify-center"
              >
                <Text className="text-text-muted">{t('ignore')}</Text>
              </Pressable>
            </View>
          </Card>
        )}

        <View className="gap-4">
          <Button
            title={t('createRoom')}
            onPress={() => router.push('/create')}
            fullWidth
          />
          <Button
            title={t('joinRoom')}
            onPress={() => router.push('/join')}
            variant="outline"
            fullWidth
          />
        </View>

        <View className="mt-12">
          <Text className="text-text-muted text-center text-sm">
            {t('loggedInAs')} <Text className="text-primary">{username}</Text>
          </Text>
        </View>

        <View className="mt-4">
          <Text className="text-text-muted text-center text-xs">
            {t('version')} 1.0.0 • {t('madeWith')} 🔥 {t('by')} Exkatibur
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
