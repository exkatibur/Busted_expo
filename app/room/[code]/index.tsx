import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { VibeSelector } from '@/components/ui/VibeSelector';
import { DUMMY_PLAYERS, VIBES } from '@/constants/dummyData';

export default function LobbyScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [players] = useState(DUMMY_PLAYERS); // In real app: subscribe to realtime
  const [selectedVibe, setSelectedVibe] = useState('party');
  const [isHost] = useState(true); // In real app: check user ID vs host ID
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(code);
    triggerHaptic('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    // In real app: broadcast game_start event
    router.push(`/room/${code}/game`);
  };

  const handleLeaveRoom = () => {
    // In real app: leave channel, remove from room
    router.push('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <View className="px-6 py-8">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-8">
            <Pressable
              onPress={handleLeaveRoom}
              className="w-12 h-12 items-center justify-center"
            >
              <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={handleCopyCode}
              className="flex-row items-center gap-2 bg-surface px-4 py-2 rounded-full"
            >
              <Text className="text-primary font-bold text-lg tracking-wider">
                {code}
              </Text>
              <MaterialCommunityIcons
                name={copied ? 'check' : 'content-copy'}
                size={20}
                color={copied ? '#10B981' : '#FF6B35'}
              />
            </Pressable>
          </View>

          {/* Room Status */}
          <View className="mb-8">
            <Text className="text-text text-3xl font-bold mb-2">
              Warte auf Spieler...
            </Text>
            <Text className="text-text-muted text-lg">
              {players.length} {players.length === 1 ? 'Spieler' : 'Spieler'} im Raum
            </Text>
          </View>

          {/* Players List */}
          <View className="mb-8">
            <Text className="text-text text-xl font-semibold mb-4">Spieler</Text>
            <View className="gap-3">
              {players.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </View>
          </View>

          {/* Vibe Selection (Host only) */}
          {isHost && (
            <View className="mb-8">
              <Text className="text-text text-xl font-semibold mb-2">
                Wähle einen Vibe
              </Text>
              <Text className="text-text-muted text-sm mb-4">
                Bestimmt die Art der Fragen
              </Text>
              <VibeSelector
                vibes={VIBES}
                selectedVibe={selectedVibe}
                onSelect={setSelectedVibe}
              />
            </View>
          )}

          {/* Info Card */}
          <Card variant="surface" className="mb-8">
            <View className="flex-row items-start">
              <View className="bg-primary w-8 h-8 rounded-full items-center justify-center mr-4">
                <Text className="text-lg">💡</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold mb-2">
                  {isHost ? 'Du bist der Host' : 'Warte auf den Host'}
                </Text>
                <Text className="text-text-muted text-sm">
                  {isHost
                    ? 'Du kannst das Spiel starten, sobald genug Spieler da sind (mindestens 2)'
                    : 'Der Host startet das Spiel, sobald alle bereit sind'}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Bottom Action (Host only) */}
      {isHost && (
        <View className="border-t border-surface px-6 py-4">
          <Button
            title="Spiel starten"
            onPress={handleStartGame}
            disabled={players.length < 2}
            fullWidth
          />
          {players.length < 2 && (
            <Text className="text-text-muted text-sm text-center mt-3">
              Mindestens 2 Spieler benötigt
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
