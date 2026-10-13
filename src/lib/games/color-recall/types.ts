// src/lib/games/color-recall/types.ts

export interface HSLColor {
  h: number; // 0 - 360 (degrees)
  s: number; // 0 - 100 (%)
  l: number; // 0 - 100 (%)
}

export interface RGBColor {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface LabColor {
  l: number; // 0 - 100
  a: number; // -128 to 127
  b: number; // -128 to 127
}

export interface ColorAccuracyResult {
  deltaE: number;       // Perceptual distance (0 = identical, 100 = opposite)
  accuracy: number;     // 0 - 100 (%)
  score: number;        // 0 - 1000 points
  ratingLabel: string;  // e.g. "Chameleon Eye", "Sharp Match"
  ratingEmoji: string;  // e.g. "🎯", "✨"
  hueDiff: number;      // absolute degrees difference
  satDiff: number;      // absolute saturation difference
  lightDiff: number;    // absolute lightness difference
}

export interface RoundResult {
  roundNumber: number;
  target: HSLColor;
  guess: HSLColor;
  targetHex: string;
  guessHex: string;
  accuracy: number;
  score: number;
  deltaE: number;
  ratingLabel: string;
  ratingEmoji: string;
  timeSpentSeconds: number;
}

export type ColorRecallPhase = 'ready' | 'memorize' | 'recreate' | 'reveal' | 'game_over';

export interface ColorRecallSessionStats {
  gamesPlayed: number;
  highScore: number;
  bestAccuracy: number;
  totalPoints: number;
}
