import { supabase } from '../lib/supabase';
import { Question, Vibe } from '../types';

/**
 * Custom Question Service
 * Handles user-created questions for rooms
 */

export interface CustomQuestion {
  id: string;
  roomId: string;
  userId: string;
  text: string;
  createdAt: string;
}

/**
 * Add a custom question to a room
 */
export async function addCustomQuestion(
  roomId: string,
  userId: string,
  text: string
): Promise<CustomQuestion> {
  try {
    const { data, error } = await supabase
      .from('busted_custom_questions')
      .insert({
        room_id: roomId,
        user_id: userId,
        text: text.trim(),
      })
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to add custom question');

    return {
      id: data.id,
      roomId: data.room_id,
      userId: data.user_id,
      text: data.text,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Error adding custom question:', error);
    throw error;
  }
}

/**
 * Get all custom questions for a room
 */
export async function getCustomQuestions(roomId: string): Promise<CustomQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('busted_custom_questions')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((q) => ({
      id: q.id,
      roomId: q.room_id,
      userId: q.user_id,
      text: q.text,
      createdAt: q.created_at,
    }));
  } catch (error) {
    console.error('Error getting custom questions:', error);
    throw error;
  }
}

/**
 * Delete a custom question
 */
export async function deleteCustomQuestion(questionId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_custom_questions')
      .delete()
      .eq('id', questionId)
      .eq('user_id', userId); // Only allow deleting own questions

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting custom question:', error);
    throw error;
  }
}

/**
 * Get a random custom question for a room (excluding already used)
 */
export async function getRandomCustomQuestion(
  roomId: string,
  excludeIds: string[] = []
): Promise<CustomQuestion | null> {
  try {
    let query = supabase
      .from('busted_custom_questions')
      .select('*')
      .eq('room_id', roomId);

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Random selection
    const randomIndex = Math.floor(Math.random() * data.length);
    const q = data[randomIndex];

    return {
      id: q.id,
      roomId: q.room_id,
      userId: q.user_id,
      text: q.text,
      createdAt: q.created_at,
    };
  } catch (error) {
    console.error('Error getting random custom question:', error);
    throw error;
  }
}

/**
 * Count custom questions in a room
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
    throw error;
  }
}
