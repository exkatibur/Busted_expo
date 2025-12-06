import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { useRealtimeContext, useGameEvents, GameEvent } from '@/contexts/RealtimeContext';
import { useUser } from '@/hooks/useUser';
import { useGameStore } from '@/stores/gameStore';
import { getRoom, updateCurrentQuestion } from '@/services/roomService';
import { getPlayers } from '@/services/playerService';
import { getQuestionById } from '@/services/questionService';
import { castVote, getVoteCount, getUserVote, calculateRoundResults, getRoundResults } from '@/services/voteService';
import { Player } from '@/types';
import { debugLog, debugError } from '@/lib/debug';

export default function GameScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { userId, username } = useUser();

  // Game store
  const {
    currentRoom,
    players,
    currentQuestion,
    currentRound,
    hasVoted,
    isHost,
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
  const [loading, setLoading] = useState(!currentQuestion);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, [code, router, userId]);

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
          setError('Raum nicht gefunden');
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
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
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
      setError(err instanceof Error ? err.message : 'Fehler beim Abstimmen');
      setSubmitting(false);
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
          <Text className="text-text-muted mt-4">Lade Frage...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentQuestion) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 px-6 py-8">
          <Card>
            <Text className="text-error text-lg font-semibold mb-2">Fehler</Text>
            <Text className="text-text-muted mb-4">
              {error || 'Keine Frage geladen'}
            </Text>
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
            <View className="flex-row items-center gap-2">
              <View className="bg-surface px-3 py-2 rounded-full">
                <Text className="text-text-muted font-bold text-sm">{code}</Text>
              </View>
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
                {currentQuestion.text}
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
                    {votedCount} / {activePlayers.length}
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
                Abstimmungsfortschritt
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
            title={submitting ? 'Wird gesendet...' : 'Abstimmen'}
            onPress={handleSubmitVote}
            disabled={!selectedPlayerId || submitting}
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
}
