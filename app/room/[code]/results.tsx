import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  BounceIn,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DUMMY_RESULTS, DUMMY_QUESTIONS } from '@/constants/dummyData';

export default function ResultsScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [showResults, setShowResults] = useState(false);
  const [currentQuestion] = useState(DUMMY_QUESTIONS.party[0]);
  const results = DUMMY_RESULTS.sort((a, b) => b.votes - a.votes);
  const winner = results[0];
  const [isHost] = useState(true); // In real app: check user ID

  useEffect(() => {
    // Dramatic reveal animation
    triggerHaptic('heavy');
    const timer = setTimeout(() => {
      setShowResults(true);
      triggerHaptic('success');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleNextRound = () => {
    // In real app: broadcast next_round event
    router.push(`/room/${code}/game`);
  };

  const handleEndGame = () => {
    // In real app: update room status to finished
    router.push(`/room/${code}`);
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
          </View>

          {/* Question Reminder */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <Card variant="surface" className="mb-8">
              <Text className="text-text-muted text-sm mb-2 text-center">
                Die Frage war:
              </Text>
              <Text className="text-text text-lg text-center font-semibold">
                {currentQuestion}
              </Text>
            </Card>
          </Animated.View>

          {/* BUSTED Reveal */}
          {!showResults ? (
            <Animated.View
              entering={BounceIn.delay(300)}
              className="items-center my-20"
            >
              <View className="bg-primary w-32 h-32 rounded-full items-center justify-center mb-6">
                <Text className="text-7xl">🔥</Text>
              </View>
              <Text className="text-primary text-6xl font-bold">BUSTED!</Text>
            </Animated.View>
          ) : (
            <>
              {/* Winner Podium */}
              <Animated.View entering={FadeInUp.delay(200)}>
                <Card className="mb-8 border-2 border-primary items-center">
                  <View className="items-center">
                    <View className="bg-primary w-20 h-20 rounded-full items-center justify-center mb-4">
                      <Text className="text-5xl">👑</Text>
                    </View>
                    <Text className="text-text text-3xl font-bold mb-2">
                      {winner.playerName}
                    </Text>
                    <Text className="text-primary text-6xl font-bold mb-2">
                      {winner.votes}
                    </Text>
                    <Text className="text-text-muted text-lg">
                      Stimmen ({winner.percentage}%)
                    </Text>
                  </View>
                </Card>
              </Animated.View>

              {/* All Results */}
              <Text className="text-text text-xl font-semibold mb-4">
                Alle Ergebnisse
              </Text>
              <View className="gap-3 mb-8">
                {results.map((result, index) => (
                  <Animated.View
                    key={result.playerId}
                    entering={FadeInDown.delay(400 + index * 100)}
                  >
                    <Card>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <View className="bg-surface w-10 h-10 rounded-full items-center justify-center mr-4">
                            <Text className="text-text-muted font-bold">
                              {index + 1}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-text text-lg font-semibold">
                              {result.playerName}
                            </Text>
                            <View className="bg-background h-2 rounded-full mt-2 overflow-hidden">
                              <View
                                className="bg-primary h-full rounded-full"
                                style={{ width: `${result.percentage}%` }}
                              />
                            </View>
                          </View>
                        </View>
                        <View className="items-center ml-4">
                          <Text className="text-primary text-2xl font-bold">
                            {result.votes}
                          </Text>
                          <Text className="text-text-muted text-xs">
                            {result.percentage}%
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </Animated.View>
                ))}
              </View>

              {/* Fun Message */}
              <Animated.View entering={FadeInUp.delay(800)}>
                <Card variant="surface">
                  <View className="items-center">
                    <Text className="text-4xl mb-3">🎉</Text>
                    <Text className="text-text text-lg font-semibold text-center">
                      {winner.playerName} wurde erwischt!
                    </Text>
                    <Text className="text-text-muted text-center mt-2">
                      Die Gruppe hat gesprochen 😄
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions (Host only, shown after reveal) */}
      {isHost && showResults && (
        <View className="border-t border-surface px-6 py-4">
          <Button
            title="Nächste Runde"
            onPress={handleNextRound}
            fullWidth
          />
          <Pressable onPress={handleEndGame} className="mt-4">
            <Text className="text-text-muted text-center">Spiel beenden</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
