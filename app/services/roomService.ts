import { supabase } from '../lib/supabase';
import { Room, Vibe, GameStatus, Language } from '../types';

/**
 * Room Service
 * Handles all room-related database operations
 */

export interface CreateRoomResult {
  roomId: string;
  code: string;
}

/**
 * Create a new room
 */
export async function createRoom(
  hostId: string,
  hostUsername: string,
  vibe: Vibe = 'party',
  hostLanguage: Language = 'en'
): Promise<CreateRoomResult> {
  try {
    // Generate unique room code via database function
    const { data: codeData, error: codeError } = await supabase
      .rpc('busted_generate_room_code');

    if (codeError) throw codeError;
    if (!codeData) throw new Error('Failed to generate room code');

    const code = codeData as string;

    // Create room
    const { data: room, error: roomError } = await supabase
      .from('busted_rooms')
      .insert({
        code,
        host_id: hostId,
        vibe,
        status: 'lobby',
        current_round: 1,
        host_language: hostLanguage,
      })
      .select('id, code')
      .single();

    if (roomError) throw roomError;
    if (!room) throw new Error('Failed to create room');

    // Add host as first player
    const { error: playerError } = await supabase
      .from('busted_players')
      .insert({
        room_id: room.id,
        user_id: hostId,
        username: hostUsername,
        is_host: true,
        is_active: true,
      });

    if (playerError) throw playerError;

    return {
      roomId: room.id,
      code: room.code,
    };
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

/**
 * Join an existing room by code
 */
export async function joinRoom(
  code: string,
  userId: string,
  username: string
): Promise<Room> {
  try {
    // Find room by code
    const { data: room, error: roomError } = await supabase
      .from('busted_rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (roomError) throw roomError;
    if (!room) throw new Error('Room not found');

    // Check if room is joinable
    if (room.status === 'finished') {
      throw new Error('This game has already ended');
    }

    // Check if user is already in the room
    const { data: existingPlayer } = await supabase
      .from('busted_players')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single();

    // If player already exists, just reactivate them
    if (existingPlayer) {
      const { error: updateError } = await supabase
        .from('busted_players')
        .update({ is_active: true })
        .eq('id', existingPlayer.id);

      if (updateError) throw updateError;
    } else {
      // Add player to room
      const { error: playerError } = await supabase
        .from('busted_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          username,
          is_host: false,
          is_active: true,
        });

      if (playerError) throw playerError;
    }

    // Return room data in app format
    return {
      id: room.id,
      code: room.code,
      hostId: room.host_id,
      vibe: room.vibe,
      status: room.status,
      currentQuestionId: room.current_question_id,
      currentRound: room.current_round,
      createdAt: room.created_at,
      hostLanguage: room.host_language || 'en',
    };
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
}

/**
 * Get room by code
 */
export async function getRoom(code: string): Promise<Room | null> {
  try {
    const { data: room, error } = await supabase
      .from('busted_rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    if (!room) return null;

    return {
      id: room.id,
      code: room.code,
      hostId: room.host_id,
      vibe: room.vibe,
      status: room.status,
      currentQuestionId: room.current_question_id,
      currentRound: room.current_round,
      createdAt: room.created_at,
      hostLanguage: room.host_language || 'en',
    };
  } catch (error) {
    console.error('Error getting room:', error);
    throw error;
  }
}

/**
 * Get room by ID
 */
export async function getRoomById(roomId: string): Promise<Room | null> {
  try {
    const { data: room, error } = await supabase
      .from('busted_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    if (!room) return null;

    return {
      id: room.id,
      code: room.code,
      hostId: room.host_id,
      vibe: room.vibe,
      status: room.status,
      currentQuestionId: room.current_question_id,
      currentRound: room.current_round,
      createdAt: room.created_at,
      hostLanguage: room.host_language || 'en',
    };
  } catch (error) {
    console.error('Error getting room by ID:', error);
    throw error;
  }
}

/**
 * Update room status
 */
export async function updateRoomStatus(
  roomId: string,
  status: GameStatus
): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_rooms')
      .update({ status })
      .eq('id', roomId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating room status:', error);
    throw error;
  }
}

/**
 * Update room vibe
 */
export async function updateRoomVibe(
  roomId: string,
  vibe: Vibe
): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_rooms')
      .update({ vibe })
      .eq('id', roomId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating room vibe:', error);
    throw error;
  }
}

/**
 * Update current question
 */
export async function updateCurrentQuestion(
  roomId: string,
  questionId: string | null
): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_rooms')
      .update({ current_question_id: questionId })
      .eq('id', roomId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating current question:', error);
    throw error;
  }
}

/**
 * Update current round
 */
export async function updateCurrentRound(
  roomId: string,
  round: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_rooms')
      .update({ current_round: round })
      .eq('id', roomId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating current round:', error);
    throw error;
  }
}

/**
 * Delete a room
 */
export async function deleteRoom(roomId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
}
