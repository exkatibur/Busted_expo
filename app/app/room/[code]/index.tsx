import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { VibeSelector } from '@/components/ui/VibeSelector';
import { AIQuestionGenerator } from '@/components/ui/AIQuestionGenerator';
import { PersonalQuestionPool } from '@/components/ui/PersonalQuestionPool';
import { ManualQuestionInput } from '@/components/ui/ManualQuestionInput';
import { VIBES } from '@/constants/dummyData';
import { useRealtimeContext, useGameEvents, GameEvent } from '@/contexts/RealtimeContext';
import { useUser } from '@/hooks/useUser';
import { usePremium } from '@/hooks/usePremium';
import { useGameStore } from '@/stores/gameStore';
import { getRoom, updateRoomVibe, updateRoomStatus, updateCurrentQuestion } from '@/services/roomService';
import { getPlayers, removePlayer } from '@/services/playerService';
import { getQuestionForRoom, getUsedQuestions, getUsedCustomQuestions } from '@/services/questionService';
import { countCustomQuestions, GeneratedQuestion } from '@/services/aiQuestionService';
import { getPersonalQuestionCount } from '@/services/personalQuestionService';
import { saveLastRoom, clearLastRoom } from '@/hooks/useSessionRecovery';
import { Player, Vibe } from '@/types';
import { debugLog, debugError } from '@/lib/debug';
import { useTranslation } from '@/hooks/useTranslation';

export default function LobbyScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { userId, username } = useUser();
  const { t } = useTranslation();

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
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showPersonalPool, setShowPersonalPool] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [customQuestionCount, setCustomQuestionCount] = useState(0);
  const [personalQuestionCount, setPersonalQuestionCount] = useState(0);

  // Premium status
  const { data: subscription } = usePremium(userId);
  const hasPremiumAccess = subscription?.isPremium || subscription?.hasPartyPass;
  const isPremium = subscription?.isPremium;

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
          setError(t('roomNotFound'));
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

        // Save room for session recovery
        if (code) {
          await saveLastRoom(code);
        }

        // Load custom question count
        const customCount = await countCustomQuestions(code);
        setCustomQuestionCount(customCount);

        // Load personal question count
        const personalCount = await getPersonalQuestionCount(userId);
        setPersonalQuestionCount(personalCount);

        setLoading(false);
      } catch (err) {
        debugError('game', 'Error loading room:', err);
        setError(err instanceof Error ? err.message : t('errorLoadingRoom'));
        setLoading(false);
      }
    }

    loadRoom();
  }, [code, userId, username, setRoom, setPlayers, setVibe, router]);

  // Handler for when AI generates questions
  const handleQuestionsGenerated = useCallback(async (questions: GeneratedQuestion[]) => {
    debugLog('game', 'AI generated questions:', questions.length);
    triggerHaptic('success');
    // Refresh custom question count
    if (code) {
      const count = await countCustomQuestions(code);
      setCustomQuestionCount(count);
    }
  }, [code]);

  // Handler for when questions are added from personal pool
  const handlePersonalQuestionsAdded = useCallback(async (addedCount: number) => {
    debugLog('game', 'Personal questions added:', addedCount);
    // Refresh custom question count
    if (code) {
      const count = await countCustomQuestions(code);
      setCustomQuestionCount(count);
    }
  }, [code]);

  // Handler for when manual question is added
  const handleManualQuestionAdded = useCallback(async () => {
    debugLog('game', 'Manual question added');
    // Refresh custom question count
    if (code) {
      const count = await countCustomQuestions(code);
      setCustomQuestionCount(count);
    }
  }, [code]);

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
    if (!currentRoom || !isHost || players.length < 2 || !code) return;

    setStarting(true);
    try {
      // Get used questions (should be empty at start)
      const usedPresetIds = await getUsedQuestions(currentRoom.id);
      const usedCustomIds = await getUsedCustomQuestions(code);

      // Get a question (considers both preset and custom questions)
      // Use the room's hostLanguage to filter preset questions
      const question = await getQuestionForRoom(code, vibe, usedPresetIds, usedCustomIds, currentRoom.hostLanguage);
      if (!question) {
        throw new Error(t('noQuestionsAvailable'));
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
      setError(err instanceof Error ? err.message : t('errorStarting'));
      setStarting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom || !userId) {
      await clearLastRoom();
      router.push('/');
      return;
    }

    try {
      await removePlayer(currentRoom.id, userId);
      await clearLastRoom();
      leaveRoom();
      router.push('/');
    } catch (err) {
      debugError('game', 'Error leaving room:', err);
      await clearLastRoom();
      router.push('/');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-text-muted mt-4">{t('loadingRoom')}</Text>
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
            <Button title={t('back')} onPress={() => router.push('/')} />
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
                <Text className="text-text-muted ml-3">{t('connecting')}</Text>
              </View>
            </Card>
          )}

          {/* Room Status */}
          <View className="mb-8">
            <Text className="text-text text-3xl font-bold mb-2">
              {t('waitingForPlayers')}
            </Text>
            <Text className="text-text-muted text-lg">
              {players.length} {players.length === 1 ? t('playerInRoom') : t('playersInRoom')}
            </Text>
          </View>

          {/* Players List */}
          <View className="mb-8">
            <Text className="text-text text-xl font-semibold mb-4">{t('players')}</Text>
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
                {t('selectVibe')}
              </Text>
              <Text className="text-text-muted text-sm mb-4">
                {t('determinesQuestionType')}
              </Text>
              <VibeSelector
                vibes={VIBES}
                selectedVibe={vibe}
                onSelect={handleVibeChange}
              />
            </View>
          )}

          {/* Custom Questions Section (Host only) */}
          {isHost && (
            <View className="mb-8">
              <Text className="text-text text-xl font-semibold mb-2">
                {t('customizeQuestions')}
              </Text>
              <Text className="text-text-muted text-sm mb-4">
                {customQuestionCount > 0
                  ? `${customQuestionCount} ${t('customQuestionsInRoom')}`
                  : t('addYourOwnQuestions')}
              </Text>

              <View className="gap-3">
                {/* Manual Question Input (Free for all hosts) */}
                <TouchableOpacity
                  onPress={() => setShowManualInput(true)}
                  className="rounded-xl p-4 border bg-surface border-white/10"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="bg-green-500/30 w-12 h-12 rounded-full items-center justify-center">
                        <Text className="text-2xl">✏️</Text>
                      </View>
                      <View>
                        <Text className="text-text font-bold text-lg">{t('ownQuestions')}</Text>
                        <Text className="text-text-muted text-sm">
                          {t('enterQuestionsManually')}
                        </Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                {/* AI Question Generator (Premium/Party Pass) */}
                <TouchableOpacity
                  onPress={() => setShowAIGenerator(true)}
                  className={`rounded-xl p-4 border ${
                    hasPremiumAccess
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500'
                      : 'bg-surface border-white/10'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="bg-purple-500/30 w-12 h-12 rounded-full items-center justify-center">
                        <Text className="text-2xl">🤖</Text>
                      </View>
                      <View>
                        <Text className="text-text font-bold text-lg">{t('aiQuestions')}</Text>
                        <Text className="text-text-muted text-sm">
                          {t('generateTopicQuestions')}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      {!hasPremiumAccess && (
                        <View className="bg-orange-500/20 px-2 py-1 rounded-full">
                          <Text className="text-orange-500 text-xs font-bold">PREMIUM</Text>
                        </View>
                      )}
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Personal Question Pool (Premium only) */}
                <TouchableOpacity
                  onPress={() => setShowPersonalPool(true)}
                  className={`rounded-xl p-4 border ${
                    isPremium
                      ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500'
                      : 'bg-surface border-white/10'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="bg-blue-500/30 w-12 h-12 rounded-full items-center justify-center">
                        <Text className="text-2xl">📚</Text>
                      </View>
                      <View>
                        <Text className="text-text font-bold text-lg">{t('myQuestionPool')}</Text>
                        <Text className="text-text-muted text-sm">
                          {personalQuestionCount > 0
                            ? `${personalQuestionCount} ${t('savedQuestions')}`
                            : t('saveQuestionsPermanently')}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      {!isPremium && (
                        <View className="bg-orange-500/20 px-2 py-1 rounded-full">
                          <Text className="text-orange-500 text-xs font-bold">PREMIUM</Text>
                        </View>
                      )}
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {customQuestionCount > 0 && (
                <Text className="text-text-muted text-sm text-center mt-3">
                  {t('customQuestionsWillBeMixed')}
                </Text>
              )}
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
                  {isHost ? t('youAreHost') : t('waitingForHost')}
                </Text>
                <Text className="text-text-muted text-sm">
                  {isHost
                    ? t('hostCanStartGame')
                    : t('hostWillStartGame')}
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
            title={starting ? t('starting') : t('startGame')}
            onPress={handleStartGame}
            disabled={players.length < 2 || starting}
            fullWidth
          />
          {players.length < 2 && (
            <Text className="text-text-muted text-sm text-center mt-3">
              {t('minPlayersRequired')}
            </Text>
          )}
        </View>
      )}

      {/* AI Question Generator Modal */}
      <AIQuestionGenerator
        visible={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        roomId={code || ''}
        userId={userId}
        vibe={vibe}
        playerNames={players.map((p) => p.username)}
        onQuestionsGenerated={handleQuestionsGenerated}
      />

      {/* Personal Question Pool Modal */}
      <PersonalQuestionPool
        visible={showPersonalPool}
        onClose={() => setShowPersonalPool(false)}
        userId={userId}
        roomCode={code}
        onQuestionsAdded={handlePersonalQuestionsAdded}
      />

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
