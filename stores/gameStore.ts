import { create } from 'zustand';
import { Room, Player, Question, Vote, RoundResult, GameStatus, Vibe } from '../types';

/**
 * Game Store
 * Central state management for the game using Zustand
 */

interface GameState {
  // Room & Game State
  currentRoom: Room | null;
  players: Player[];
  currentQuestion: Question | null;
  currentRound: number;
  gameStatus: GameStatus;
  vibe: Vibe;

  // Voting State
  votes: Vote[];
  hasVoted: boolean;
  votedForId: string | null;

  // Results State
  results: RoundResult[] | null;
  roundWinner: { id: string; name: string } | null;

  // User State
  userId: string | null;
  username: string | null;
  isHost: boolean;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setRoom: (room: Room) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;

  setQuestion: (question: Question | null) => void;
  setRound: (round: number) => void;
  setGameStatus: (status: GameStatus) => void;
  setVibe: (vibe: Vibe) => void;

  addVote: (vote: Vote) => void;
  setVotes: (votes: Vote[]) => void;
  setHasVoted: (voted: boolean) => void;
  setVotedForId: (playerId: string | null) => void;

  setResults: (results: RoundResult[]) => void;
  setRoundWinner: (winner: { id: string; name: string } | null) => void;

  setUser: (userId: string, username: string, isHost: boolean) => void;
  updateUsername: (username: string) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Complex Actions
  startGame: () => void;
  nextRound: () => void;
  endGame: () => void;
  leaveRoom: () => void;
  reset: () => void;

  // Computed
  getPlayerById: (playerId: string) => Player | undefined;
  getVoteCount: () => number;
  getExpectedVoteCount: () => number;
  isVotingComplete: () => boolean;
}

const initialState = {
  currentRoom: null,
  players: [],
  currentQuestion: null,
  currentRound: 1,
  gameStatus: 'lobby' as GameStatus,
  vibe: 'party' as Vibe,
  votes: [],
  hasVoted: false,
  votedForId: null,
  results: null,
  roundWinner: null,
  userId: null,
  username: null,
  isHost: false,
  isLoading: false,
  error: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  // Room & Player Actions
  setRoom: (room) => set({ currentRoom: room, vibe: room.vibe, gameStatus: room.status, currentRound: room.currentRound }),

  setPlayers: (players) => set({ players }),

  addPlayer: (player) =>
    set((state) => {
      // Check if player already exists
      const exists = state.players.some((p) => p.id === player.id);
      if (exists) {
        return state;
      }
      return { players: [...state.players, player] };
    }),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  updatePlayer: (playerId, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    })),

  // Game State Actions
  setQuestion: (question) => set({ currentQuestion: question }),

  setRound: (round) => set({ currentRound: round }),

  setGameStatus: (status) => set({ gameStatus: status }),

  setVibe: (vibe) => set({ vibe }),

  // Voting Actions
  addVote: (vote) =>
    set((state) => {
      // Check if vote already exists
      const exists = state.votes.some((v) => v.id === vote.id);
      if (exists) {
        return state;
      }
      return { votes: [...state.votes, vote] };
    }),

  setVotes: (votes) => set({ votes }),

  setHasVoted: (voted) => set({ hasVoted: voted }),

  setVotedForId: (playerId) => set({ votedForId: playerId }),

  // Results Actions
  setResults: (results) => set({ results }),

  setRoundWinner: (winner) => set({ roundWinner: winner }),

  // User Actions
  setUser: (userId, username, isHost) =>
    set({ userId, username, isHost }),

  updateUsername: (username) => set({ username }),

  // UI Actions
  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  // Complex Actions
  startGame: () =>
    set((state) => ({
      gameStatus: 'playing',
      currentRound: 1,
      votes: [],
      hasVoted: false,
      votedForId: null,
      results: null,
      roundWinner: null,
    })),

  nextRound: () =>
    set((state) => ({
      currentRound: state.currentRound + 1,
      currentQuestion: null,
      votes: [],
      hasVoted: false,
      votedForId: null,
      results: null,
      roundWinner: null,
      gameStatus: 'playing',
    })),

  endGame: () =>
    set({
      gameStatus: 'finished',
      currentQuestion: null,
    }),

  leaveRoom: () =>
    set({
      ...initialState,
    }),

  reset: () => set(initialState),

  // Computed
  getPlayerById: (playerId) => {
    const state = get();
    return state.players.find((p) => p.id === playerId);
  },

  getVoteCount: () => {
    const state = get();
    return state.votes.filter((v) => v.round === state.currentRound).length;
  },

  getExpectedVoteCount: () => {
    const state = get();
    // All active players except the host voting
    return state.players.length;
  },

  isVotingComplete: () => {
    const state = get();
    const voteCount = state.votes.filter(
      (v) => v.round === state.currentRound
    ).length;
    const expectedVotes = state.players.length;

    return voteCount >= expectedVotes && expectedVotes > 0;
  },
}));

/**
 * Helper hooks for specific state slices
 */

export const useRoom = () => useGameStore((state) => state.currentRoom);
export const usePlayers = () => useGameStore((state) => state.players);
export const useQuestion = () => useGameStore((state) => state.currentQuestion);
export const useGameStatus = () => useGameStore((state) => state.gameStatus);
export const useCurrentUser = () =>
  useGameStore((state) => ({
    userId: state.userId,
    username: state.username,
    isHost: state.isHost,
  }));
export const useVotes = () => useGameStore((state) => state.votes);
export const useResults = () => useGameStore((state) => state.results);
export const useIsHost = () => useGameStore((state) => state.isHost);
