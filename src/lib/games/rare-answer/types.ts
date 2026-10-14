// src/lib/games/rare-answer/types.ts

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'unlisted-rare';

export interface ReferenceAnswer {
  canonical: string;
  aliases: string[];
  tier: RarityTier;
  points: number;
  funFact?: string;
}

export interface KnownInvalid {
  canonical: string;
  aliases: string[];
  reason: string;
}

export interface RareAnswerPrompt {
  id: string;
  category: string;
  prompt: string;
  clarification?: string;
  referenceAnswers: ReferenceAnswer[];
  knownInvalid?: KnownInvalid[];
}

export type ValidationStatus =
  | 'verified_valid'
  | 'verified_invalid'
  | 'ai_valid'
  | 'ai_invalid'
  | 'unrecognized';

export interface ValidationResult {
  valid: boolean;
  status: ValidationStatus;
  canonicalAnswer?: string;
  tier?: RarityTier;
  score: number;
  reason: string;
  promptId: string;
  userGuess: string;
  funFact?: string;
}

export interface RoundResult {
  roundNumber: number;
  prompt: RareAnswerPrompt;
  userGuess: string;
  validation: ValidationResult;
}

export type RareAnswerPhase = 'ready' | 'question' | 'evaluating' | 'reveal' | 'game_over';

export interface RareAnswerSessionStats {
  gamesPlayed: number;
  highScore: number;
  bestRoundScore: number;
  totalScore: number;
}
