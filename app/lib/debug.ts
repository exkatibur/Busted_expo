/**
 * Debug System for BUSTED!
 *
 * Zentrale Debug-Flags für die Entwicklung.
 * Aktiviere/deaktiviere Logs für verschiedene Bereiche.
 *
 * Usage:
 * ```typescript
 * import { debugLog } from '@/lib/debug';
 *
 * debugLog('auth', 'User logged in:', userId);
 * debugLog('realtime', 'Channel connected:', channelName);
 * ```
 */

export const DebugFlags = {
  // Authentication & User Management
  auth: __DEV__,

  // Supabase Realtime (Presence, Broadcast, Channels)
  realtime: __DEV__,

  // Navigation & Routing
  navigation: false,

  // AsyncStorage & Local Persistence
  storage: __DEV__,

  // API Calls & Network Requests
  api: __DEV__,

  // Game State & Logic
  game: __DEV__,

  // Voting System
  voting: __DEV__,

  // UI Interactions & Animations
  ui: false,

  // Performance Monitoring
  performance: false,
} as const;

export type DebugCategory = keyof typeof DebugFlags;

/**
 * Logs a message to console if the debug flag is enabled.
 *
 * @param category - The debug category (e.g., 'auth', 'realtime')
 * @param args - Arguments to log
 *
 * @example
 * ```typescript
 * debugLog('auth', 'User ID:', userId);
 * debugLog('realtime', 'Channel event:', event, payload);
 * ```
 */
export const debugLog = (category: DebugCategory, ...args: any[]) => {
  if (DebugFlags[category]) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] [${category.toUpperCase()}]`, ...args);
  }
};

/**
 * Logs an error to console if the debug flag is enabled.
 * Always logs in development mode, regardless of flag.
 *
 * @param category - The debug category
 * @param args - Arguments to log
 *
 * @example
 * ```typescript
 * debugError('api', 'Failed to fetch data:', error);
 * ```
 */
export const debugError = (category: DebugCategory, ...args: any[]) => {
  if (DebugFlags[category] || __DEV__) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.error(`[${timestamp}] [${category.toUpperCase()}] ERROR:`, ...args);
  }
};

/**
 * Logs a warning to console if the debug flag is enabled.
 *
 * @param category - The debug category
 * @param args - Arguments to log
 *
 * @example
 * ```typescript
 * debugWarn('storage', 'AsyncStorage key not found:', key);
 * ```
 */
export const debugWarn = (category: DebugCategory, ...args: any[]) => {
  if (DebugFlags[category]) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.warn(`[${timestamp}] [${category.toUpperCase()}] WARN:`, ...args);
  }
};

/**
 * Measures execution time of a function.
 * Only active if performance flag is enabled.
 *
 * @param label - Label for the measurement
 * @param fn - Function to measure
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const result = await debugTime('fetchQuestions', async () => {
 *   return await supabase.from('questions').select();
 * });
 * ```
 */
export const debugTime = async <T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> => {
  if (!DebugFlags.performance) {
    return fn();
  }

  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    console.log(`[PERFORMANCE] ${label}: ${duration}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    console.error(`[PERFORMANCE] ${label} FAILED after ${duration}ms:`, error);
    throw error;
  }
};

/**
 * Logs an object in a formatted way.
 * Useful for debugging complex data structures.
 *
 * @param category - The debug category
 * @param label - Label for the object
 * @param obj - Object to log
 *
 * @example
 * ```typescript
 * debugObject('game', 'Room State', roomState);
 * ```
 */
export const debugObject = (
  category: DebugCategory,
  label: string,
  obj: any
) => {
  if (DebugFlags[category]) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] [${category.toUpperCase()}] ${label}:`);
    console.dir(obj, { depth: null });
  }
};

/**
 * Creates a debug group for related logs.
 * Useful for grouping multiple related log statements.
 *
 * @param category - The debug category
 * @param label - Label for the group
 * @param fn - Function to execute within the group
 *
 * @example
 * ```typescript
 * debugGroup('realtime', 'Channel Setup', () => {
 *   debugLog('realtime', 'Creating channel:', channelName);
 *   debugLog('realtime', 'Subscribing to events...');
 *   debugLog('realtime', 'Channel ready');
 * });
 * ```
 */
export const debugGroup = (
  category: DebugCategory,
  label: string,
  fn: () => void
) => {
  if (DebugFlags[category]) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.group(`[${timestamp}] [${category.toUpperCase()}] ${label}`);
    fn();
    console.groupEnd();
  }
};

// Global flag to enable/disable all debug logs
export let GLOBAL_DEBUG_ENABLED = __DEV__;

/**
 * Globally enable or disable all debug logs.
 *
 * @param enabled - Whether to enable debug logs
 *
 * @example
 * ```typescript
 * // Disable all logs in production
 * setGlobalDebug(false);
 * ```
 */
export const setGlobalDebug = (enabled: boolean) => {
  GLOBAL_DEBUG_ENABLED = enabled;
  Object.keys(DebugFlags).forEach((key) => {
    (DebugFlags as any)[key] = enabled;
  });
};
