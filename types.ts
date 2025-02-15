export type CharacterType = 'girl' | 'boy';

export interface Hint {
  text: string;
  sender: CharacterType;
  timestamp: number;
}

export interface GameState {
  word: string;
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
  hints: Hint[];
  difficulty: 1 | 2 | 3;
  context?: string;
}

export interface CustomGameData {
  word: string;
  hint: string;
  context?: string;
}

export enum GameMode {
  MENU = 'MENU',
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
}

export interface VideoConfig {
  src: string;
  loop?: boolean;
}