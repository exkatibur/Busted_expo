import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
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
import { ManualQuestionInput } from '@/components/ui/ManualQuestionInput';
import { useRealtimeContext, useGameEvents, GameEvent } from '@/contexts/RealtimeContext';
import { useUser } from '@/hooks/useUser';
import { useGameStore } from '@/stores/gameStore';
import { getRoom, updateRoomStatus, updateCurrentRound, updateCurrentQuestion } from '@/services/roomService';
import { getQuestionForRoom, getUsedQuestions, getUsedCustomQuestions } from '@/services/questionService';
import { getRoundResults, getVotersForPlayer } from '@/services/voteService';
import { RoundResult } from '@/types';
import { debugLog, debugError } from '@/lib/debug';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();

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

  // Reveal voters feature state
  const [revealRequested, setRevealRequested] = useState(false);
  const [revealApprovals, setRevealApprovals] = useState<Set<string>>(new Set());
  const [hasApproved, setHasApproved] = useState(false);
  const [revealedVoters, setRevealedVoters] = useState<string[]>([]);

  // Manual question input state
  const [showManualInput, setShowManualInput] = useState(false);

  // Get realtime context (shared channel from layout)
  const { sendEvent } = useRealtimeContext();

  // Get players for reveal feature
  const { players } = useGameStore();

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

    // Reveal voters feature events
    if (event.type === 'reveal_request') {
      setRevealRequested(true);
      setRevealApprovals(new Set());
      setHasApproved(false);
      setRevealedVoters([]);
      triggerHaptic('warning');
    }

    if (event.type === 'reveal_response') {
      const { approverId, approved } = event.payload;
      if (approved) {
        setRevealApprovals((prev) => {
          const newSet = new Set(prev);
          newSet.add(approverId);
          return newSet;
        });
      }
    }

    if (event.type === 'reveal_result') {
      const { voterNames } = event.payload;
      setRevealedVoters(voterNames);
      triggerHaptic('success');
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
            setError(t('roomNotFound'));
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
        setError(err instanceof Error ? err.message : t('errorLoadingRoom'));
        setLoading(false);
      }
    }

    loadResults();
  }, [code, currentRoom, currentRound, userId, username, setRoom]);

  const handleNextRound = async () => {
    if (!currentRoom || !isHost || !code) return;

    setStartingNextRound(true);
    try {
      const newRound = currentRound + 1;

      // Get used questions (both preset and custom)
      const usedPresetIds = await getUsedQuestions(currentRoom.id);
      const usedCustomIds = await getUsedCustomQuestions(code);

      // Get a new question (considers both preset and custom)
      const question = await getQuestionForRoom(code, vibe, usedPresetIds, usedCustomIds);
      if (!question) {
        throw new Error(t('noMoreQuestions'));
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
      setError(err instanceof Error ? err.message : t('error'));
      setStartingNextRound(false);
    }
  };

  // Reveal voters feature handlers
  const isWinner = winner?.playerId === userId;
  const totalPlayers = players.length;
  const approvalsNeeded = Math.ceil(totalPlayers * 0.5);
  const hasEnoughApprovals = revealApprovals.size >= approvalsNeeded;

  const handleRequestReveal = () => {
    if (!isWinner) return;
    setRevealRequested(true);
    sendEvent('reveal_request', {
      winnerId: userId,
      winnerName: winner?.playerName,
    });
    triggerHaptic('notification');
  };

  const handleApproveReveal = async (approved: boolean) => {
    setHasApproved(true);
    sendEvent('reveal_response', {
      approverId: userId,
      approved,
    });

    if (approved) {
      // Check if we now have enough approvals
      const newApprovals = new Set(revealApprovals);
      newApprovals.add(userId!);

      if (newApprovals.size >= approvalsNeeded && currentRoom && winner) {
        // Get voters and reveal 3 random ones
        try {
          const voterIds = await getVotersForPlayer(currentRoom.id, currentRound, winner.playerId);
          // Get player names for voter IDs
          const voterNames = voterIds
            .map((id) => players.find((p) => p.id === id)?.username)
            .filter(Boolean) as string[];

          // Shuffle and take 3
          const shuffled = voterNames.sort(() => Math.random() - 0.5);
          const selectedVoters = shuffled.slice(0, 3);

          sendEvent('reveal_result', {
            voterNames: selectedVoters,
          });
          setRevealedVoters(selectedVoters);
        } catch (err) {
          debugError('game', 'Error getting voters:', err);
        }
      }
    }
    triggerHaptic('selection');
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

  const handleManualQuestionAdded = useCallback(() => {
    debugLog('game', 'Manual question added during results');
    triggerHaptic('success');
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-text-muted mt-4">{t('loadingResults')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 px-6 py-8">
          <Card>
            <Text className="text-error text-lg font-semibold mb-2">{t('error')}</Text>
            <Text className="text-text-muted mb-4">{error}</Text>
            <Button title={t('toLobby')} onPress={() => router.push(`/room/${code}`)} />
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
              <Text className="text-primary font-bold">{t('round')} {currentRound}</Text>
            </View>
          </View>

          {/* Question Reminder */}
          {currentQuestion && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <Card variant="surface" className="mb-8">
                <Text className="text-text-muted text-sm mb-2 text-center">
                  {t('theQuestionWas')}
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
              {/* Visual Podium - Top 3 */}
              {results.length > 0 && (
                <Animated.View entering={FadeInUp.delay(200)} className="mb-8">
                  {/* Podium Container */}
                  <View className="flex-row justify-center items-end h-72 px-2">
                    {/* 2nd Place - Left */}
                    {results[1] && (
                      <Animated.View
                        entering={FadeInUp.delay(400)}
                        className="items-center flex-1 mx-1"
                      >
                        {/* Player Info */}
                        <View className="items-center mb-2">
                          <View className="bg-gray-400 w-14 h-14 rounded-full items-center justify-center mb-1">
                            <Text className="text-3xl">🥈</Text>
                          </View>
                          <Text className="text-text text-sm font-bold text-center" numberOfLines={1}>
                            {results[1].playerName}
                          </Text>
                          <Text className="text-text-muted text-xs">
                            {results[1].votes} ({results[1].percentage}%)
                          </Text>
                        </View>
                        {/* Podium Block */}
                        <View className="bg-gray-600 w-full h-24 rounded-t-lg items-center justify-center border-2 border-gray-500">
                          <Text className="text-white text-4xl font-bold">2</Text>
                        </View>
                      </Animated.View>
                    )}

                    {/* 1st Place - Center (Tallest) */}
                    {results[0] && (
                      <Animated.View
                        entering={BounceIn.delay(300)}
                        className="items-center flex-1 mx-1"
                      >
                        {/* Player Info */}
                        <View className="items-center mb-2">
                          <View className="bg-yellow-500 w-16 h-16 rounded-full items-center justify-center mb-1">
                            <Text className="text-4xl">👑</Text>
                          </View>
                          <Text className="text-text text-base font-bold text-center" numberOfLines={1}>
                            {results[0].playerName}
                          </Text>
                          <Text className="text-primary text-sm font-semibold">
                            {results[0].votes} ({results[0].percentage}%)
                          </Text>
                        </View>
                        {/* Podium Block */}
                        <View className="bg-primary w-full h-36 rounded-t-lg items-center justify-center border-2 border-orange-400">
                          <Text className="text-white text-5xl font-bold">1</Text>
                        </View>
                      </Animated.View>
                    )}

                    {/* 3rd Place - Right */}
                    {results[2] && (
                      <Animated.View
                        entering={FadeInUp.delay(500)}
                        className="items-center flex-1 mx-1"
                      >
                        {/* Player Info */}
                        <View className="items-center mb-2">
                          <View className="bg-amber-700 w-12 h-12 rounded-full items-center justify-center mb-1">
                            <Text className="text-2xl">🥉</Text>
                          </View>
                          <Text className="text-text text-sm font-bold text-center" numberOfLines={1}>
                            {results[2].playerName}
                          </Text>
                          <Text className="text-text-muted text-xs">
                            {results[2].votes} ({results[2].percentage}%)
                          </Text>
                        </View>
                        {/* Podium Block */}
                        <View className="bg-amber-800 w-full h-16 rounded-t-lg items-center justify-center border-2 border-amber-600">
                          <Text className="text-white text-3xl font-bold">3</Text>
                        </View>
                      </Animated.View>
                    )}
                  </View>

                  {/* Podium Base */}
                  <View className="bg-surface h-2 mx-4 rounded-b-lg" />
                </Animated.View>
              )}

              {/* Remaining Results (4th place and beyond) */}
              {results.length > 3 && (
                <>
                  <Text className="text-text text-xl font-semibold mb-4">
                    {t('allResults')}
                  </Text>
                  <View className="gap-3 mb-8">
                    {results.slice(3).map((result, index) => (
                      <Animated.View
                        key={result.playerId}
                        entering={FadeInDown.delay(600 + index * 100)}
                      >
                        <Card>
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1">
                              <View className="bg-surface w-10 h-10 rounded-full items-center justify-center mr-4">
                                <Text className="text-text-muted font-bold">
                                  {index + 4}
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

              {/* Reveal Voters Feature */}
              {winner && showResults && (
                <Animated.View entering={FadeInUp.delay(700)}>
                  {/* Winner can request reveal */}
                  {isWinner && !revealRequested && (
                    <Card className="mb-4 border-2 border-warning">
                      <View className="items-center">
                        <Text className="text-warning text-lg font-semibold mb-2">
                          {t('whoVotedForYou')}
                        </Text>
                        <Text className="text-text-muted text-center text-sm mb-4">
                          {t('askPlayersToReveal')}
                        </Text>
                        <Button
                          title={t('sendRequest')}
                          onPress={handleRequestReveal}
                          variant="outline"
                        />
                      </View>
                    </Card>
                  )}

                  {/* Other players see approval request */}
                  {revealRequested && !isWinner && !hasApproved && (
                    <Card className="mb-4 border-2 border-warning">
                      <View className="items-center">
                        <Text className="text-warning text-lg font-semibold mb-2">
                          {winner.playerName} {t('wantsToKnowWhoVoted')}
                        </Text>
                        <Text className="text-text-muted text-center text-sm mb-4">
                          💡 {t('dontGiveApproval')} {winner.playerName} {t('doingSomething')}
                        </Text>
                        <View className="flex-row gap-3">
                          <Button
                            title={t('allow')}
                            onPress={() => handleApproveReveal(true)}
                            variant="primary"
                          />
                          <Pressable
                            onPress={() => handleApproveReveal(false)}
                            className="px-4 py-3"
                          >
                            <Text className="text-text-muted">{t('deny')}</Text>
                          </Pressable>
                        </View>
                      </View>
                    </Card>
                  )}

                  {/* Show approval progress */}
                  {revealRequested && revealedVoters.length === 0 && (
                    <Card variant="surface" className="mb-4">
                      <View className="items-center">
                        <Text className="text-text font-semibold mb-2">
                          {t('approvals')}: {revealApprovals.size} / {approvalsNeeded}
                        </Text>
                        <View className="bg-background h-3 w-full rounded-full overflow-hidden">
                          <View
                            className="bg-warning h-full rounded-full"
                            style={{ width: `${Math.min((revealApprovals.size / approvalsNeeded) * 100, 100)}%` }}
                          />
                        </View>
                        <Text className="text-text-muted text-xs mt-2">
                          {t('approvalNeeded')}
                        </Text>
                      </View>
                    </Card>
                  )}

                  {/* Show revealed voters */}
                  {revealedVoters.length > 0 && (
                    <Card className="mb-4 border-2 border-success">
                      <View className="items-center">
                        <Text className="text-success text-lg font-semibold mb-3">
                          {t('thesePlayersVotedForYou')}
                        </Text>
                        {revealedVoters.map((name, index) => (
                          <View key={index} className="flex-row items-center mb-2">
                            <View className="bg-success w-8 h-8 rounded-full items-center justify-center mr-3">
                              <Text className="text-white font-bold">{index + 1}</Text>
                            </View>
                            <Text className="text-text text-lg font-semibold">{name}</Text>
                          </View>
                        ))}
                      </View>
                    </Card>
                  )}
                </Animated.View>
              )}

              {/* Fun Message */}
              {winner && (
                <Animated.View entering={FadeInUp.delay(800)}>
                  <Card variant="surface">
                    <View className="items-center">
                      <Text className="text-4xl mb-3">🎉</Text>
                      <Text className="text-text text-lg font-semibold text-center">
                        {winner.playerName} {t('wasBusted')}
                      </Text>
                      <Text className="text-text-muted text-center mt-2">
                        {t('groupHasSpoken')} 😄
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
            title={startingNextRound ? t('starting') : t('nextRound')}
            onPress={handleNextRound}
            disabled={startingNextRound}
            fullWidth
          />
          <Pressable onPress={handleEndGame} className="mt-4">
            <Text className="text-text-muted text-center">{t('endGame')}</Text>
          </Pressable>
        </View>
      )}

      {/* Floating Add Question Button */}
      <TouchableOpacity
        onPress={() => setShowManualInput(true)}
        className="absolute bottom-24 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: '#FF6B35',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Manual Question Input Modal */}
      <ManualQuestionInput
        visible={showManualInput}
        onClose={() => setShowManualInput(false)}
        roomCode={code || ''}
        userId={userId}
        onQuestionAdded={handleManualQuestionAdded}
      />
    </SafeAreaView>
  );
}
