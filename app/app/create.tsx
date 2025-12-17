import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createRoom } from '@/services/roomService';
import { useUser } from '@/hooks/useUser';
import { useGameStore } from '@/stores/gameStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguageStore } from '@/stores/languageStore';

export default function CreateScreen() {
  const router = useRouter();
  const { userId, username } = useUser();
  const { setRoom, setUser } = useGameStore();
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create room on mount
  useEffect(() => {
    async function createNewRoom() {
      try {
        if (!userId || !username) {
          throw new Error('User not initialized');
        }

        // Pass the host's current language to the room
        const result = await createRoom(userId, username, 'party', language);
        setRoomCode(result.code);
        setRoomId(result.roomId);

        // Set user in game store
        setUser(userId, username, true);

        setLoading(false);
      } catch (err) {
        console.error('Failed to create room:', err);
        setError(err instanceof Error ? err.message : 'Failed to create room');
        setLoading(false);
      }
    }

    createNewRoom();
  }, [userId, username, language]);

  const handleCopyCode = async () => {
    if (!roomCode) return;

    await Clipboard.setStringAsync(roomCode);
    triggerHaptic('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    if (!roomCode) return;
    router.push(`/room/${roomCode}`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-text-muted mt-4">{t('creatingRoom')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !roomCode) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 px-6 py-8">
          <Card>
            <Text className="text-error text-lg font-semibold mb-2">{t('error')}</Text>
            <Text className="text-text-muted mb-4">
              {error || t('couldNotCreateRoom')}
            </Text>
            <Button title={t('back')} onPress={() => router.back()} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-between py-8">
        <View>
          <Pressable
            onPress={() => router.back()}
            className="w-12 h-12 items-center justify-center mb-8"
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>

          <Text className="text-text text-3xl font-bold mb-3">
            {t('roomCreated')} 🎉
          </Text>
          <Text className="text-text-muted text-lg mb-12">
            {t('shareCodeWithFriends')}
          </Text>

          <Card className="items-center mb-8">
            <Text className="text-text-muted text-sm mb-4">{t('roomCode')}</Text>
            <Pressable onPress={handleCopyCode}>
              <View className="flex-row items-center gap-4">
                <Text className="text-primary text-6xl font-bold tracking-widest">
                  {roomCode}
                </Text>
                <MaterialCommunityIcons
                  name={copied ? 'check' : 'content-copy'}
                  size={32}
                  color={copied ? '#10B981' : '#FF6B35'}
                />
              </View>
            </Pressable>
            {copied && (
              <Text className="text-success text-sm mt-4">{t('codeCopied')}</Text>
            )}
          </Card>

          <Card variant="surface">
            <View className="flex-row items-start">
              <View className="bg-primary w-8 h-8 rounded-full items-center justify-center mr-4">
                <Text className="text-lg">💡</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold mb-2">{t('tip')}</Text>
                <Text className="text-text-muted text-sm">
                  {t('tipText')}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <Button
          title={t('toLobby')}
          onPress={handleContinue}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
