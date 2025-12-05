import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { DUMMY_PLAYERS, DUMMY_QUESTIONS } from '@/constants/dummyData';

export default function GameScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [currentQuestion] = useState(DUMMY_QUESTIONS.party[0]);
  const [currentRound] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedCount] = useState(2); // In real app: listen to vote events
  const players = DUMMY_PLAYERS;
  const currentUserId = '1'; // In real app: get from storage

  // Filter out current user from voting options
  const votableePlayers = players.filter((p) => p.id !== currentUserId);

  const handleSelectPlayer = (playerId: string) => {
    if (!hasVoted) {
      setSelectedPlayerId(playerId);
      triggerHaptic('selection');
    }
  };

  const handleSubmitVote = () => {
    if (selectedPlayerId) {
      // In real app: broadcast vote event
      setHasVoted(true);
      triggerHaptic('success');

      // Auto-navigate to results when all voted (simulate)
      setTimeout(() => {
        router.push(`/room/${code}/results`);
      }, 2000);
    }
  };

  const handleLeaveRoom = () => {
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
              <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
            </Pressable>
            <View className="flex-row items-center gap-2">
              <View className="bg-surface px-4 py-2 rounded-full">
                <Text className="text-primary font-bold">Runde {currentRound}</Text>
              </View>
            </View>
          </View>

          {/* Question Card */}
          <Card className="mb-8 border-2 border-primary">
            <View className="items-center">
              <View className="bg-primary w-16 h-16 rounded-full items-center justify-center mb-6">
                <Text className="text-4xl">🔥</Text>
              </View>
              <Text className="text-text text-2xl font-bold text-center leading-8">
                {currentQuestion}
              </Text>
            </View>
          </Card>

          {/* Voting Status */}
          {hasVoted ? (
            <Card variant="surface" className="mb-8">
              <View className="items-center">
                <View className="bg-success w-16 h-16 rounded-full items-center justify-center mb-4">
                  <MaterialCommunityIcons name="check" size={32} color="#FFFFFF" />
                </View>
                <Text className="text-text text-xl font-semibold mb-2">
                  Stimme abgegeben!
                </Text>
                <Text className="text-text-muted text-center">
                  Warte auf die anderen Spieler...
                </Text>
                <View className="flex-row items-center gap-2 mt-4">
                  <Text className="text-primary font-bold text-lg">
                    {votedCount} / {players.length}
                  </Text>
                  <Text className="text-text-muted">haben abgestimmt</Text>
                </View>
              </View>
            </Card>
          ) : (
            <>
              {/* Instructions */}
              <Text className="text-text text-lg font-semibold mb-4">
                Wähle einen Spieler
              </Text>

              {/* Player Selection */}
              <View className="gap-3 mb-8">
                {votableePlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onPress={() => handleSelectPlayer(player.id)}
                    selected={selectedPlayerId === player.id}
                  />
                ))}
              </View>
            </>
          )}

          {/* Info */}
          <Card variant="surface">
            <View className="flex-row items-start">
              <View className="bg-primary w-8 h-8 rounded-full items-center justify-center mr-4">
                <Text className="text-lg">ℹ️</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold mb-2">Hinweis</Text>
                <Text className="text-text-muted text-sm">
                  Deine Stimme ist anonym. Niemand sieht, wer für wen gestimmt hat.
                  Am Ende wird nur gezeigt, wer die meisten Stimmen hat.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Submit Button */}
      {!hasVoted && (
        <View className="border-t border-surface px-6 py-4">
          <Button
            title="Abstimmen"
            onPress={handleSubmitVote}
            disabled={!selectedPlayerId}
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
}
