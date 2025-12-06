import { supabase } from '../lib/supabase';
import { Question, Vibe } from '../types';

/**
 * Question Service
 * Handles all question-related database operations
 */

/**
 * Get a random question for a vibe, excluding already used questions
 */
export async function getRandomQuestion(
  vibe: Vibe,
  excludeIds: string[] = []
): Promise<Question | null> {
  try {
    // Use database function for better performance
    const { data, error } = await supabase
      .rpc('busted_get_random_question', {
        p_vibe: vibe,
        p_exclude_ids: excludeIds,
      });

    if (error) throw error;

    if (!data || data.length === 0) {
      // Fallback: try without exclude if no questions found
      if (excludeIds.length > 0) {
        return getRandomQuestion(vibe, []);
      }
      return null;
    }

    const question = Array.isArray(data) ? data[0] : data;

    return {
      id: question.id,
      vibe: question.vibe,
      text: question.text,
      isPremium: question.is_premium,
    };
  } catch (error) {
    console.error('Error getting random question:', error);
    throw error;
  }
}

/**
 * Get a question by ID
 */
export async function getQuestionById(id: string): Promise<Question | null> {
  try {
    const { data, error } = await supabase
      .from('busted_questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      vibe: data.vibe,
      text: data.text,
      isPremium: data.is_premium,
    };
  } catch (error) {
    console.error('Error getting question by ID:', error);
    throw error;
  }
}

/**
 * Get all questions for a vibe
 */
export async function getQuestionsByVibe(vibe: Vibe): Promise<Question[]> {
  try {
    const { data, error } = await supabase
      .from('busted_questions')
      .select('*')
      .eq('vibe', vibe)
      .eq('is_premium', false);

    if (error) throw error;

    return (data || []).map((q) => ({
      id: q.id,
      vibe: q.vibe,
      text: q.text,
      isPremium: q.is_premium,
    }));
  } catch (error) {
    console.error('Error getting questions by vibe:', error);
    throw error;
  }
}

/**
 * Get question count for a vibe
 */
export async function getQuestionCount(vibe: Vibe): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('busted_questions')
      .select('*', { count: 'exact', head: true })
      .eq('vibe', vibe)
      .eq('is_premium', false);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting question count:', error);
    throw error;
  }
}

/**
 * Get questions used in a room (for excluding)
 */
export async function getUsedQuestions(roomId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('busted_votes')
      .select('question_id')
      .eq('room_id', roomId);

    if (error) throw error;

    // Get unique question IDs
    const uniqueIds = [...new Set((data || []).map((v) => v.question_id))];
    return uniqueIds;
  } catch (error) {
    console.error('Error getting used questions:', error);
    throw error;
  }
}

/**
 * Preload questions for a vibe (for caching)
 */
export async function preloadQuestions(vibe: Vibe): Promise<Question[]> {
  try {
    const { data, error } = await supabase
      .from('busted_questions')
      .select('*')
      .eq('vibe', vibe)
      .eq('is_premium', false)
      .limit(50);

    if (error) throw error;

    return (data || []).map((q) => ({
      id: q.id,
      vibe: q.vibe,
      text: q.text,
      isPremium: q.is_premium,
    }));
  } catch (error) {
    console.error('Error preloading questions:', error);
    throw error;
  }
}
