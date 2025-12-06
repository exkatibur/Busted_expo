import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Player } from '../types';

/**
 * Realtime Hook for BUSTED!
 *
 * Manages Supabase Realtime connection for a game room:
 * - Presence for online player tracking
 * - Broadcast for game events
 * - Auto-reconnect on connection loss
 */

export interface PresenceState {
  [key: string]: Array<{
    user_id: string;
    username: string;
    is_host: boolean;
    online_at: string;
  }>;
}

export interface GameEvent {
  type: 'game_start' | 'vote_cast' | 'round_complete' | 'next_round' | 'game_end' | 'player_joined' | 'player_left';
  payload: any;
}

export interface UseRealtimeOptions {
  roomCode: string;
  userId: string;
  username: string;
  isHost: boolean;
  onPresenceSync?: (players: Player[]) => void;
  onGameEvent?: (event: GameEvent) => void;
  onError?: (error: Error) => void;
}

export function useRealtime(options: UseRealtimeOptions) {
  const {
    roomCode,
    userId,
    username,
    isHost,
    onPresenceSync,
    onGameEvent,
    onError,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);

  // Store callbacks in refs to avoid dependency issues
  const onPresenceSyncRef = useRef(onPresenceSync);
  const onGameEventRef = useRef(onGameEvent);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onPresenceSyncRef.current = onPresenceSync;
    onGameEventRef.current = onGameEvent;
    onErrorRef.current = onError;
  }, [onPresenceSync, onGameEvent, onError]);

  /**
   * Send a game event to all players in the room
   */
  const sendEvent = useCallback(
    (type: GameEvent['type'], payload: any = {}) => {
      if (!channelRef.current) {
        console.warn('Cannot send event: Channel not connected');
        return;
      }

      channelRef.current.send({
        type: 'broadcast',
        event: type,
        payload,
      });
    },
    []
  );

  /**
   * Get current presence state (online players)
   */
  const getPresence = useCallback((): Player[] => {
    if (!channelRef.current) return [];

    const state = channelRef.current.presenceState<{
      user_id: string;
      username: string;
      is_host: boolean;
      online_at: string;
    }>();

    const players: Player[] = [];

    // Convert presence state to player array
    Object.values(state).forEach((presences) => {
      presences.forEach((presence) => {
        players.push({
          id: presence.user_id,
          username: presence.username,
          isHost: presence.is_host,
          joinedAt: presence.online_at,
        });
      });
    });

    return players;
  }, []);

  /**
   * Update presence (e.g., when username changes)
   */
  const updatePresence = useCallback(
    (updates: Partial<{ username: string; is_host: boolean }>) => {
      if (!channelRef.current) return;

      channelRef.current.track({
        user_id: userId,
        username: updates.username || username,
        is_host: updates.is_host !== undefined ? updates.is_host : isHost,
        online_at: new Date().toISOString(),
      });
    },
    [userId, username, isHost]
  );

  useEffect(() => {
    // Create channel
    const channelName = `room:${roomCode}`;
    console.log(`[Realtime] Connecting to channel: ${channelName}`);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
        broadcast: {
          self: true, // Receive own broadcasts
        },
      },
    });

    // Helper to get players from presence state
    const getPlayersFromPresence = (): Player[] => {
      const state = channel.presenceState<{
        user_id: string;
        username: string;
        is_host: boolean;
        online_at: string;
      }>();

      const players: Player[] = [];
      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          players.push({
            id: presence.user_id,
            username: presence.username,
            isHost: presence.is_host,
            joinedAt: presence.online_at,
          });
        });
      });
      console.log('[Realtime] Current players from presence:', players);
      return players;
    };

    // Setup presence sync handler
    channel.on('presence', { event: 'sync' }, () => {
      console.log('[Realtime] Presence synced');
      const players = getPlayersFromPresence();
      onPresenceSyncRef.current?.(players);
    });

    // Setup presence join handler
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[Realtime] Player joined:', key, newPresences);
      // Small delay to ensure presence state is updated
      setTimeout(() => {
        const players = getPlayersFromPresence();
        onPresenceSyncRef.current?.(players);
      }, 100);
    });

    // Setup presence leave handler
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[Realtime] Player left:', key);
      const players = getPlayersFromPresence();
      onPresenceSyncRef.current?.(players);
    });

    // Setup broadcast handlers for game events
    const gameEvents: GameEvent['type'][] = [
      'game_start',
      'vote_cast',
      'round_complete',
      'next_round',
      'game_end',
      'player_joined',
      'player_left',
    ];

    gameEvents.forEach((eventType) => {
      channel.on('broadcast', { event: eventType }, ({ payload }) => {
        console.log(`[Realtime] Received event: ${eventType}`, payload);
        onGameEventRef.current?.({ type: eventType, payload });
      });
    });

    // Subscribe and track presence
    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed successfully');
          isConnectedRef.current = true;

          // Track presence
          await channel.track({
            user_id: userId,
            username,
            is_host: isHost,
            online_at: new Date().toISOString(),
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error');
          isConnectedRef.current = false;
          onErrorRef.current?.(new Error('Realtime channel error'));
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] Connection timed out');
          isConnectedRef.current = false;
          onErrorRef.current?.(new Error('Realtime connection timed out'));
        } else if (status === 'CLOSED') {
          console.log('[Realtime] Channel closed');
          isConnectedRef.current = false;
        }
      });

    channelRef.current = channel;

    // Cleanup - delay to allow new component to take over the channel
    return () => {
      const channelToCleanup = channelRef.current;
      channelRef.current = null;
      isConnectedRef.current = false;

      // Delay cleanup to avoid race condition with new component
      setTimeout(() => {
        if (channelToCleanup) {
          console.log('[Realtime] Cleaning up channel (delayed)');
          channelToCleanup.untrack();
          supabase.removeChannel(channelToCleanup);
        }
      }, 500);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, userId, username, isHost]);

  return {
    sendEvent,
    getPresence,
    updatePresence,
    isConnected: isConnectedRef.current,
  };
}

/**
 * Simplified hook for listening to game events only (no presence)
 */
export function useGameEvents(
  roomCode: string,
  onEvent: (event: GameEvent) => void
) {
  useEffect(() => {
    const channelName = `room:${roomCode}`;
    const channel = supabase.channel(channelName);

    const gameEvents: GameEvent['type'][] = [
      'game_start',
      'vote_cast',
      'round_complete',
      'next_round',
      'game_end',
    ];

    gameEvents.forEach((eventType) => {
      channel.on('broadcast', { event: eventType }, ({ payload }) => {
        onEvent({ type: eventType, payload });
      });
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomCode, onEvent]);
}
