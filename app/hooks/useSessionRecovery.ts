import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRoom } from '@/services/roomService';
import { getPlayer } from '@/services/playerService';
import { Room } from '@/types';

const STORAGE_KEY = '@busted/last_room';

interface LastRoomData {
  code: string;
  joinedAt: string;
}

interface SessionRecoveryResult {
  hasLastRoom: boolean;
  lastRoom: Room | null;
  lastRoomCode: string | null;
  isLoading: boolean;
  clearLastRoom: () => Promise<void>;
}

/**
 * Hook für Session Recovery
 *
 * Speichert den letzten Raum und prüft beim App-Start,
 * ob der User wieder beitreten kann.
 */
export function useSessionRecovery(userId: string | null): SessionRecoveryResult {
  const [lastRoom, setLastRoom] = useState<Room | null>(null);
  const [lastRoomCode, setLastRoomCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkLastRoom() {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (!savedData) {
          setIsLoading(false);
          return;
        }

        const { code, joinedAt } = JSON.parse(savedData) as LastRoomData;

        // Check if the saved room is less than 24 hours old
        const joinedTime = new Date(joinedAt).getTime();
        const now = Date.now();
        const hoursAgo = (now - joinedTime) / (1000 * 60 * 60);

        if (hoursAgo > 24) {
          // Too old, clear it
          await AsyncStorage.removeItem(STORAGE_KEY);
          setIsLoading(false);
          return;
        }

        // Check if room still exists and is active
        const room = await getRoom(code);
        if (!room || room.status === 'finished') {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setIsLoading(false);
          return;
        }

        // Check if user is still a player in the room
        const player = await getPlayer(room.id, userId);
        if (!player) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setIsLoading(false);
          return;
        }

        // Room is valid and user is a player
        setLastRoom(room);
        setLastRoomCode(code);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking last room:', error);
        await AsyncStorage.removeItem(STORAGE_KEY);
        setIsLoading(false);
      }
    }

    checkLastRoom();
  }, [userId]);

  const clearLastRoom = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setLastRoom(null);
    setLastRoomCode(null);
  };

  return {
    hasLastRoom: lastRoom !== null,
    lastRoom,
    lastRoomCode,
    isLoading,
    clearLastRoom,
  };
}

/**
 * Speichert den aktuellen Raum als letzten Raum
 */
export async function saveLastRoom(code: string): Promise<void> {
  const data: LastRoomData = {
    code,
    joinedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Löscht den letzten Raum
 */
export async function clearLastRoom(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
