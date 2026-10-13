// src/lib/games/pattern-recall/types.ts

export type PatternRecallPhase =
  | 'ready'
  | 'demonstrating'
  | 'input'
  | 'round_success'
  | 'game_over'
  | 'victory';

export interface PatternTile {
  id: number;
  keyLabel: string;
  name: string;
  color: string;
  bgHex: string;
  activeHex: string;
  glowHex: string;
  noteFrequency: number; // Hz
}

export interface PatternRecallState {
  phase: PatternRecallPhase;
  round: number;
  sequence: number[];
  currentStep: number;
  score: number;
  highScore: number;
  correctInputs: number;
  totalInputs: number;
  activeTileId: number | null;
  errorTileId: number | null;
  maxRound: number;
}

export interface PatternRecallSessionStats {
  gamesPlayed: number;
  highScore: number;
  bestRound: number;
  longestSequence: number;
  totalInputs: number;
  correctInputs: number;
}

export interface TimingConfig {
  onDurationMs: number;
  offDurationMs: number;
}
