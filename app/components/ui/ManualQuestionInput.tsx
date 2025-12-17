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
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { supabase } from '@/lib/supabase';
import { triggerHaptic } from '@/lib/haptics';
import { debugLog, debugError } from '@/lib/debug';

interface CustomQuestion {
  id: string;
  text: string;
  source: string;
  createdAt: string;
}

interface ManualQuestionInputProps {
  visible: boolean;
  onClose: () => void;
  roomCode: string;
  userId: string;
  onQuestionAdded?: () => void;
}

export function ManualQuestionInput({
  visible,
  onClose,
  roomCode,
  userId,
  onQuestionAdded,
}: ManualQuestionInputProps) {
  const [newQuestion, setNewQuestion] = useState('');
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing custom questions for this room
  useEffect(() => {
    if (visible && roomCode) {
      loadQuestions();
    }
  }, [visible, roomCode]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('busted_custom_questions')
        .select('*')
        .eq('room_id', roomCode)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuestions(
        (data || []).map((q) => ({
          id: q.id,
          text: q.text,
          source: q.source,
          createdAt: q.created_at,
        }))
      );
    } catch (error) {
      debugError('manualQuestions', 'Error loading questions:', error);
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
      const { data, error } = await supabase
        .from('busted_custom_questions')
        .insert({
          room_id: roomCode,
          user_id: userId,
          text: newQuestion.trim(),
          source: 'manual',
        })
        .select()
        .single();

      if (error) throw error;

      setQuestions([
        {
          id: data.id,
          text: data.text,
          source: data.source,
          createdAt: data.created_at,
        },
        ...questions,
      ]);
      setNewQuestion('');
      triggerHaptic('success');
      onQuestionAdded?.();
      debugLog('manualQuestions', 'Question added:', data.id);
    } catch (error) {
      debugError('manualQuestions', 'Error adding question:', error);
      Alert.alert('Fehler', 'Frage konnte nicht hinzugefügt werden');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const doDelete = async () => {
      try {
        const { error } = await supabase
          .from('busted_custom_questions')
          .delete()
          .eq('id', questionId)
          .eq('user_id', userId);

        if (error) throw error;

        setQuestions(questions.filter((q) => q.id !== questionId));
        triggerHaptic('success');
        onQuestionAdded?.();
      } catch (error) {
        debugError('manualQuestions', 'Error deleting question:', error);
      }
    };

    // Alert.alert doesn't work on web, use confirm instead
    if (Platform.OS === 'web') {
      if (window.confirm('Frage löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        await doDelete();
      }
    } else {
      Alert.alert('Frage löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleClose = () => {
    setNewQuestion('');
    onClose();
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'ai':
        return '🤖 KI';
      case 'personal':
        return '📚 Pool';
      default:
        return '✏️ Manuell';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        className="flex-1 bg-black/70 justify-center items-center px-4 py-12"
      >
        {/* Popup Container - stop propagation to prevent closing when tapping inside */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="bg-background rounded-2xl w-full max-h-full border border-white/20"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 20,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-surface">
            <Text className="text-text font-bold text-lg">Eigene Fragen</Text>
            <TouchableOpacity onPress={handleClose} className="p-1">
              <MaterialCommunityIcons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5 py-4" style={{ maxHeight: 400 }}>
            {/* Add New Question */}
            <View className="mb-5">
              <Text className="text-text font-semibold mb-2">
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
                  multiline
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

            {/* Questions List */}
            {loading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#FF6B35" />
              </View>
            ) : questions.length === 0 ? (
              <View className="items-center py-6">
                <Text className="text-text-muted text-center text-sm">
                  Noch keine Fragen. Füge deine erste hinzu!
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                <Text className="text-text-muted text-sm mb-1">
                  {questions.length} Fragen im Raum
                </Text>
                {questions.map((question) => (
                  <View
                    key={question.id}
                    className="bg-surface rounded-xl p-3 border border-white/10"
                  >
                    <View className="flex-row items-start gap-2">
                      <View className="flex-1">
                        <Text className="text-text text-sm">{question.text}</Text>
                      </View>
                      {question.source === 'manual' && (
                        <TouchableOpacity
                          onPress={() => handleDeleteQuestion(question.id)}
                          className="p-1"
                        >
                          <MaterialCommunityIcons
                            name="delete-outline"
                            size={18}
                            color="#EF4444"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
