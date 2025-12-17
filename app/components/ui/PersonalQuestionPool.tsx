import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';
import {
  getPersonalQuestions,
  saveToPersonalPool,
  deletePersonalQuestion,
  copyPersonalToRoom,
  PersonalQuestion,
} from '@/services/personalQuestionService';
import { usePremium } from '@/hooks/usePremium';
import { triggerHaptic } from '@/lib/haptics';
import { debugLog, debugError } from '@/lib/debug';

interface PersonalQuestionPoolProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  roomCode?: string; // If provided, shows "Add to Room" button
  onQuestionsAdded?: (count: number) => void;
}

export function PersonalQuestionPool({
  visible,
  onClose,
  userId,
  roomCode,
  onQuestionsAdded,
}: PersonalQuestionPoolProps) {
  const [questions, setQuestions] = useState<PersonalQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  const { data: subscription } = usePremium(userId);
  const hasPremiumAccess = subscription?.isPremium || subscription?.hasPartyPass;

  // Load questions on mount
  useEffect(() => {
    if (visible && userId) {
      loadQuestions();
    }
  }, [visible, userId]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await getPersonalQuestions(userId);
      setQuestions(data);
    } catch (error) {
      debugError('personalPool', 'Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.trim() || newQuestion.length < 5) {
      Alert.alert('Fehler', 'Die Frage muss mindestens 5 Zeichen haben');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveToPersonalPool(userId, newQuestion);
      setQuestions([saved, ...questions]);
      setNewQuestion('');
      triggerHaptic('success');
    } catch (error) {
      debugError('personalPool', 'Error saving question:', error);
      Alert.alert('Fehler', 'Frage konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    Alert.alert('Frage löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePersonalQuestion(questionId, userId);
            setQuestions(questions.filter((q) => q.id !== questionId));
            selectedIds.delete(questionId);
            setSelectedIds(new Set(selectedIds));
            triggerHaptic('success');
          } catch (error) {
            debugError('personalPool', 'Error deleting question:', error);
          }
        },
      },
    ]);
  };

  const toggleSelection = (questionId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedIds(newSelected);
    triggerHaptic('selection');
  };

  const handleCopyToRoom = async () => {
    if (!roomCode || selectedIds.size === 0) return;

    setCopying(true);
    try {
      const count = await copyPersonalToRoom(userId, roomCode, Array.from(selectedIds));
      triggerHaptic('success');
      Alert.alert('Erfolg', `${count} Fragen zum Raum hinzugefügt`);
      setSelectedIds(new Set());
      onQuestionsAdded?.(count);
    } catch (error) {
      debugError('personalPool', 'Error copying to room:', error);
      Alert.alert('Fehler', 'Fragen konnten nicht hinzugefügt werden');
    } finally {
      setCopying(false);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setNewQuestion('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface">
          <TouchableOpacity onPress={handleClose}>
            <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-text font-bold text-xl">Meine Fragen</Text>
          <View className="w-7" />
        </View>

        <ScrollView className="flex-1 px-6 py-4">
          {/* Premium Check */}
          {!hasPremiumAccess && (
            <View className="bg-orange-500/20 border border-orange-500 rounded-xl p-4 mb-6">
              <View className="flex-row items-center gap-2 mb-2">
                <Text className="text-2xl">🔒</Text>
                <Text className="text-orange-400 font-bold text-lg">Premium Feature</Text>
              </View>
              <Text className="text-orange-400/80">
                Der persönliche Fragenpool ist nur mit Premium verfügbar.
              </Text>
            </View>
          )}

          {/* Add New Question */}
          {hasPremiumAccess && (
            <View className="mb-6">
              <Text className="text-text font-semibold text-lg mb-2">
                Neue Frage hinzufügen
              </Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={newQuestion}
                  onChangeText={setNewQuestion}
                  placeholder="Wer würde am ehesten..."
                  placeholderTextColor="#6B7280"
                  className="flex-1 bg-surface text-text px-4 py-3 rounded-xl border border-white/10"
                  editable={!saving}
                />
                <TouchableOpacity
                  onPress={handleAddQuestion}
                  disabled={saving || newQuestion.length < 5}
                  className={`w-12 h-12 rounded-xl items-center justify-center ${
                    saving || newQuestion.length < 5 ? 'bg-surface' : 'bg-primary'
                  }`}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Questions List */}
          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text className="text-text-muted mt-4">Lade Fragen...</Text>
            </View>
          ) : questions.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-4xl mb-4">📝</Text>
              <Text className="text-text font-semibold text-lg mb-2">
                Noch keine Fragen
              </Text>
              <Text className="text-text-muted text-center">
                Speichere deine Lieblingsfragen hier, um sie in mehreren Spielen zu
                verwenden.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              <Text className="text-text font-semibold text-lg mb-2">
                {questions.length} gespeicherte Fragen
              </Text>
              {questions.map((question) => (
                <TouchableOpacity
                  key={question.id}
                  onPress={() => roomCode && toggleSelection(question.id)}
                  className={`bg-surface rounded-xl p-4 border ${
                    selectedIds.has(question.id)
                      ? 'border-primary'
                      : 'border-white/10'
                  }`}
                >
                  <View className="flex-row items-start gap-3">
                    {roomCode && (
                      <View
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                          selectedIds.has(question.id)
                            ? 'bg-primary border-primary'
                            : 'border-white/30'
                        }`}
                      >
                        {selectedIds.has(question.id) && (
                          <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                        )}
                      </View>
                    )}
                    <Text className="text-text flex-1">{question.text}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteQuestion(question.id)}
                      className="p-1"
                    >
                      <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Action (when in room context) */}
        {roomCode && selectedIds.size > 0 && (
          <View className="border-t border-surface px-6 py-4">
            <Button
              title={
                copying
                  ? 'Wird hinzugefügt...'
                  : `${selectedIds.size} Fragen zum Raum hinzufügen`
              }
              onPress={handleCopyToRoom}
              disabled={copying}
              fullWidth
            />
          </View>
        )}
      </View>
    </Modal>
  );
}
