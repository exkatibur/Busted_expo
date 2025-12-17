import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Player } from '@/types';
import { debugLog, debugError } from '@/lib/debug';

/**
 * RealtimeContext - Shared Supabase Realtime Channel for a Room
 *
 * This context manages a SINGLE channel per room that is shared across
 * all screens (Lobby, Game, Results). This prevents the issue where
 * navigating between screens creates/destroys channels.
 */

export interface GameEvent {
  type: 'game_start' | 'vote_cast' | 'round_complete' | 'next_round' | 'game_end' | 'player_joined' | 'player_left' | 'question_skipped' | 'reveal_request' | 'reveal_response' | 'reveal_result';
  payload: any;
}

interface RealtimeContextValue {
  isConnected: boolean;
  players: Player[];
  sendEvent: (type: GameEvent['type'], payload?: any) => void;
  subscribeToGameEvents: (callback: (event: GameEvent) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: React.ReactNode;
  roomCode: string;
  userId: string;
  username: string;
  isHost: boolean;
}

export function RealtimeProvider({
  children,
  roomCode,
  userId,
  username,
  isHost
}: RealtimeProviderProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);

  // Store game event listeners
  const gameEventListenersRef = useRef<Set<(event: GameEvent) => void>>(new Set());

  /**
   * Send a game event to all players in the room
   */
  const sendEvent = useCallback((type: GameEvent['type'], payload: any = {}) => {
    if (!channelRef.current) {
      debugError('realtime', 'Cannot send event: Channel not connected');
      return;
    }

    debugLog('realtime', `Sending event: ${type}`, payload);
    channelRef.current.send({
      type: 'broadcast',
      event: type,
      payload,
    });
  }, []);

  /**
   * Subscribe to game events - returns unsubscribe function
   */
  const subscribeToGameEvents = useCallback((callback: (event: GameEvent) => void) => {
    gameEventListenersRef.current.add(callback);
    debugLog('realtime', 'Added game event listener, total:', gameEventListenersRef.current.size);

    return () => {
      gameEventListenersRef.current.delete(callback);
      debugLog('realtime', 'Removed game event listener, total:', gameEventListenersRef.current.size);
    };
  }, []);

  /**
   * Notify all listeners of a game event
   */
  const notifyGameEventListeners = useCallback((event: GameEvent) => {
    debugLog('realtime', `Notifying ${gameEventListenersRef.current.size} listeners of event:`, event.type);
    gameEventListenersRef.current.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        debugError('realtime', 'Error in game event listener:', err);
      }
    });
  }, []);

  // Setup channel on mount
  useEffect(() => {
    if (!roomCode || !userId) return;

    const channelName = `room:${roomCode}`;
    debugLog('realtime', `[Provider] Creating channel: ${channelName}`);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
        broadcast: {
          self: true,
        },
      },
    });

    // Helper to get players from presence (deduplicated by user_id)
    const getPlayersFromPresence = (): Player[] => {
      const state = channel.presenceState<{
        user_id: string;
        username: string;
        is_host: boolean;
        online_at: string;
      }>();

      const playerMap = new Map<string, Player>();
      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          // Only keep the most recent presence for each user (by online_at)
          const existing = playerMap.get(presence.user_id);
          if (!existing || presence.online_at > existing.joinedAt) {
            playerMap.set(presence.user_id, {
              id: presence.user_id,
              username: presence.username,
              isHost: presence.is_host,
              joinedAt: presence.online_at,
            });
          }
        });
      });
      return Array.from(playerMap.values());
    };

    // Presence handlers
    channel.on('presence', { event: 'sync' }, () => {
      debugLog('realtime', '[Provider] Presence synced');
      const playerList = getPlayersFromPresence();
      setPlayers(playerList);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      debugLog('realtime', '[Provider] Player joined:', key);
      setTimeout(() => {
        const playerList = getPlayersFromPresence();
        setPlayers(playerList);
      }, 100);
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      debugLog('realtime', '[Provider] Player left:', key);
      const playerList = getPlayersFromPresence();
      setPlayers(playerList);
    });

    // Broadcast handlers for game events
    const gameEventTypes: GameEvent['type'][] = [
      'game_start',
      'vote_cast',
      'round_complete',
      'next_round',
      'game_end',
      'player_joined',
      'player_left',
      'question_skipped',
      'reveal_request',
      'reveal_response',
      'reveal_result',
    ];

    gameEventTypes.forEach((eventType) => {
      channel.on('broadcast', { event: eventType }, ({ payload }) => {
        debugLog('realtime', `[Provider] Received broadcast: ${eventType}`, payload);
        notifyGameEventListeners({ type: eventType, payload });
      });
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      debugLog('realtime', `[Provider] Subscription status: ${status}`);

      if (status === 'SUBSCRIBED') {
        setIsConnected(true);

        // Track presence
        await channel.track({
          user_id: userId,
          username,
          is_host: isHost,
          online_at: new Date().toISOString(),
        });
        debugLog('realtime', '[Provider] Presence tracked');

        // After tracking, manually get presence state to ensure we see ourselves
        setTimeout(() => {
          const playerList = getPlayersFromPresence();
          debugLog('realtime', '[Provider] Players after track:', playerList);
          setPlayers(playerList);
        }, 200);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        debugError('realtime', `[Provider] Channel error: ${status}`);
        setIsConnected(false);
      } else if (status === 'CLOSED') {
        debugLog('realtime', '[Provider] Channel closed');
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    // Cleanup only when provider unmounts (leaving room entirely)
    return () => {
      debugLog('realtime', '[Provider] Cleaning up channel');
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      setPlayers([]);
      gameEventListenersRef.current.clear();
    };
  }, [roomCode, userId, username, isHost, notifyGameEventListeners]);

  const value: RealtimeContextValue = {
    isConnected,
    players,
    sendEvent,
    subscribeToGameEvents,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to access the realtime context
 */
export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return context;
}

/**
 * Hook to subscribe to game events
 */
export function useGameEvents(onEvent: (event: GameEvent) => void) {
  const { subscribeToGameEvents } = useRealtimeContext();

  useEffect(() => {
    const unsubscribe = subscribeToGameEvents(onEvent);
    return unsubscribe;
  }, [subscribeToGameEvents, onEvent]);
}
