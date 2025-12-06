import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
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
import { useRealtimeContext, useGameEvents, GameEvent } from '@/contexts/RealtimeContext';
import { useUser } from '@/hooks/useUser';
import { useGameStore } from '@/stores/gameStore';
import { getRoom, updateRoomStatus, updateCurrentRound, updateCurrentQuestion } from '@/services/roomService';
import { getRandomQuestion, getUsedQuestions } from '@/services/questionService';
import { getRoundResults } from '@/services/voteService';
import { RoundResult } from '@/types';
import { debugLog, debugError } from '@/lib/debug';

interface ResultItem {
  playerId: string;
  playerName: string;
  votes: number;
  percentage: number;
}

export default function ResultsScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { userId, username } = useUser();

  // Game store
  const {
    currentRoom,
    currentQuestion,
    currentRound,
    vibe,
    isHost,
    setRoom,
    setQuestion,
    setRound,
    nextRound,
    setGameStatus,
    leaveRoom,
  } = useGameStore();

  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [winner, setWinner] = useState<ResultItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingNextRound, setStartingNextRound] = useState(false);

  // Get realtime context (shared channel from layout)
  const { sendEvent } = useRealtimeContext();

  // Game event handler
  const handleGameEvent = useCallback((event: GameEvent) => {
    debugLog('game', 'Results event received:', event);

    if (event.type === 'next_round') {
      // Update state and navigate to game
      setQuestion(event.payload.question);
      setRound(event.payload.round);
      router.push(`/room/${code}/game`);
    }

    if (event.type === 'game_end') {
      setGameStatus('finished');
      router.push(`/room/${code}`);
    }
  }, [code, router, setQuestion, setRound, setGameStatus]);

  // Subscribe to game events
  useGameEvents(handleGameEvent);

  // Load results on mount
  useEffect(() => {
    async function loadResults() {
      if (!code || !userId) return;

      try {
        debugLog('game', 'Loading results...');

        // Get room if not in store
        let room = currentRoom;
        if (!room) {
          room = await getRoom(code);
          if (!room) {
            setError('Raum nicht gefunden');
            setLoading(false);
            return;
          }
          setRoom(room);
        }

        // Restore host status (important for showing "Next Round" button after refresh)
        const isUserHost = room.hostId === userId;
        useGameStore.getState().setUser(userId, username || '', isUserHost);
        debugLog('game', 'Results: isHost =', isUserHost);

        // Get round results
        const roundResults = await getRoundResults(room.id, currentRound);
        if (!roundResults) {
          // No results for this round - a new round might have started
          // Check if room.currentRound is ahead (new round started)
          debugLog('game', 'No results for round', currentRound, '- checking if new round started');

          // Redirect to game page - either new round started or we're in wrong state
          router.push(`/room/${code}/game`);
          return;
        }

        debugLog('game', 'Round results:', roundResults);

        // Parse results
        const parsedResults: ResultItem[] = roundResults.results || [];

        // Sort by votes
        parsedResults.sort((a, b) => b.votes - a.votes);

        setResults(parsedResults);
        if (parsedResults.length > 0) {
          setWinner(parsedResults[0]);
        }

        setLoading(false);

        // Trigger dramatic reveal
        triggerHaptic('heavy');
        setTimeout(() => {
          setShowResults(true);
          triggerHaptic('success');
        }, 1500);
      } catch (err) {
        debugError('game', 'Error loading results:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        setLoading(false);
      }
    }

    loadResults();
  }, [code, currentRoom, currentRound, userId, username, setRoom]);

  const handleNextRound = async () => {
    if (!currentRoom || !isHost) return;

    setStartingNextRound(true);
    try {
      const newRound = currentRound + 1;

      // Get used questions
      const usedQuestionIds = await getUsedQuestions(currentRoom.id);

      // Get a new random question
      const question = await getRandomQuestion(vibe, usedQuestionIds);
      if (!question) {
        throw new Error('Keine Fragen mehr verfügbar');
      }

      // Update room in database
      await updateCurrentRound(currentRoom.id, newRound);
      await updateCurrentQuestion(currentRoom.id, question.id);

      // Update local state
      nextRound();
      setQuestion(question);

      // Broadcast next round to all players
      sendEvent('next_round', {
        question: question,
        round: newRound,
      });

      debugLog('game', 'Next round started:', newRound, question);

      // Navigate to game
      router.push(`/room/${code}/game`);
    } catch (err) {
      debugError('game', 'Error starting next round:', err);
      setError(err instanceof Error ? err.message : 'Fehler');
      setStartingNextRound(false);
    }
  };

  const handleEndGame = async () => {
    if (!currentRoom) return;

    try {
      // Update room status
      await updateRoomStatus(currentRoom.id, 'finished');
      setGameStatus('finished');

      // Broadcast game end
      sendEvent('game_end', {});

      // Navigate to lobby
      router.push(`/room/${code}`);
    } catch (err) {
      debugError('game', 'Error ending game:', err);
      router.push(`/room/${code}`);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    router.push('/');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-text-muted mt-4">Lade Ergebnisse...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 px-6 py-8">
          <Card>
            <Text className="text-error text-lg font-semibold mb-2">Fehler</Text>
            <Text className="text-text-muted mb-4">{error}</Text>
            <Button title="Zur Lobby" onPress={() => router.push(`/room/${code}`)} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

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
            <View className="bg-surface px-4 py-2 rounded-full">
              <Text className="text-primary font-bold">Runde {currentRound}</Text>
            </View>
          </View>

          {/* Question Reminder */}
          {currentQuestion && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <Card variant="surface" className="mb-8">
                <Text className="text-text-muted text-sm mb-2 text-center">
                  Die Frage war:
                </Text>
                <Text className="text-text text-lg text-center font-semibold">
                  {currentQuestion.text}
                </Text>
              </Card>
            </Animated.View>
          )}

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
              {winner && (
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
              )}

              {/* All Results */}
              {results.length > 0 && (
                <>
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
                </>
              )}

              {/* Fun Message */}
              {winner && (
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
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions (Host only, shown after reveal) */}
      {isHost && showResults && (
        <View className="border-t border-surface px-6 py-4">
          <Button
            title={startingNextRound ? 'Startet...' : 'Nächste Runde'}
            onPress={handleNextRound}
            disabled={startingNextRound}
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
