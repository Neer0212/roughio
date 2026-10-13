// src/lib/games/pattern-recall/pattern-utils.ts
import type {
  PatternTile,
  PatternRecallState,
  TimingConfig,
} from './types';

export const DEFAULT_MAX_ROUNDS = 15;
export const STARTING_SEQUENCE_LENGTH = 3;

/**
 * 9 distinct tiles mapped across a 3x3 grid with musical note frequencies (pentatonic/diatonic scale).
 */
export const PATTERN_TILES: PatternTile[] = [
  {
    id: 0,
    keyLabel: '1',
    name: 'Coral Flare',
    color: '#FF5A43',
    bgHex: '#2A1714',
    activeHex: '#FF5A43',
    glowHex: 'rgba(255, 90, 67, 0.7)',
    noteFrequency: 261.63, // C4
  },
  {
    id: 1,
    keyLabel: '2',
    name: 'Solar Amber',
    color: '#FF9F1C',
    bgHex: '#2A1D0D',
    activeHex: '#FF9F1C',
    glowHex: 'rgba(255, 159, 28, 0.7)',
    noteFrequency: 293.66, // D4
  },
  {
    id: 2,
    keyLabel: '3',
    name: 'Electric Gold',
    color: '#FFDE00',
    bgHex: '#2A2508',
    activeHex: '#FFDE00',
    glowHex: 'rgba(255, 222, 0, 0.7)',
    noteFrequency: 329.63, // E4
  },
  {
    id: 3,
    keyLabel: '4',
    name: 'Neon Mint',
    color: '#00F5D4',
    bgHex: '#082723',
    activeHex: '#00F5D4',
    glowHex: 'rgba(0, 245, 212, 0.7)',
    noteFrequency: 349.23, // F4
  },
  {
    id: 4,
    keyLabel: '5',
    name: 'Emerald Core',
    color: '#35D07F',
    bgHex: '#0B2618',
    activeHex: '#35D07F',
    glowHex: 'rgba(53, 208, 127, 0.7)',
    noteFrequency: 392.00, // G4
  },
  {
    id: 5,
    keyLabel: '6',
    name: 'Arcade Azure',
    color: '#3A86FF',
    bgHex: '#0D1C34',
    activeHex: '#3A86FF',
    glowHex: 'rgba(58, 134, 255, 0.7)',
    noteFrequency: 440.00, // A4
  },
  {
    id: 6,
    keyLabel: '7',
    name: 'Cyber Violet',
    color: '#7209B7',
    bgHex: '#1D082C',
    activeHex: '#7209B7',
    glowHex: 'rgba(114, 9, 183, 0.7)',
    noteFrequency: 493.88, // B4
  },
  {
    id: 7,
    keyLabel: '8',
    name: 'Hot Magenta',
    color: '#F72585',
    bgHex: '#2E091C',
    activeHex: '#F72585',
    glowHex: 'rgba(247, 37, 133, 0.7)',
    noteFrequency: 523.25, // C5
  },
  {
    id: 8,
    keyLabel: '9',
    name: 'Hyper Teal',
    color: '#2EC4B6',
    bgHex: '#092422',
    activeHex: '#2EC4B6',
    glowHex: 'rgba(46, 196, 182, 0.7)',
    noteFrequency: 587.33, // D5
  },
];

/**
 * Returns sequence length for a given round index (1-indexed).
 * Round 1: 3 tiles, Round 2: 4 tiles, ...
 */
export function getSequenceLengthForRound(
  round: number,
  startingLength = STARTING_SEQUENCE_LENGTH
): number {
  const safeRound = Math.max(1, Math.floor(round));
  return startingLength + (safeRound - 1);
}

/**
 * Deterministically generates an array of tile indices (0..tileCount-1) of specified length.
 * Rejects lengths < 1 and uses provided rng function or Math.random.
 */
export function generatePatternSequence(
  length: number,
  tileCount = 9,
  rng: () => number = Math.random
): number[] {
  const safeLength = Math.max(1, Math.floor(length));
  const safeTileCount = Math.max(2, Math.floor(tileCount));
  const sequence: number[] = [];

  for (let i = 0; i < safeLength; i++) {
    let nextTile = Math.floor(rng() * safeTileCount);

    // Variety guard: avoid 3 identical consecutive tiles
    if (i >= 2 && nextTile === sequence[i - 1] && nextTile === sequence[i - 2]) {
      nextTile = (nextTile + 1) % safeTileCount;
    }

    sequence.push(nextTile);
  }

  return sequence;
}

/**
 * Points awarded for an individual correct step in a round.
 * Scales with the round number.
 */
export function calculateStepScore(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  return safeRound * 15;
}

/**
 * Bonus points awarded upon successfully completing a round.
 */
export function calculateRoundBonus(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  return safeRound * 100;
}

/**
 * Calculates overall accuracy percentage (0 to 100).
 */
export function calculateAccuracy(correctInputs: number, totalInputs: number): number {
  if (totalInputs <= 0) return 100;
  const ratio = Math.max(0, Math.min(1, correctInputs / totalInputs));
  return Math.round(ratio * 1000) / 10; // e.g. 96.5%
}

/**
 * Adaptive display timings: accelerates slightly as rounds advance to feel snappy.
 */
export function getTimingForRound(round: number): TimingConfig {
  const safeRound = Math.max(1, Math.floor(round));

  if (safeRound <= 3) {
    return { onDurationMs: 480, offDurationMs: 160 };
  }
  if (safeRound <= 6) {
    return { onDurationMs: 380, offDurationMs: 130 };
  }
  if (safeRound <= 10) {
    return { onDurationMs: 300, offDurationMs: 100 };
  }
  return { onDurationMs: 240, offDurationMs: 80 };
}

/**
 * Factory for initial game state.
 */
export function createInitialState(highScore = 0, maxRound = DEFAULT_MAX_ROUNDS): PatternRecallState {
  return {
    phase: 'ready',
    round: 1,
    sequence: [],
    currentStep: 0,
    score: 0,
    highScore,
    correctInputs: 0,
    totalInputs: 0,
    activeTileId: null,
    errorTileId: null,
    maxRound,
  };
}

/**
 * Pure state reducer for player tile selection.
 * Protects against input during demonstration, game-over, or invalid states.
 */
export function processTileInput(
  state: PatternRecallState,
  tileId: number
): {
  nextState: PatternRecallState;
  isCorrect: boolean;
  isRoundComplete: boolean;
  isGameOver: boolean;
} {
  // Guard: inputs are strictly rejected unless in 'input' phase
  if (state.phase !== 'input') {
    return {
      nextState: state,
      isCorrect: false,
      isRoundComplete: false,
      isGameOver: false,
    };
  }

  // Guard: tileId must be within valid tile bounds (0..8)
  if (tileId < 0 || tileId >= PATTERN_TILES.length) {
    return {
      nextState: state,
      isCorrect: false,
      isRoundComplete: false,
      isGameOver: false,
    };
  }

  const expectedTile = state.sequence[state.currentStep];
  const isCorrect = tileId === expectedTile;
  const nextTotalInputs = state.totalInputs + 1;

  if (isCorrect) {
    const nextCorrectInputs = state.correctInputs + 1;
    const stepPoints = calculateStepScore(state.round);
    const isRoundComplete = state.currentStep + 1 >= state.sequence.length;

    if (isRoundComplete) {
      const roundBonus = calculateRoundBonus(state.round);
      const newScore = state.score + stepPoints + roundBonus;
      const isVictory = state.round >= state.maxRound;

      const nextState: PatternRecallState = {
        ...state,
        score: newScore,
        highScore: Math.max(state.highScore, newScore),
        correctInputs: nextCorrectInputs,
        totalInputs: nextTotalInputs,
        currentStep: 0,
        activeTileId: null,
        errorTileId: null,
        phase: isVictory ? 'victory' : 'round_success',
      };

      return {
        nextState,
        isCorrect: true,
        isRoundComplete: true,
        isGameOver: isVictory,
      };
    } else {
      const newScore = state.score + stepPoints;
      const nextState: PatternRecallState = {
        ...state,
        score: newScore,
        highScore: Math.max(state.highScore, newScore),
        correctInputs: nextCorrectInputs,
        totalInputs: nextTotalInputs,
        currentStep: state.currentStep + 1,
        activeTileId: tileId,
        errorTileId: null,
      };

      return {
        nextState,
        isCorrect: true,
        isRoundComplete: false,
        isGameOver: false,
      };
    }
  } else {
    // Incorrect input: triggers game over
    const nextState: PatternRecallState = {
      ...state,
      totalInputs: nextTotalInputs,
      errorTileId: tileId,
      activeTileId: null,
      phase: 'game_over',
    };

    return {
      nextState,
      isCorrect: false,
      isRoundComplete: false,
      isGameOver: true,
    };
  }
}
