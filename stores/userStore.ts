import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_ID: '@busted/user_id',
  USERNAME: '@busted/username',
} as const;

/**
 * User Store für BUSTED!
 *
 * Managed anonyme User mit:
 * - userId: UUID (wird automatisch generiert oder aus AsyncStorage geladen)
 * - username: Vom User gewählter Name
 * - isInitialized: Ob User schon einen Username gewählt hat
 */
interface UserState {
  userId: string | null;
  username: string | null;
  isInitialized: boolean;
  isLoading: boolean;

  // Actions
  setUsername: (username: string) => Promise<void>;
  initializeUser: () => Promise<void>;
  clearUser: () => Promise<void>;
}

/**
 * Generiert eine UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useUserStore = create<UserState>((set, get) => ({
  userId: null,
  username: null,
  isInitialized: false,
  isLoading: true,

  /**
   * Setzt den Username und speichert ihn persistent
   */
  setUsername: async (username: string) => {
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      throw new Error('Username muss mindestens 3 Zeichen lang sein');
    }
    if (trimmedUsername.length > 20) {
      throw new Error('Username darf maximal 20 Zeichen lang sein');
    }

    await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, trimmedUsername);
    set({ username: trimmedUsername, isInitialized: true });
  },

  /**
   * Initialisiert den User beim App-Start:
   * 1. Lädt oder generiert userId
   * 2. Lädt username aus AsyncStorage
   * 3. Setzt isInitialized basierend auf ob username existiert
   */
  initializeUser: async () => {
    try {
      set({ isLoading: true });

      // 1. User ID laden oder generieren
      let userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      if (!userId) {
        userId = generateUUID();
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      }

      // 2. Username laden (falls vorhanden)
      const username = await AsyncStorage.getItem(STORAGE_KEYS.USERNAME);

      // 3. State setzen
      set({
        userId,
        username,
        isInitialized: username !== null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize user:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Löscht alle User-Daten (für Debugging/Testing)
   */
  clearUser: async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USERNAME,
    ]);
    set({
      userId: null,
      username: null,
      isInitialized: false,
    });
  },
}));
