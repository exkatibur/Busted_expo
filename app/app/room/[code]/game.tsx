import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { ManualQuestionInput } from '@/components/ui/ManualQuestionInput';
import { useRealtimeContext, useGameEvents, GameEvent } from '@/contexts/RealtimeContext';
import { useUser } from '@/hooks/useUser';
import { useGameStore } from '@/stores/gameStore';
import { getRoom, updateCurrentQuestion, updateCurrentRound } from '@/services/roomService';
import { getQuestionForRoom, getUsedQuestions, getUsedCustomQuestions } from '@/services/questionService';
import { getPlayers } from '@/services/playerService';
import { getQuestionById } from '@/services/questionService';
import { castVote, getVoteCount, getUserVote, calculateRoundResults, getRoundResults } from '@/services/voteService';
import { Player } from '@/types';
import { debugLog, debugError } from '@/lib/debug';
import { useTranslation } from '@/hooks/useTranslation';

export default function GameScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { userId, username } = useUser();
  const { t } = useTranslation();

  // Game store
  const {
    currentRoom,
    players,
    currentQuestion,
    currentRound,
    hasVoted,
    isHost,
    vibe,
    setRoom,
    setPlayers,
    setQuestion,
    setHasVoted,
    setVotedForId,
    addVote,
    leaveRoom,
  } = useGameStore();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [votedCount, setVotedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [loading, setLoading] = useState(!currentQuestion);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  // Track the round we've loaded votes for
  const [loadedRound, setLoadedRound] = useState(0);

  // Reset voting state when round changes
  useEffect(() => {
    debugLog('game', '=== ROUND CHANGE ===', currentRound, '(was loaded for round:', loadedRound, ')');
    if (currentRound !== loadedRound) {
      debugLog('game', 'Resetting vote state for new round');
      setSelectedPlayerId(null);
      setVotedCount(0);
      setSubmitting(false);
      setHasVoted(false);
      setVotedForId(null);
    }
  }, [currentRound, loadedRound, setHasVoted, setVotedForId]);

  // Get realtime context (shared channel from layout)
  const { sendEvent, isConnected, players: realtimePlayers } = useRealtimeContext();

  // Use realtime players if available, otherwise fall back to store
  const activePlayers = realtimePlayers.length > 0 ? realtimePlayers : players;

  // Sync realtime players to store
  useEffect(() => {
    if (realtimePlayers.length > 0) {
      debugLog('realtime', 'Game: Syncing players from context:', realtimePlayers);
      setPlayers(realtimePlayers);
    }
  }, [realtimePlayers, setPlayers]);

  // Debug log for players
  useEffect(() => {
    debugLog('game', 'Active players:', activePlayers.length, activePlayers);
  }, [activePlayers]);

  // Game event handler
  const handleGameEvent = useCallback((event: GameEvent) => {
    debugLog('game', 'Game event received:', event);

    switch (event.type) {
      case 'vote_cast':
        // Only count votes from OTHER players (we already counted our own locally)
        if (event.payload.voterId !== userId) {
          debugLog('game', 'Vote from other player, incrementing count');
          setVotedCount((prev) => prev + 1);
        } else {
          debugLog('game', 'Ignoring own vote broadcast');
        }
        break;

      case 'round_complete':
        // Navigate to results
        router.push(`/room/${code}/results`);
        break;

      case 'game_end':
        // Navigate back to lobby
        router.push(`/room/${code}`);
        break;

      case 'question_skipped':
        // Host skipped the question - update to new question
        debugLog('game', 'Question skipped, loading new question:', event.payload);
        setQuestion(event.payload.question);
        setSelectedPlayerId(null);
        setVotedCount(0);
        setHasVoted(false);
        setVotedForId(null);
        break;
    }
  }, [code, router, userId, setQuestion, setHasVoted, setVotedForId]);

  // Subscribe to game events
  useGameEvents(handleGameEvent);

  // Load game state on mount - ALWAYS load players from DB as fallback
  useEffect(() => {
    async function loadGameState() {
      if (!code || !userId) return;

      try {
        debugLog('game', 'Loading game state...');

        // Get room
        const room = currentRoom || await getRoom(code);
        if (!room) {
          setError(t('roomNotFound'));
          setLoading(false);
          return;
        }
        if (!currentRoom) {
          setRoom(room);
        }

        // ALWAYS load players from DB (reliable source)
        const dbPlayers = await getPlayers(room.id);
        debugLog('game', 'Loaded players from DB:', dbPlayers.length, dbPlayers);
        if (dbPlayers.length > 0) {
          setPlayers(dbPlayers);
        }

        // Check if user is host
        const isUserHost = room.hostId === userId;
        useGameStore.getState().setUser(userId, username || '', isUserHost);

        // Get current question if not set
        if (!currentQuestion && room.currentQuestionId) {
          const question = await getQuestionById(room.currentQuestionId);
          if (question) {
            setQuestion(question);
          }
        }

        // Get current vote count for THIS round (use currentRound from store, not room)
        const count = await getVoteCount(room.id, currentRound);
        debugLog('game', 'Vote count for round', currentRound, ':', count);
        setVotedCount(count);
        setLoadedRound(currentRound);

        // Check if round results already exist (round is complete)
        const existingResults = await getRoundResults(room.id, currentRound);
        if (existingResults) {
          debugLog('game', 'Round already complete, redirecting to results');
          router.push(`/room/${code}/results`);
          return;
        }

        // Check if user has already voted this round
        const existingVote = await getUserVote(room.id, currentRound, userId);
        if (existingVote) {
          debugLog('game', 'User already voted for:', existingVote.votedForId);
          setHasVoted(true);
          setVotedForId(existingVote.votedForId);
        } else {
          // Explicitly reset vote state if no vote exists (important after refresh)
          debugLog('game', 'No existing vote found, resetting vote state');
          setHasVoted(false);
          setVotedForId(null);
          setSelectedPlayerId(null);
        }

        setLoading(false);
      } catch (err) {
        debugError('game', 'Error loading game state:', err);
        setError(err instanceof Error ? err.message : t('errorLoadingRoom'));
        setLoading(false);
      }
    }

    loadGameState();
  }, [code, userId, username, currentRound, currentRoom, setRoom, setPlayers, setQuestion]);

  // All players are votable (including yourself)
  const votablePlayers = activePlayers;

  const handleSelectPlayer = (playerId: string) => {
    if (!hasVoted && !submitting) {
      setSelectedPlayerId(playerId);
      triggerHaptic('selection');
    }
  };

  // Skip question handler (Host only)
  const handleSkipQuestion = async () => {
    if (!currentRoom || !isHost || skipping || !code) return;

    setSkipping(true);
    try {
      // Get used questions including current one
      const usedPresetIds = await getUsedQuestions(currentRoom.id);
      const usedCustomIds = await getUsedCustomQuestions(code);
      if (currentQuestion) {
        usedPresetIds.push(currentQuestion.id);
        usedCustomIds.push(currentQuestion.id);
      }

      // Get a new question (considers both preset and custom)
      // Use the room's hostLanguage to filter preset questions
      const newQuestion = await getQuestionForRoom(code, vibe, usedPresetIds, usedCustomIds, currentRoom.hostLanguage);
      if (!newQuestion) {
        setError(t('noMoreQuestionsAvailable'));
        setSkipping(false);
        return;
      }

      // Update room in database
      await updateCurrentQuestion(currentRoom.id, newQuestion.id);

      // Update local state
      setQuestion(newQuestion);
      setSelectedPlayerId(null);
      setVotedCount(0);
      setHasVoted(false);
      setVotedForId(null);

      // Broadcast to all players
      sendEvent('question_skipped', {
        question: newQuestion,
      });

      triggerHaptic('success');
      debugLog('game', 'Question skipped, new question:', newQuestion);
    } catch (err) {
      debugError('game', 'Error skipping question:', err);
      setError(err instanceof Error ? err.message : t('errorSkipping'));
    } finally {
      setSkipping(false);
    }
  };

  const handleSubmitVote = async () => {
    if (!selectedPlayerId || !currentRoom || !currentQuestion || !userId) return;

    setSubmitting(true);
    try {
      // Cast vote in database
      const vote = await castVote(
        currentRoom.id,
        currentQuestion.id,
        currentRound,
        userId,
        selectedPlayerId
      );

      // Update local state
      addVote(vote);
      setHasVoted(true);
      setVotedForId(selectedPlayerId);
      setVotedCount((prev) => prev + 1);

      // Broadcast vote event
      sendEvent('vote_cast', {
        voterId: userId,
        round: currentRound,
      });

      triggerHaptic('success');
      debugLog('voting', 'Vote cast:', vote);

      // Check if all players have voted
      const newVoteCount = votedCount + 1;
      if (newVoteCount >= activePlayers.length) {
        // Calculate results
        await calculateRoundResults(currentRoom.id, currentRound, currentQuestion.id);

        // Broadcast round complete
        sendEvent('round_complete', {
          round: currentRound,
        });

        // Navigate to results
        setTimeout(() => {
          router.push(`/room/${code}/results`);
        }, 500);
      }
    } catch (err) {
      debugError('voting', 'Error casting vote:', err);
      setError(err instanceof Error ? err.message : t('errorVoting'));
      setSubmitting(false);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    router.push('/');
  };

  const handleManualQuestionAdded = useCallback(() => {
    debugLog('game', 'Manual question added during game');
    triggerHaptic('success');
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-text-muted mt-4">{t('loadingQuestion')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentQuestion) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 px-6 py-8">
          <Card>
            <Text className="text-error text-lg font-semibold mb-2">{t('error')}</Text>
            <Text className="text-text-muted mb-4">
              {error || t('noQuestionLoaded')}
            </Text>
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
            <View className="flex-row items-center gap-2">
              <View className="bg-surface px-3 py-2 rounded-full">
                <Text className="text-text-muted font-bold text-sm">{code}</Text>
              </View>
              <View className="bg-surface px-4 py-2 rounded-full">
                <Text className="text-primary font-bold">{t('round')} {currentRound}</Text>
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
                {currentQuestion.text}
              </Text>
              {/* Skip Button - Host only */}
              {isHost && !hasVoted && (
                <Pressable
                  onPress={handleSkipQuestion}
                  disabled={skipping}
                  className="mt-6 flex-row items-center gap-2 bg-surface px-4 py-2 rounded-full"
                >
                  <MaterialCommunityIcons
                    name="skip-next"
                    size={20}
                    color={skipping ? '#9CA3AF' : '#FF6B35'}
                  />
                  <Text className={skipping ? 'text-text-muted' : 'text-primary'}>
                    {skipping ? t('skipping') : t('skipQuestion')}
                  </Text>
                </Pressable>
              )}
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
                  {t('voteCast')}
                </Text>
                <Text className="text-text-muted text-center">
                  {t('waitingForOtherPlayers')}
                </Text>
                <View className="flex-row items-center gap-2 mt-4">
                  <Text className="text-primary font-bold text-lg">
                    {votedCount} / {activePlayers.length}
                  </Text>
                  <Text className="text-text-muted">{t('haveVoted')}</Text>
                </View>
              </View>
            </Card>
          ) : (
            <>
              {/* Instructions */}
              <Text className="text-text text-lg font-semibold mb-4">
                {t('selectPlayer')}
              </Text>

              {/* Player Selection */}
              <View className="gap-3 mb-8">
                {votablePlayers.map((player) => (
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

          {/* Vote Progress (for waiting state) */}
          {hasVoted && (
            <View className="mb-8">
              <Text className="text-text-muted text-sm text-center mb-2">
                {t('haveVoted')}
              </Text>
              <View className="bg-surface h-3 rounded-full overflow-hidden">
                <View
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${(votedCount / activePlayers.length) * 100}%` }}
                />
              </View>
            </View>
          )}

          {/* Info */}
          <Card variant="surface">
            <View className="flex-row items-start">
              <View className="bg-primary w-8 h-8 rounded-full items-center justify-center mr-4">
                <Text className="text-lg">ℹ️</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold mb-2">{t('hint')}</Text>
                <Text className="text-text-muted text-sm">
                  {t('voteHint')}
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
            title={submitting ? t('submitting') : t('vote')}
            onPress={handleSubmitVote}
            disabled={!selectedPlayerId || submitting}
            fullWidth
          />
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
