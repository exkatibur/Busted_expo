import { supabase } from '../lib/supabase';
import { Question, Vibe, Language } from '../types';

/**
 * Question Service
 * Handles all question-related database operations
 */

/**
 * Get a random question for a vibe, excluding already used questions
 * Filters by language (default: 'de' for backwards compatibility)
 */
export async function getRandomQuestion(
  vibe: Vibe,
  excludeIds: string[] = [],
  language: Language = 'de'
): Promise<Question | null> {
  try {
    // Use database function for better performance
    const { data, error } = await supabase
      .rpc('busted_get_random_question', {
        p_vibe: vibe,
        p_exclude_ids: excludeIds,
        p_language: language,
      });

    if (error) throw error;

    if (!data || data.length === 0) {
      // Fallback: try without exclude if no questions found
      if (excludeIds.length > 0) {
        return getRandomQuestion(vibe, [], language);
      }
      return null;
    }

    const question = Array.isArray(data) ? data[0] : data;

    return {
      id: question.id,
      vibe: question.vibe,
      text: question.text,
      isPremium: question.is_premium,
      language: question.language,
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

/**
 * Get a question for a room - considers both preset and custom questions
 * Custom questions have higher priority (50% chance if available)
 * Language parameter filters preset questions by the host's language
 */
export async function getQuestionForRoom(
  roomCode: string,
  vibe: Vibe,
  excludePresetIds: string[] = [],
  excludeCustomIds: string[] = [],
  language: Language = 'de'
): Promise<Question | null> {
  try {
    // Check for custom questions
    const { data: customData, error: customError } = await supabase.rpc(
      'busted_get_random_custom_question',
      {
        p_room_id: roomCode,
        p_exclude_ids: excludeCustomIds,
      }
    );

    const hasCustomQuestion = customData && customData.length > 0;

    // 50% chance to use custom question if available
    const useCustom = hasCustomQuestion && Math.random() < 0.5;

    if (useCustom && customData) {
      const custom = customData[0];
      return {
        id: custom.id,
        vibe: vibe, // Use room's selected vibe
        text: custom.text,
        isPremium: false,
        isCustom: true,
      } as Question & { isCustom: boolean };
    }

    // Otherwise, get a preset question filtered by language
    const presetQuestion = await getRandomQuestion(vibe, excludePresetIds, language);

    // If no preset found but custom available, use custom
    if (!presetQuestion && hasCustomQuestion && customData) {
      const custom = customData[0];
      return {
        id: custom.id,
        vibe: vibe,
        text: custom.text,
        isPremium: false,
        isCustom: true,
      } as Question & { isCustom: boolean };
    }

    return presetQuestion;
  } catch (error) {
    console.error('Error getting question for room:', error);
    // Fallback to preset only with language filter
    return getRandomQuestion(vibe, excludePresetIds, language);
  }
}

/**
 * Get used custom question IDs for a room
 */
export async function getUsedCustomQuestions(roomCode: string): Promise<string[]> {
  try {
    // For now, we'll track used custom questions via votes
    // This relies on custom question IDs being stored in the votes table
    const { data, error } = await supabase
      .from('busted_votes')
      .select('question_id')
      .eq('room_id', roomCode);

    if (error) throw error;

    // Get unique question IDs
    const uniqueIds = [...new Set((data || []).map((v) => v.question_id))];
    return uniqueIds;
  } catch (error) {
    console.error('Error getting used custom questions:', error);
    return [];
  }
}
