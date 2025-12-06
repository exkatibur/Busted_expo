import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { useUser } from '@/hooks/useUser';
import { useGameStore } from '@/stores/gameStore';

/**
 * Room Layout - Wraps all room screens with RealtimeProvider
 *
 * This ensures that the realtime channel is created ONCE when entering
 * a room and shared across all screens (lobby, game, results).
 * The channel is only destroyed when navigating away from the room entirely.
 */
export default function RoomLayout() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { userId, username, isLoading: userLoading } = useUser();
  const isHost = useGameStore((state) => state.isHost);

  // Wait for user to be loaded
  if (userLoading || !userId || !username) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-text-muted mt-4">Lade...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!code) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Text className="text-error">Kein Raumcode gefunden</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <RealtimeProvider
      roomCode={code}
      userId={userId}
      username={username}
      isHost={isHost}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0D0D' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="game" />
        <Stack.Screen name="results" />
      </Stack>
    </RealtimeProvider>
  );
}
