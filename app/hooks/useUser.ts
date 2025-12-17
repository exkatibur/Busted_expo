import { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';

/**
 * User Hook für BUSTED!
 *
 * Wrapper um den UserStore mit:
 * - Auto-Initialize beim ersten Mount
 * - Convenience-Funktionen
 * - Auth-Funktionen für registrierte User
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { username, isInitialized, isAuthenticated, setUsername } = useUser();
 *
 *   if (!isInitialized) {
 *     return <UsernameScreen onSubmit={setUsername} />;
 *   }
 *
 *   return <div>Willkommen, {username}!</div>;
 * }
 * ```
 */
export function useUser() {
  const store = useUserStore();

  // Auto-initialize beim App-Start
  useEffect(() => {
    if (!store.isInitialized && !store.isLoading) {
      store.initializeUser();
    }
  }, []);

  return {
    // State
    userId: store.userId,
    username: store.username,
    isInitialized: store.isInitialized,
    isLoading: store.isLoading,

    // Auth State
    authUser: store.authUser,
    session: store.session,
    isAuthenticated: store.isAuthenticated,
    email: store.authUser?.email || null,

    // Actions
    setUsername: store.setUsername,
    clearUser: store.clearUser,

    // Auth Actions
    signIn: store.signIn,
    signUp: store.signUp,
    signOut: store.signOut,

    // Computed
    hasUser: store.userId !== null,
    hasUsername: store.username !== null && store.username.length >= 3,
  };
}
