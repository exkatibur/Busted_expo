import { supabase } from '../lib/supabase';
import { Player } from '../types';

/**
 * Player Service
 * Handles all player-related database operations
 */

/**
 * Get all players in a room
 */
export async function getPlayers(roomId: string): Promise<Player[]> {
  try {
    const { data, error } = await supabase
      .from('busted_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((player) => ({
      id: player.user_id,
      username: player.username,
      isHost: player.is_host,
      joinedAt: player.joined_at,
    }));
  } catch (error) {
    console.error('Error getting players:', error);
    throw error;
  }
}

/**
 * Get a specific player
 */
export async function getPlayer(
  roomId: string,
  userId: string
): Promise<Player | null> {
  try {
    const { data, error } = await supabase
      .from('busted_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    if (!data) return null;

    return {
      id: data.user_id,
      username: data.username,
      isHost: data.is_host,
      joinedAt: data.joined_at,
    };
  } catch (error) {
    console.error('Error getting player:', error);
    throw error;
  }
}

/**
 * Add a player to a room
 */
export async function addPlayer(
  roomId: string,
  userId: string,
  username: string,
  isHost: boolean = false
): Promise<Player> {
  try {
    const { data, error } = await supabase
      .from('busted_players')
      .insert({
        room_id: roomId,
        user_id: userId,
        username,
        is_host: isHost,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to add player');

    return {
      id: data.user_id,
      username: data.username,
      isHost: data.is_host,
      joinedAt: data.joined_at,
    };
  } catch (error) {
    console.error('Error adding player:', error);
    throw error;
  }
}

/**
 * Remove a player from a room (set inactive)
 */
export async function removePlayer(
  roomId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_players')
      .update({ is_active: false })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing player:', error);
    throw error;
  }
}

/**
 * Set player inactive
 */
export async function setPlayerInactive(
  roomId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_players')
      .update({ is_active: false })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error setting player inactive:', error);
    throw error;
  }
}

/**
 * Set player active
 */
export async function setPlayerActive(
  roomId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_players')
      .update({ is_active: true })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error setting player active:', error);
    throw error;
  }
}

/**
 * Transfer host to another player
 */
export async function transferHost(
  roomId: string,
  newHostId: string
): Promise<void> {
  try {
    // Remove host status from all players
    const { error: removeError } = await supabase
      .from('busted_players')
      .update({ is_host: false })
      .eq('room_id', roomId);

    if (removeError) throw removeError;

    // Set new host
    const { error: setError } = await supabase
      .from('busted_players')
      .update({ is_host: true })
      .eq('room_id', roomId)
      .eq('user_id', newHostId);

    if (setError) throw setError;

    // Update room host_id
    const { error: roomError } = await supabase
      .from('busted_rooms')
      .update({ host_id: newHostId })
      .eq('id', roomId);

    if (roomError) throw roomError;
  } catch (error) {
    console.error('Error transferring host:', error);
    throw error;
  }
}

/**
 * Get player count in a room
 */
export async function getPlayerCount(roomId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('busted_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('is_active', true);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting player count:', error);
    throw error;
  }
}

/**
 * Check if a username is taken in a room
 */
export async function isUsernameTaken(
  roomId: string,
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('busted_players')
      .select('id')
      .eq('room_id', roomId)
      .eq('username', username)
      .eq('is_active', true);

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).length > 0;
  } catch (error) {
    console.error('Error checking username:', error);
    throw error;
  }
}

/**
 * Update player username
 */
export async function updatePlayerUsername(
  roomId: string,
  userId: string,
  newUsername: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('busted_players')
      .update({ username: newUsername })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating username:', error);
    throw error;
  }
}
