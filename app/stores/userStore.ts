import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  getSession,
  getCurrentUser,
  updateUserMetadata,
  onAuthStateChange,
} from '../services/authService';

const STORAGE_KEYS = {
  USER_ID: '@busted/user_id',
  USERNAME: '@busted/username',
} as const;

/**
 * User Store für BUSTED!
 *
 * Managed beide User-Typen:
 * 1. Anonyme User: UUID + lokaler Username
 * 2. Registrierte User: Supabase Auth
 */
interface UserState {
  // Anonymous user state
  userId: string | null;
  username: string | null;
  isInitialized: boolean;
  isLoading: boolean;

  // Auth state
  authUser: User | null;
  session: Session | null;
  isAuthenticated: boolean;

  // Actions - Anonymous
  setUsername: (username: string) => Promise<void>;
  initializeUser: () => Promise<void>;
  clearUser: () => Promise<void>;

  // Actions - Auth
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateAuthUsername: (username: string) => Promise<{ error: string | null }>;
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
  // Initial state
  userId: null,
  username: null,
  isInitialized: false,
  isLoading: false,
  authUser: null,
  session: null,
  isAuthenticated: false,

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

    // If authenticated, also update in Supabase
    const { isAuthenticated } = get();
    if (isAuthenticated) {
      const { error } = await updateUserMetadata({ username: trimmedUsername });
      if (error) {
        throw new Error(error.message);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, trimmedUsername);
    set({ username: trimmedUsername, isInitialized: true });
  },

  /**
   * Initialisiert den User beim App-Start:
   * 1. Prüft auf bestehende Auth-Session
   * 2. Lädt oder generiert userId
   * 3. Lädt username aus AsyncStorage
   */
  initializeUser: async () => {
    try {
      set({ isLoading: true });

      // 1. Check for existing auth session
      const session = await getSession();
      if (session) {
        const user = await getCurrentUser();
        if (user) {
          const authUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
          set({
            userId: user.id,
            username: authUsername,
            isInitialized: true,
            isLoading: false,
            authUser: user,
            session,
            isAuthenticated: true,
          });
          // Store username locally as well
          await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, authUsername);
          return;
        }
      }

      // 2. No auth session - use anonymous user
      let userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      if (!userId) {
        userId = generateUUID();
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      }

      // 3. Load username
      const username = await AsyncStorage.getItem(STORAGE_KEYS.USERNAME);

      set({
        userId,
        username,
        isInitialized: username !== null,
        isLoading: false,
        authUser: null,
        session: null,
        isAuthenticated: false,
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
      authUser: null,
      session: null,
      isAuthenticated: false,
    });
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { user, session, error } = await authSignIn(email, password);

      if (error) {
        set({ isLoading: false });
        return { error: error.message };
      }

      if (user && session) {
        const authUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
        await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, authUsername);

        set({
          userId: user.id,
          username: authUsername,
          isInitialized: true,
          isLoading: false,
          authUser: user,
          session,
          isAuthenticated: true,
        });
      }

      return { error: null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (email: string, password: string, username: string) => {
    try {
      set({ isLoading: true });
      const { user, session, error } = await authSignUp(email, password, username);

      if (error) {
        set({ isLoading: false });
        return { error: error.message };
      }

      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, username);

        set({
          userId: user.id,
          username,
          isInitialized: true,
          isLoading: false,
          authUser: user,
          session,
          isAuthenticated: !!session, // May be null if email confirmation required
        });
      }

      return { error: null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  },

  /**
   * Sign out - clears all data and returns to fresh start
   */
  signOut: async () => {
    try {
      await authSignOut();

      // Clear all local data (full reset, no anonymous identity)
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USERNAME,
      ]);

      set({
        userId: null,
        username: null,
        isInitialized: false,
        authUser: null,
        session: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  },

  /**
   * Update username for authenticated user
   */
  updateAuthUsername: async (username: string) => {
    const { isAuthenticated } = get();
    if (!isAuthenticated) {
      return { error: 'Nicht eingeloggt' };
    }

    const { error } = await updateUserMetadata({ username });
    if (error) {
      return { error: error.message };
    }

    await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, username);
    set({ username });
    return { error: null };
  },
}));
