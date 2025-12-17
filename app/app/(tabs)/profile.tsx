import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useUser } from '@/hooks/useUser';
import { useTranslation } from '@/hooks/useTranslation';
import { triggerHaptic } from '@/lib/haptics';

export default function ProfileScreen() {
  const router = useRouter();
  const { userId, username, setUsername, isAuthenticated, email, signOut, clearUser } = useUser();
  const { t, language, setLanguage } = useTranslation();
  const [newUsername, setNewUsername] = useState(username || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Update input when username changes
  useEffect(() => {
    if (username) {
      setNewUsername(username);
    }
  }, [username]);

  const handleSave = async () => {
    const trimmed = newUsername.trim();

    if (trimmed.length < 3) {
      setError(t('nameMin3Chars'));
      return;
    }

    if (trimmed.length > 20) {
      setError(t('nameMax20Chars'));
      return;
    }

    if (trimmed === username) {
      setError(t('alreadyYourName'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await setUsername(trimmed);
      setSuccess(true);
      triggerHaptic('success');

      // Clear success after 2 seconds
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-8">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-text text-2xl font-bold">{t('profile')}</Text>
          </View>

          {/* Avatar */}
          <View className="items-center mb-8">
            <View className="w-28 h-28 bg-primary rounded-full items-center justify-center mb-4">
              <Text className="text-5xl">
                {username ? username.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <Text className="text-text text-xl font-semibold">
              {username || t('unknown')}
            </Text>
          </View>

          {/* Username ändern */}
          <Card className="mb-6">
            <Text className="text-text text-lg font-semibold mb-4">
              {t('changeDisplayName')}
            </Text>

            <Input
              placeholder={t('newName')}
              value={newUsername}
              onChangeText={(text) => {
                setNewUsername(text);
                setError(null);
                setSuccess(false);
              }}
              maxLength={20}
              autoCapitalize="none"
              className="mb-2"
            />

            <Text className="text-text-muted text-sm mb-4">
              {t('characters3to20')}
            </Text>

            {error && (
              <View className="bg-error/20 p-3 rounded-xl mb-4">
                <Text className="text-error text-sm">{error}</Text>
              </View>
            )}

            {success && (
              <View className="bg-success/20 p-3 rounded-xl mb-4">
                <Text className="text-success text-sm">{t('nameSavedSuccess')}</Text>
              </View>
            )}

            <Button
              title={saving ? t('saving') : t('save')}
              onPress={handleSave}
              disabled={saving || newUsername.trim() === username}
              fullWidth
            />
          </Card>

          {/* Language Selection */}
          <Card className="mb-6">
            <Text className="text-text text-lg font-semibold mb-4">
              {t('language')}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setLanguage('de');
                  triggerHaptic('selection');
                }}
                className={`flex-1 p-4 rounded-xl border-2 ${
                  language === 'de' ? 'border-primary bg-primary/10' : 'border-surface bg-surface'
                }`}
              >
                <Text className="text-2xl text-center mb-2">🇩🇪</Text>
                <Text className={`text-center font-semibold ${language === 'de' ? 'text-primary' : 'text-text'}`}>
                  {t('german')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setLanguage('en');
                  triggerHaptic('selection');
                }}
                className={`flex-1 p-4 rounded-xl border-2 ${
                  language === 'en' ? 'border-primary bg-primary/10' : 'border-surface bg-surface'
                }`}
              >
                <Text className="text-2xl text-center mb-2">🇬🇧</Text>
                <Text className={`text-center font-semibold ${language === 'en' ? 'text-primary' : 'text-text'}`}>
                  {t('english')}
                </Text>
              </Pressable>
            </View>
          </Card>

          {/* Auth Section */}
          {isAuthenticated ? (
            <Card variant="surface" className="mb-6">
              <View className="flex-row items-start">
                <View className="bg-success w-10 h-10 rounded-full items-center justify-center mr-4">
                  <MaterialCommunityIcons name="check" size={24} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-text font-semibold mb-1">{t('loggedIn')}</Text>
                  <Text className="text-text-muted text-sm">
                    {email}
                  </Text>
                  <Pressable
                    onPress={async () => {
                      await signOut();
                      triggerHaptic('success');
                      router.push('/');
                    }}
                    className="mt-3"
                  >
                    <Text className="text-error">{t('signOut')}</Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          ) : (
            <Card variant="surface" className="mb-6">
              <View className="flex-row items-start">
                <View className="bg-surface w-10 h-10 rounded-full items-center justify-center mr-4">
                  <MaterialCommunityIcons name="account-plus" size={24} color="#9CA3AF" />
                </View>
                <View className="flex-1">
                  <Text className="text-text font-semibold mb-1">{t('createAccount')}</Text>
                  <Text className="text-text-muted text-sm mb-3">
                    {t('saveDataOnAllDevices')}
                  </Text>
                  <Button
                    title={t('signInRegister')}
                    onPress={() => router.push('/auth')}
                    variant="outline"
                  />
                </View>
              </View>
            </Card>
          )}

          {/* Logout / Reset Section */}
          <Card variant="surface" className="mb-6">
            <View className="flex-row items-start">
              <View className="bg-error/20 w-10 h-10 rounded-full items-center justify-center mr-4">
                <MaterialCommunityIcons name="logout" size={24} color="#EF4444" />
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold mb-1">
                  {isAuthenticated ? t('signOut') : t('logoutAnonymous')}
                </Text>
                <Text className="text-text-muted text-sm mb-3">
                  {isAuthenticated ? t('signOutDescription') : t('logoutAnonymousDescription')}
                </Text>
                {!showLogoutConfirm ? (
                  <Button
                    title={isAuthenticated ? t('signOut') : t('logoutAnonymous')}
                    onPress={() => setShowLogoutConfirm(true)}
                    variant="outline"
                  />
                ) : (
                  <View>
                    <Text className="text-warning text-sm mb-3">{t('confirmLogout')}</Text>
                    <View className="flex-row gap-3">
                      <Button
                        title={t('yes')}
                        onPress={async () => {
                          if (isAuthenticated) {
                            await signOut();
                          } else {
                            await clearUser();
                          }
                          triggerHaptic('success');
                          router.push('/');
                        }}
                      />
                      <Button
                        title={t('cancel')}
                        onPress={() => setShowLogoutConfirm(false)}
                        variant="outline"
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Card>

          {/* User ID Info */}
          <Card variant="surface">
            <View className="flex-row items-start">
              <View className="bg-surface w-10 h-10 rounded-full items-center justify-center mr-4">
                <MaterialCommunityIcons name="fingerprint" size={24} color="#9CA3AF" />
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold mb-1">{t('yourId')}</Text>
                <Text className="text-text-muted text-xs font-mono">
                  {userId?.substring(0, 8)}...
                </Text>
                <Text className="text-text-muted text-xs mt-2">
                  {isAuthenticated
                    ? t('linkedToAccount')
                    : t('anonymousIdInfo')}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
