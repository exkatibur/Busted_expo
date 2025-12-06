import { supabase } from '../lib/supabase';
import { Vote } from '../types';

/**
 * Vote Service
 * Handles all voting-related database operations
 */

/**
 * Cast a vote
 */
export async function castVote(
  roomId: string,
  questionId: string,
  round: number,
  voterId: string,
  votedForId: string
): Promise<Vote> {
  try {
    // Self-voting is allowed in BUSTED!

    const { data, error } = await supabase
      .from('busted_votes')
      .insert({
        room_id: roomId,
        question_id: questionId,
        round,
        voter_id: voterId,
        voted_for_id: votedForId,
      })
      .select('*')
      .single();

    if (error) {
      // Handle duplicate vote error
      if (error.code === '23505') {
        throw new Error('You have already voted for this round');
      }
      throw error;
    }

    if (!data) throw new Error('Failed to cast vote');

    return {
      id: data.id,
      roomId: data.room_id,
      questionId: data.question_id,
      round: data.round,
      voterId: data.voter_id,
      votedForId: data.voted_for_id,
    };
  } catch (error) {
    console.error('Error casting vote:', error);
    throw error;
  }
}

/**
 * Get all votes for a round
 */
export async function getVotesForRound(
  roomId: string,
  round: number
): Promise<Vote[]> {
  try {
    const { data, error } = await supabase
      .from('busted_votes')
      .select('*')
      .eq('room_id', roomId)
      .eq('round', round)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((vote) => ({
      id: vote.id,
      roomId: vote.room_id,
      questionId: vote.question_id,
      round: vote.round,
      voterId: vote.voter_id,
      votedForId: vote.voted_for_id,
    }));
  } catch (error) {
    console.error('Error getting votes for round:', error);
    throw error;
  }
}

/**
 * Get vote count for a round
 */
export async function getVoteCount(
  roomId: string,
  round: number
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('busted_votes')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('round', round);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting vote count:', error);
    throw error;
  }
}

/**
 * Check if a user has voted in a round
 */
export async function hasUserVoted(
  roomId: string,
  round: number,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('busted_votes')
      .select('id')
      .eq('room_id', roomId)
      .eq('round', round)
      .eq('voter_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if user voted:', error);
    throw error;
  }
}

/**
 * Get user's vote for a round
 */
export async function getUserVote(
  roomId: string,
  round: number,
  userId: string
): Promise<Vote | null> {
  try {
    const { data, error } = await supabase
      .from('busted_votes')
      .select('*')
      .eq('room_id', roomId)
      .eq('round', round)
      .eq('voter_id', userId)
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
      roomId: data.room_id,
      questionId: data.question_id,
      round: data.round,
      voterId: data.voter_id,
      votedForId: data.voted_for_id,
    };
  } catch (error) {
    console.error('Error getting user vote:', error);
    throw error;
  }
}

/**
 * Get votes for a specific player in a round
 */
export async function getVotesForPlayer(
  roomId: string,
  round: number,
  playerId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('busted_votes')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('round', round)
      .eq('voted_for_id', playerId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting votes for player:', error);
    throw error;
  }
}

/**
 * Get all votes in a room (for analytics)
 */
export async function getAllVotesInRoom(roomId: string): Promise<Vote[]> {
  try {
    const { data, error } = await supabase
      .from('busted_votes')
      .select('*')
      .eq('room_id', roomId)
      .order('round', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((vote) => ({
      id: vote.id,
      roomId: vote.room_id,
      questionId: vote.question_id,
      round: vote.round,
      voterId: vote.voter_id,
      votedForId: vote.voted_for_id,
    }));
  } catch (error) {
    console.error('Error getting all votes in room:', error);
    throw error;
  }
}

/**
 * Calculate round results and store them
 */
export async function calculateRoundResults(
  roomId: string,
  round: number,
  questionId: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('busted_calculate_round_results', {
      p_room_id: roomId,
      p_round: round,
      p_question_id: questionId,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error calculating round results:', error);
    throw error;
  }
}

/**
 * Get round results
 */
export async function getRoundResults(roomId: string, round: number) {
  try {
    const { data, error } = await supabase
      .from('busted_round_results')
      .select('*')
      .eq('room_id', roomId)
      .eq('round', round)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    if (!data) return null;

    return {
      round: data.round,
      questionId: data.question_id,
      winnerId: data.winner_id,
      winnerName: data.winner_name,
      totalVotes: data.total_votes,
      results: data.results_json,
    };
  } catch (error) {
    console.error('Error getting round results:', error);
    throw error;
  }
}

/**
 * Get all results for a room
 */
export async function getAllRoundResults(roomId: string) {
  try {
    const { data, error } = await supabase
      .from('busted_round_results')
      .select('*')
      .eq('room_id', roomId)
      .order('round', { ascending: true });

    if (error) throw error;

    return (data || []).map((result) => ({
      round: result.round,
      questionId: result.question_id,
      winnerId: result.winner_id,
      winnerName: result.winner_name,
      totalVotes: result.total_votes,
      results: result.results_json,
    }));
  } catch (error) {
    console.error('Error getting all round results:', error);
    throw error;
  }
}
