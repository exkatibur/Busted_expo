import { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';

/**
 * User Hook für BUSTED!
 *
 * Wrapper um den UserStore mit:
 * - Auto-Initialize beim ersten Mount
 * - Convenience-Funktionen
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { username, isInitialized, setUsername } = useUser();
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

    // Actions
    setUsername: store.setUsername,
    clearUser: store.clearUser,

    // Computed
    hasUser: store.userId !== null,
    hasUsername: store.username !== null && store.username.length >= 3,
  };
}
