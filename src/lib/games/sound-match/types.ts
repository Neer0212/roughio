// src/lib/games/sound-match/types.ts

export type SoundMatchPhase = 'ready' | 'listen' | 'adjust' | 'reveal' | 'game_over';

export interface PitchScoreResult {
  centsDiff: number;       // Signed cents difference (guess vs target)
  absCentsDiff: number;    // Absolute cents difference
  score: number;           // 0 to 1,000 points
  accuracy: number;        // 0 to 100%
  ratingLabel: string;     // e.g. "Perfect Pitch", "Golden Ear"
  ratingEmoji: string;     // e.g. "🎯", "⚡"
  feedback: string;        // Short descriptive message
}

export interface SoundMatchRoundResult {
  roundNumber: number;
  targetFrequency: number;
  guessFrequency: number;
  centsDiff: number;
  absCentsDiff: number;
  score: number;
  accuracy: number;
  ratingLabel: string;
  ratingEmoji: string;
  replaysUsed: number;
  targetNote: string;
  guessNote: string;
}

export interface SoundMatchSessionStats {
  gamesPlayed: number;
  highScore: number;
  bestAccuracy: number;
  totalScore: number;
}
