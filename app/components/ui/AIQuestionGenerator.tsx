import React, { useState } from 'react';
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
  generateQuestions,
  TOPIC_SUGGESTIONS,
  GeneratedQuestion,
} from '@/services/aiQuestionService';
import { saveMultipleToPersonalPool } from '@/services/personalQuestionService';
import { usePremium } from '@/hooks/usePremium';
import { triggerHaptic } from '@/lib/haptics';
import { Vibe } from '@/types';

interface AIQuestionGeneratorProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  userId: string;
  vibe: Vibe;
  playerNames?: string[];
  onQuestionsGenerated: (questions: GeneratedQuestion[]) => void;
}

export function AIQuestionGenerator({
  visible,
  onClose,
  roomId,
  userId,
  vibe,
  playerNames,
  onQuestionsGenerated,
}: AIQuestionGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [savingToPool, setSavingToPool] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: subscription } = usePremium(userId);
  const hasPremiumAccess = subscription?.isPremium || subscription?.hasPartyPass;
  const isPremium = subscription?.isPremium; // Only full Premium can save to pool

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert('Thema fehlt', 'Bitte gib ein Thema für die Fragen ein');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await generateQuestions({
      topic: topic.trim(),
      vibe,
      count,
      roomId,
      userId,
      playerNames,
    });

    setLoading(false);

    if (!result.success) {
      if (result.code === 'SUBSCRIPTION_REQUIRED') {
        setError('Premium oder Party Pass benötigt');
      } else {
        setError(result.error || 'Fehler beim Generieren');
      }
      return;
    }

    setGeneratedQuestions(result.questions);
  };

  const handleSaveToPool = async () => {
    if (!isPremium || generatedQuestions.length === 0) return;

    setSavingToPool(true);
    try {
      const texts = generatedQuestions.map((q) => q.text);
      await saveMultipleToPersonalPool(userId, texts);
      triggerHaptic('success');
      Alert.alert('Gespeichert', `${texts.length} Fragen zu deinem persönlichen Pool hinzugefügt`);
    } catch (err) {
      Alert.alert('Fehler', 'Fragen konnten nicht gespeichert werden');
    } finally {
      setSavingToPool(false);
    }
  };

  const handleDone = () => {
    if (generatedQuestions.length > 0) {
      onQuestionsGenerated(generatedQuestions);
    }
    handleClose();
  };

  const handleClose = () => {
    setTopic('');
    setGeneratedQuestions([]);
    setError(null);
    onClose();
  };

  const selectSuggestion = (suggestion: string) => {
    setTopic(suggestion);
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
          <Text className="text-text font-bold text-xl">KI-Fragen</Text>
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
                KI-Fragen sind nur mit Premium oder Party Pass verfügbar.
              </Text>
            </View>
          )}

          {/* Generated Questions Preview */}
          {generatedQuestions.length > 0 ? (
            <View>
              <Text className="text-text font-bold text-xl mb-4">
                {generatedQuestions.length} Fragen generiert!
              </Text>

              <View className="gap-3 mb-6">
                {generatedQuestions.map((q, index) => (
                  <View
                    key={q.id}
                    className="bg-surface rounded-xl p-4 border border-white/10"
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="bg-primary/20 w-8 h-8 rounded-full items-center justify-center">
                        <Text className="text-primary font-bold">{index + 1}</Text>
                      </View>
                      <Text className="text-text flex-1">{q.text}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Save to Personal Pool (Premium only) */}
              {isPremium && (
                <TouchableOpacity
                  onPress={handleSaveToPool}
                  disabled={savingToPool}
                  className="bg-purple-500/20 border border-purple-500 rounded-xl p-4 mb-4"
                >
                  <View className="flex-row items-center justify-center gap-2">
                    {savingToPool ? (
                      <ActivityIndicator size="small" color="#A855F7" />
                    ) : (
                      <MaterialCommunityIcons name="content-save" size={20} color="#A855F7" />
                    )}
                    <Text className="text-purple-400 font-semibold">
                      {savingToPool ? 'Wird gespeichert...' : 'In meinen Fragenpool speichern'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <View className="flex-row gap-3">
                <Button
                  title="Mehr generieren"
                  variant="secondary"
                  onPress={() => setGeneratedQuestions([])}
                  className="flex-1"
                />
                <Button
                  title="Fertig"
                  onPress={handleDone}
                  className="flex-1"
                />
              </View>
            </View>
          ) : (
            <>
              {/* Topic Input */}
              <View className="mb-6">
                <Text className="text-text font-semibold text-lg mb-2">
                  Thema für die Fragen
                </Text>
                <Text className="text-text-muted text-sm mb-3">
                  Worum sollen sich die "Wer würde am ehesten..." Fragen drehen?
                </Text>
                <TextInput
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="z.B. Junggesellenabschied, Teambuilding..."
                  placeholderTextColor="#6B7280"
                  className="bg-surface text-text px-4 py-3 rounded-xl border border-white/10"
                  editable={!loading && hasPremiumAccess}
                />
              </View>

              {/* Topic Suggestions */}
              <View className="mb-6">
                <Text className="text-text-muted text-sm mb-3">Oder wähle ein Thema:</Text>
                <View className="flex-row flex-wrap gap-2">
                  {TOPIC_SUGGESTIONS.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.label}
                      onPress={() => selectSuggestion(suggestion.label)}
                      disabled={loading || !hasPremiumAccess}
                      className={`px-4 py-2 rounded-full border ${
                        topic === suggestion.label
                          ? 'bg-primary border-primary'
                          : 'bg-surface border-white/10'
                      }`}
                    >
                      <Text
                        className={`${
                          topic === suggestion.label ? 'text-white' : 'text-text'
                        }`}
                      >
                        {suggestion.emoji} {suggestion.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Question Count */}
              <View className="mb-6">
                <Text className="text-text font-semibold text-lg mb-3">
                  Anzahl Fragen
                </Text>
                <View className="flex-row gap-3">
                  {[3, 5, 7, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setCount(num)}
                      disabled={loading || !hasPremiumAccess}
                      className={`flex-1 py-3 rounded-xl border ${
                        count === num
                          ? 'bg-primary border-primary'
                          : 'bg-surface border-white/10'
                      }`}
                    >
                      <Text
                        className={`text-center font-bold ${
                          count === num ? 'text-white' : 'text-text'
                        }`}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
                  <Text className="text-red-400">{error}</Text>
                </View>
              )}

              {/* Info */}
              <View className="bg-surface rounded-xl p-4 mb-6 border border-white/10">
                <View className="flex-row items-start gap-3">
                  <Text className="text-2xl">💡</Text>
                  <View className="flex-1">
                    <Text className="text-text font-semibold mb-1">Tipp</Text>
                    <Text className="text-text-muted text-sm">
                      Die generierten Fragen werden zum ausgewählten Vibe passend erstellt
                      und automatisch in den Fragen-Pool des Raums hinzugefügt.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Generate Button */}
              <Button
                title={loading ? 'Generiere...' : 'Fragen generieren'}
                onPress={handleGenerate}
                disabled={loading || !hasPremiumAccess || !topic.trim()}
                fullWidth
              />

              {loading && (
                <View className="flex-row items-center justify-center mt-4 gap-3">
                  <ActivityIndicator size="small" color="#FF6B35" />
                  <Text className="text-text-muted">KI denkt nach...</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
