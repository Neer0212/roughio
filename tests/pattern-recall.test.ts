import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PATTERN_TILES,
  DEFAULT_MAX_ROUNDS,
  generatePatternSequence,
  getSequenceLengthForRound,
  calculateStepScore,
  calculateRoundBonus,
  calculateAccuracy,
  getTimingForRound,
  createInitialState,
  processTileInput,
} from '../src/lib/games/pattern-recall/pattern-utils.ts';
import type { PatternRecallState } from '../src/lib/games/pattern-recall/types.ts';

describe('Pattern Recall - Sequence Generation & Bounds', () => {
  it('generates sequences with correct length and valid tile bounds [0..8]', () => {
    const seq5 = generatePatternSequence(5);
    assert.equal(seq5.length, 5);
    seq5.forEach((tileId) => {
      assert.ok(Number.isInteger(tileId));
      assert.ok(tileId >= 0 && tileId < 9);
    });

    const seq15 = generatePatternSequence(15);
    assert.equal(seq15.length, 15);
  });

  it('generates predictable sequences with custom PRNG and handles variety', () => {
    // PRNG producing 0, 0, 0, 0 to test 3-in-a-row variety guard
    let call = 0;
    const mockRng = () => 0; // always picks 0
    const seq = generatePatternSequence(4, 9, mockRng);
    // Index 0: 0, Index 1: 0, Index 2: 1 (guard triggered), Index 3: 0
    assert.equal(seq[0], 0);
    assert.equal(seq[1], 0);
    assert.equal(seq[2], 1, 'Third identical tile should be bumped to avoid triple duplicate');
  });

  it('calculates sequence length scaling across rounds', () => {
    assert.equal(getSequenceLengthForRound(1), 3);
    assert.equal(getSequenceLengthForRound(2), 4);
    assert.equal(getSequenceLengthForRound(5), 7);
    assert.equal(getSequenceLengthForRound(10), 12);
  });

  it('provides 9 distinct tiles with valid musical note frequencies', () => {
    assert.equal(PATTERN_TILES.length, 9);
    const frequencies = PATTERN_TILES.map((t) => t.noteFrequency);
    // All frequencies must be positive numbers and strictly increasing (ascending scale)
    for (let i = 0; i < frequencies.length - 1; i++) {
      assert.ok(frequencies[i] > 200);
      assert.ok(frequencies[i] < frequencies[i + 1], 'Tiles should form an ascending musical scale');
    }
  });
});

describe('Pattern Recall - Scoring & Accuracy Formulas', () => {
  it('calculates step scores and round bonuses accurately', () => {
    // Round 1
    assert.equal(calculateStepScore(1), 15);
    assert.equal(calculateRoundBonus(1), 100);

    // Round 3
    assert.equal(calculateStepScore(3), 45);
    assert.equal(calculateRoundBonus(3), 300);
  });

  it('calculates accuracy percentage accurately and handles edge cases', () => {
    assert.equal(calculateAccuracy(0, 0), 100, '0 inputs should default to 100%');
    assert.equal(calculateAccuracy(10, 10), 100);
    assert.equal(calculateAccuracy(8, 10), 80);
    assert.equal(calculateAccuracy(19, 20), 95);
    assert.equal(calculateAccuracy(0, 5), 0);
  });

  it('adapts display timings progressively as rounds advance', () => {
    const r1 = getTimingForRound(1);
    const r5 = getTimingForRound(5);
    const r10 = getTimingForRound(10);
    const r15 = getTimingForRound(15);

    assert.ok(r1.onDurationMs > r5.onDurationMs);
    assert.ok(r5.onDurationMs > r10.onDurationMs);
    assert.ok(r10.onDurationMs >= r15.onDurationMs);
  });
});

describe('Pattern Recall - State Reducer & Gameplay Flow', () => {
  it('processes correct step inputs and advances step index', () => {
    const state: PatternRecallState = {
      ...createInitialState(),
      phase: 'input',
      round: 1,
      sequence: [2, 5, 8],
      currentStep: 0,
      score: 0,
    };

    const res1 = processTileInput(state, 2);
    assert.equal(res1.isCorrect, true);
    assert.equal(res1.isRoundComplete, false);
    assert.equal(res1.isGameOver, false);
    assert.equal(res1.nextState.currentStep, 1);
    assert.equal(res1.nextState.score, 15); // 15 pts for step 1
    assert.equal(res1.nextState.correctInputs, 1);
    assert.equal(res1.nextState.totalInputs, 1);
  });

  it('completes the round on the final step and awards round bonus', () => {
    const state: PatternRecallState = {
      ...createInitialState(),
      phase: 'input',
      round: 1,
      sequence: [2, 5, 8],
      currentStep: 2,
      score: 30, // 2 steps completed previously
      correctInputs: 2,
      totalInputs: 2,
    };

    const res = processTileInput(state, 8);
    assert.equal(res.isCorrect, true);
    assert.equal(res.isRoundComplete, true);
    assert.equal(res.isGameOver, false);
    assert.equal(res.nextState.phase, 'round_success');
    // Score = 30 + 15 (step) + 100 (bonus) = 145
    assert.equal(res.nextState.score, 145);
    assert.equal(res.nextState.correctInputs, 3);
    assert.equal(res.nextState.totalInputs, 3);
  });

  it('triggers victory when completing the maximum configured round', () => {
    const state: PatternRecallState = {
      ...createInitialState(0, 15),
      phase: 'input',
      round: 15,
      sequence: [0],
      currentStep: 0,
      score: 5000,
    };

    const res = processTileInput(state, 0);
    assert.equal(res.isCorrect, true);
    assert.equal(res.isRoundComplete, true);
    assert.equal(res.isGameOver, true);
    assert.equal(res.nextState.phase, 'victory');
  });

  it('handles incorrect input by ending the game and recording error tile', () => {
    const state: PatternRecallState = {
      ...createInitialState(),
      phase: 'input',
      round: 2,
      sequence: [4, 7, 1, 3],
      currentStep: 1,
      score: 30,
      correctInputs: 4,
      totalInputs: 4,
    };

    // Expected tile is 7, player enters wrong tile 0
    const res = processTileInput(state, 0);
    assert.equal(res.isCorrect, false);
    assert.equal(res.isRoundComplete, false);
    assert.equal(res.isGameOver, true);
    assert.equal(res.nextState.phase, 'game_over');
    assert.equal(res.nextState.errorTileId, 0);
    assert.equal(res.nextState.correctInputs, 4, 'Correct inputs should not increase on error');
    assert.equal(res.nextState.totalInputs, 5, 'Total inputs should record the attempt');
    assert.equal(res.nextState.score, 30, 'Score should not change on incorrect input');
  });
});

describe('Pattern Recall - Concurrency & Duplicate Protection', () => {
  it('protects against input while computer is demonstrating sequence', () => {
    const state: PatternRecallState = {
      ...createInitialState(),
      phase: 'demonstrating',
      round: 1,
      sequence: [1, 2, 3],
      currentStep: 0,
    };

    const res = processTileInput(state, 1);
    assert.equal(res.isCorrect, false);
    assert.equal(res.nextState, state, 'State must not mutate if input occurs during demonstration');
    assert.equal(res.nextState.score, 0);
    assert.equal(res.nextState.totalInputs, 0);
  });

  it('protects against input during game_over and round_success phases', () => {
    const gameOverState: PatternRecallState = {
      ...createInitialState(),
      phase: 'game_over',
      score: 100,
    };
    const res1 = processTileInput(gameOverState, 2);
    assert.equal(res1.nextState, gameOverState);

    const successState: PatternRecallState = {
      ...createInitialState(),
      phase: 'round_success',
      score: 250,
    };
    const res2 = processTileInput(successState, 3);
    assert.equal(res2.nextState, successState);
  });

  it('rejects out-of-bounds tile IDs safely', () => {
    const state: PatternRecallState = {
      ...createInitialState(),
      phase: 'input',
      round: 1,
      sequence: [0, 1, 2],
      currentStep: 0,
    };

    assert.equal(processTileInput(state, -1).nextState, state);
    assert.equal(processTileInput(state, 9).nextState, state);
    assert.equal(processTileInput(state, 999).nextState, state);
  });

  it('preserves high score on restart while resetting current run', () => {
    const initial = createInitialState(1250);
    assert.equal(initial.highScore, 1250);
    assert.equal(initial.score, 0);
    assert.equal(initial.round, 1);
    assert.equal(initial.phase, 'ready');
    assert.equal(initial.correctInputs, 0);
    assert.equal(initial.totalInputs, 0);
  });
});
