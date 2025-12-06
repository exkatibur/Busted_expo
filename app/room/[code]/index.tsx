import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { VibeSelector } from '@/components/ui/VibeSelector';
import { VIBES } from '@/constants/dummyData';
import { useRealtimeContext, useGameEvents, GameEvent } from '@/contexts/RealtimeContext';
import { useUser } from '@/hooks/useUser';
import { useGameStore } from '@/stores/gameStore';
import { getRoom, updateRoomVibe, updateRoomStatus, updateCurrentQuestion } from '@/services/roomService';
import { getPlayers, removePlayer } from '@/services/playerService';
import { getRandomQuestion, getUsedQuestions } from '@/services/questionService';
import { Player, Vibe } from '@/types';
import { debugLog, debugError } from '@/lib/debug';

export default function LobbyScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { userId, username } = useUser();

  // Game store
  const {
    currentRoom,
    players,
    vibe,
    isHost,
    setRoom,
    setPlayers,
    setVibe,
    setQuestion,
    setGameStatus,
    leaveRoom,
  } = useGameStore();

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get realtime context (shared channel from layout)
  const { sendEvent, isConnected, players: realtimePlayers } = useRealtimeContext();

  // Sync realtime players to store
  useEffect(() => {
    if (realtimePlayers.length > 0) {
      debugLog('realtime', 'Syncing players from context:', realtimePlayers);
      setPlayers(realtimePlayers);
    }
  }, [realtimePlayers, setPlayers]);

  // Game event handler
  const handleGameEvent = useCallback((event: GameEvent) => {
    debugLog('game', 'Lobby game event received:', event);

    if (event.type === 'game_start') {
      // Navigate to game screen
      setGameStatus('playing');
      setQuestion(event.payload.question);
      router.push(`/room/${code}/game`);
    }
  }, [code, router, setGameStatus, setQuestion]);

  // Subscribe to game events
  useGameEvents(handleGameEvent);

  // Load room data on mount
  useEffect(() => {
    async function loadRoom() {
      if (!code || !userId) return;

      try {
        debugLog('game', 'Loading room:', code);

        // Get room data
        const room = await getRoom(code);
        if (!room) {
          setError('Raum nicht gefunden');
          setLoading(false);
          return;
        }

        // Check if game already started
        if (room.status === 'playing') {
          router.replace(`/room/${code}/game`);
          return;
        }

        // Set room in store
        setRoom(room);
        setVibe(room.vibe);

        // Get players from database
        const dbPlayers = await getPlayers(room.id);
        setPlayers(dbPlayers);

        // Check if current user is host
        const isUserHost = room.hostId === userId;
        useGameStore.getState().setUser(userId, username || '', isUserHost);

        setLoading(false);
      } catch (err) {
        debugError('game', 'Error loading room:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden des Raums');
        setLoading(false);
      }
    }

    loadRoom();
  }, [code, userId, username, setRoom, setPlayers, setVibe, router]);

  const handleCopyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    triggerHaptic('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVibeChange = async (newVibe: Vibe) => {
    if (!currentRoom || !isHost) return;

    try {
      await updateRoomVibe(currentRoom.id, newVibe);
      setVibe(newVibe);
      debugLog('game', 'Vibe updated:', newVibe);
    } catch (err) {
      debugError('game', 'Error updating vibe:', err);
    }
  };

  const handleStartGame = async () => {
    if (!currentRoom || !isHost || players.length < 2) return;

    setStarting(true);
    try {
      // Get used questions (should be empty at start)
      const usedQuestionIds = await getUsedQuestions(currentRoom.id);

      // Get a random question
      const question = await getRandomQuestion(vibe, usedQuestionIds);
      if (!question) {
        throw new Error('Keine Fragen verfügbar');
      }

      // Save question to database (for refresh support)
      await updateCurrentQuestion(currentRoom.id, question.id);

      // Update room status
      await updateRoomStatus(currentRoom.id, 'playing');

      // Set state
      setGameStatus('playing');
      setQuestion(question);

      // Broadcast game start to all players
      sendEvent('game_start', {
        question: question,
        round: 1,
      });

      debugLog('game', 'Game started with question:', question);

      // Navigate to game
      router.push(`/room/${code}/game`);
    } catch (err) {
      debugError('game', 'Error starting game:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Starten');
      setStarting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom || !userId) {
      router.push('/');
      return;
    }

    try {
      await removePlayer(currentRoom.id, userId);
      leaveRoom();
      router.push('/');
    } catch (err) {
      debugError('game', 'Error leaving room:', err);
      router.push('/');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-text-muted mt-4">Lade Raum...</Text>
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
            <Button title="Zurück" onPress={() => router.push('/')} />
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

          {/* Connection Status */}
          {!isConnected && (
            <Card variant="surface" className="mb-4">
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text className="text-text-muted ml-3">Verbinde...</Text>
              </View>
            </Card>
          )}

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
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentUser={player.id === userId}
                />
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
                selectedVibe={vibe}
                onSelect={handleVibeChange}
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
            title={starting ? 'Startet...' : 'Spiel starten'}
            onPress={handleStartGame}
            disabled={players.length < 2 || starting}
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
