import { supabase } from '../lib/supabase';
import { debugLog, debugError } from '@/lib/debug';

export interface PersonalQuestion {
  id: string;
  userId: string;
  text: string;
  category: string;
  createdAt: string;
}

/**
 * Get all personal questions for a user
 */
export async function getPersonalQuestions(userId: string): Promise<PersonalQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('busted_personal_questions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((q) => ({
      id: q.id,
      userId: q.user_id,
      text: q.text,
      category: q.category,
      createdAt: q.created_at,
    }));
  } catch (error) {
    debugError('personalQuestions', 'Error getting personal questions:', error);
    throw error;
  }
}

/**
 * Save a question to personal pool
 */
export async function saveToPersonalPool(
  userId: string,
  text: string
): Promise<PersonalQuestion> {
  try {
    const { data, error } = await supabase
      .from('busted_personal_questions')
      .insert({
        user_id: userId,
        text: text.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    debugLog('personalQuestions', 'Saved to personal pool:', data.id);

    return {
      id: data.id,
      userId: data.user_id,
      text: data.text,
      category: data.category,
      createdAt: data.created_at,
    };
  } catch (error) {
    debugError('personalQuestions', 'Error saving to personal pool:', error);
    throw error;
  }
}

/**
 * Save multiple questions to personal pool
 */
export async function saveMultipleToPersonalPool(
  userId: string,
  texts: string[]
): Promise<PersonalQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('busted_personal_questions')
      .insert(
        texts.map((text) => ({
          user_id: userId,
          text: text.trim(),
        }))
      )
      .select();

    if (error) throw error;

    debugLog('personalQuestions', 'Saved multiple to personal pool:', data?.length);

    return (data || []).map((q) => ({
      id: q.id,
      userId: q.user_id,
      text: q.text,
      category: q.category,
      createdAt: q.created_at,
    }));
  } catch (error) {
    debugError('personalQuestions', 'Error saving multiple to personal pool:', error);
    throw error;
  }
}

/**
 * Delete a personal question
 */
export async function deletePersonalQuestion(
  questionId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_personal_questions')
      .delete()
      .eq('id', questionId)
      .eq('user_id', userId);

    if (error) throw error;

    debugLog('personalQuestions', 'Deleted personal question:', questionId);
  } catch (error) {
    debugError('personalQuestions', 'Error deleting personal question:', error);
    throw error;
  }
}

/**
 * Copy personal questions to a room
 */
export async function copyPersonalToRoom(
  userId: string,
  roomCode: string,
  questionIds: string[]
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('busted_copy_personal_to_room', {
      p_user_id: userId,
      p_room_id: roomCode,
      p_question_ids: questionIds,
    });

    if (error) throw error;

    debugLog('personalQuestions', 'Copied to room:', data, 'questions');

    return data || 0;
  } catch (error) {
    debugError('personalQuestions', 'Error copying to room:', error);
    throw error;
  }
}

/**
 * Get personal question count
 */
export async function getPersonalQuestionCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('busted_personal_questions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    debugError('personalQuestions', 'Error getting count:', error);
    return 0;
  }
}
