export type Vibe = 'party' | 'date_night' | 'family' | 'spicy';

export type GameStatus = 'lobby' | 'playing' | 'results' | 'finished';

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  joinedAt: string;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  vibe: Vibe;
  status: GameStatus;
  currentQuestionId?: string;
  currentRound: number;
  createdAt: string;
}

export interface Question {
  id: string;
  vibe: Vibe;
  text: string;
  isPremium: boolean;
}

export interface Vote {
  id: string;
  roomId: string;
  questionId: string;
  round: number;
  voterId: string;
  votedForId: string;
}

export interface RoundResult {
  playerId: string;
  playerName: string;
  votes: number;
  percentage: number;
}

export interface VibeOption {
  id: Vibe;
  name: string;
  icon: string;
  color: string;
  isPremium?: boolean;
}
