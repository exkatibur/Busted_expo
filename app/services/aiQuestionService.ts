import { supabase } from '../lib/supabase';
import { Vibe } from '../types';

/**
 * AI Question Service
 * Generates questions using OpenAI via Supabase Edge Function
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export interface GeneratedQuestion {
  id: string;
  text: string;
  source: 'ai';
}

export interface GenerateQuestionsParams {
  topic: string;
  vibe?: Vibe;
  count?: number;
  roomId: string;
  userId: string;
  playerNames?: string[];
}

export interface GenerateQuestionsResult {
  success: boolean;
  questions: GeneratedQuestion[];
  count: number;
  error?: string;
  code?: string;
}

/**
 * Generate questions using AI
 * Requires Premium or Party Pass subscription
 */
export async function generateQuestions(
  params: GenerateQuestionsParams
): Promise<GenerateQuestionsResult> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-questions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: params.topic,
          vibe: params.vibe || 'party',
          count: params.count || 5,
          roomId: params.roomId,
          userId: params.userId,
          playerNames: params.playerNames,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        questions: [],
        count: 0,
        error: data.error || 'Failed to generate questions',
        code: data.code,
      };
    }

    return {
      success: true,
      questions: data.questions || [],
      count: data.count || 0,
    };
  } catch (error) {
    console.error('Error generating questions:', error);
    return {
      success: false,
      questions: [],
      count: 0,
      error: 'Network error. Please try again.',
    };
  }
}

/**
 * Get all custom questions for a room (including AI-generated)
 */
export async function getCustomQuestions(roomId: string) {
  try {
    const { data, error } = await supabase
      .from('busted_custom_questions')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting custom questions:', error);
    return [];
  }
}

/**
 * Delete a custom question
 */
export async function deleteCustomQuestion(
  questionId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('busted_custom_questions')
      .delete()
      .eq('id', questionId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting custom question:', error);
    return false;
  }
}

/**
 * Count custom questions for a room
 */
export async function countCustomQuestions(roomId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('busted_custom_questions')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error counting custom questions:', error);
    return 0;
  }
}

/**
 * Get a random custom question (excluding already used ones)
 */
export async function getRandomCustomQuestion(
  roomId: string,
  excludeIds: string[] = []
) {
  try {
    const { data, error } = await supabase.rpc('busted_get_random_custom_question', {
      p_room_id: roomId,
      p_exclude_ids: excludeIds,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  } catch (error) {
    console.error('Error getting random custom question:', error);
    return null;
  }
}

/**
 * Add a manual custom question
 */
export async function addCustomQuestion(
  roomId: string,
  userId: string,
  text: string
) {
  try {
    const { data, error } = await supabase
      .from('busted_custom_questions')
      .insert({
        room_id: roomId,
        user_id: userId,
        text: text.trim(),
        source: 'manual',
      })
      .select('id, text, source')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding custom question:', error);
    throw error;
  }
}

/**
 * Topic suggestions for AI generation
 */
export const TOPIC_SUGGESTIONS = [
  { label: 'Junggesellenabschied', emoji: '🎉' },
  { label: 'Teambuilding', emoji: '👥' },
  { label: 'Geburtstag', emoji: '🎂' },
  { label: 'Silvester', emoji: '🎆' },
  { label: 'Urlaub', emoji: '🏖️' },
  { label: 'WG-Party', emoji: '🏠' },
  { label: 'Dating', emoji: '💕' },
  { label: 'Schule/Uni', emoji: '📚' },
  { label: 'Arbeit', emoji: '💼' },
  { label: 'Gaming', emoji: '🎮' },
];
