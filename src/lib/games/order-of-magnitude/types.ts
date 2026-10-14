// src/lib/games/order-of-magnitude/types.ts

export type MagnitudeCategory =
  | 'Space & Astronomy'
  | 'Earth & Nature'
  | 'Humanity & Society'
  | 'Technology & Computing'
  | 'Biology & Anatomy'
  | 'Time & History'
  | 'Physics & Measurement'
  | 'Everyday Life';

export interface ComparisonItem {
  label: string;
  value: number;
  unit: string;
  formattedValue: string;
  detail?: string;
}

export interface RawComparisonPair {
  id: string;
  title: string;
  category: MagnitudeCategory;
  item1: ComparisonItem;
  item2: ComparisonItem;
  explanation: string;
  funFact?: string;
}

export interface ActiveRoundComparison {
  roundNumber: number;
  pairId: string;
  title: string;
  category: MagnitudeCategory;
  optionA: ComparisonItem;
  optionB: ComparisonItem;
  largerOption: 'A' | 'B';
  ratio: number;
  ratioDisplay: string;
  actualMagnitudeDiff: number; // Integer power of 10 difference (e.g. 0, 1, 2...)
  rawMagnitudeDiff: number;    // Floating point log10 difference
  explanation: string;
  funFact?: string;
}

export interface RoundEvaluation {
  chosenOption: 'A' | 'B';
  isCorrectSelection: boolean;
  chosenMagnitudeGuess: number | null;
  actualMagnitudeDiff: number;
  magnitudeError: number | null;
  baseScore: number;       // 100 if correct, 0 if incorrect
  magnitudeBonus: number;  // 0 to 50, awarded ONLY if correct selection
  totalRoundScore: number; // 0 to 150
}

export interface SessionRoundResult {
  roundNumber: number;
  comparison: ActiveRoundComparison;
  evaluation: RoundEvaluation;
}

export type OrderOfMagnitudePhase = 'ready' | 'playing' | 'reveal' | 'game_over';

export interface OrderOfMagnitudeStats {
  gamesPlayed: number;
  highScore: number;
  bestStreak: number;
  totalScore: number;
  correctComparisons: number;
  totalComparisons: number;
}
