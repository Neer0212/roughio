// tests/sound-match.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MIN_FREQUENCY,
  MAX_FREQUENCY,
  TOTAL_ROUNDS,
  MAX_REPLAYS,
  DEFAULT_GUESS_FREQUENCY,
  sliderToFrequency,
  frequencyToSlider,
  calculateCentsDifference,
  frequencyToNoteName,
  formatFrequencyWithNote,
  generateRandomTargetFrequency,
  calculatePitchScore,
  evaluateSoundMatchRound,
} from '../src/lib/games/sound-match/sound-utils.ts';

describe('Sound Match - Constants & Configuration', () => {
  it('defines valid frequency boundaries and round parameters', () => {
    assert.equal(MIN_FREQUENCY, 150);
    assert.equal(MAX_FREQUENCY, 1000);
    assert.equal(TOTAL_ROUNDS, 5);
    assert.equal(MAX_REPLAYS, 3);
    assert.equal(DEFAULT_GUESS_FREQUENCY, 440);
    assert.ok(MIN_FREQUENCY < MAX_FREQUENCY);
  });
});

describe('Sound Match - Logarithmic Frequency & Slider Mapping', () => {
  it('maps slider boundaries 0 and 1 to min and max frequency', () => {
    assert.equal(sliderToFrequency(0), 150);
    assert.equal(sliderToFrequency(1), 1000);
  });

  it('clamps out-of-range slider values to frequency boundaries', () => {
    assert.equal(sliderToFrequency(-0.5), 150);
    assert.equal(sliderToFrequency(1.5), 1000);
  });

  it('maps midpoint slider value to geometric mean', () => {
    const midFreq = sliderToFrequency(0.5);
    const expected = Math.round(Math.sqrt(150 * 1000) * 10) / 10; // ~387.3
    assert.equal(midFreq, expected);
  });

  it('inverts min and max frequency to slider values 0 and 1', () => {
    assert.equal(frequencyToSlider(150), 0);
    assert.equal(frequencyToSlider(1000), 1);
  });

  it('clamps out-of-range frequencies when computing slider position', () => {
    assert.equal(frequencyToSlider(50), 0);
    assert.equal(frequencyToSlider(2000), 1);
  });

  it('performs consistent roundtrip conversion across various test frequencies', () => {
    const testFrequencies = [150, 220, 330, 440, 587.3, 750, 880, 1000];
    for (const freq of testFrequencies) {
      const slider = frequencyToSlider(freq);
      const reconstructed = sliderToFrequency(slider);
      assert.ok(
        Math.abs(reconstructed - freq) <= 0.5,
        `Expected ${reconstructed} to be within 0.5 Hz of ${freq}`
      );
    }
  });
});

describe('Sound Match - Cents Difference Calculation', () => {
  it('calculates 0 cents for identical frequencies', () => {
    assert.equal(calculateCentsDifference(440, 440), 0);
    assert.equal(calculateCentsDifference(261.63, 261.63), 0);
  });

  it('calculates +1200 cents for one octave higher', () => {
    const cents = calculateCentsDifference(440, 880);
    assert.equal(cents, 1200);
  });

  it('calculates -1200 cents for one octave lower', () => {
    const cents = calculateCentsDifference(880, 440);
    assert.equal(cents, -1200);
  });

  it('calculates ~+100 cents for a half-step (semitone) up', () => {
    // 440 * 2^(1/12) ≈ 466.16376
    const semitoneUp = 440 * Math.pow(2, 1 / 12);
    const cents = calculateCentsDifference(440, semitoneUp);
    assert.ok(Math.abs(cents - 100) <= 0.2);
  });

  it('returns 0 for invalid or non-positive frequencies safely', () => {
    assert.equal(calculateCentsDifference(0, 440), 0);
    assert.equal(calculateCentsDifference(440, -100), 0);
  });
});

describe('Sound Match - Scientific Note Name Mapping', () => {
  it('correctly identifies standard musical pitches', () => {
    assert.equal(frequencyToNoteName(440), 'A4');
    assert.equal(frequencyToNoteName(261.63), 'C4');
    assert.equal(frequencyToNoteName(523.25), 'C5');
    assert.equal(frequencyToNoteName(329.63), 'E4');
    assert.equal(frequencyToNoteName(146.83), 'D3');
  });

  it('handles invalid or non-positive frequency gracefully', () => {
    assert.equal(frequencyToNoteName(0), 'N/A');
    assert.equal(frequencyToNoteName(-50), 'N/A');
  });

  it('formats frequency with note name and detune cents', () => {
    const exact = formatFrequencyWithNote(440);
    assert.equal(exact, '440 Hz (A4)');

    const detuned = formatFrequencyWithNote(432);
    assert.ok(detuned.includes('A4'));
    assert.ok(detuned.includes('-32¢') || detuned.includes('-31¢'));
  });
});

describe('Sound Match - Random Frequency Generator', () => {
  it('generates target frequencies bounded within min and max', () => {
    for (let i = 0; i < 20; i++) {
      const freq = generateRandomTargetFrequency();
      assert.ok(freq >= MIN_FREQUENCY && freq <= MAX_FREQUENCY);
    }
  });

  it('uses custom rng deterministically', () => {
    const minSample = generateRandomTargetFrequency(150, 1000, () => 0);
    assert.equal(minSample, 150);

    const maxSample = generateRandomTargetFrequency(150, 1000, () => 1);
    assert.equal(maxSample, 1000);
  });
});

describe('Sound Match - Pitch Scoring & Evaluation', () => {
  it('awards full 1000 points and 100% accuracy on exact pitch match', () => {
    const result = calculatePitchScore(440, 440);
    assert.equal(result.score, 1000);
    assert.equal(result.accuracy, 100);
    assert.equal(result.centsDiff, 0);
    assert.equal(result.ratingLabel, 'Perfect Pitch');
    assert.equal(result.ratingEmoji, '🎯');
  });

  it('awards high score (>= 900) for microtonal accuracy within 10 cents', () => {
    // 440 to 442 Hz is ~7.8 cents
    const result = calculatePitchScore(440, 442);
    assert.ok(result.absCentsDiff < 10);
    assert.ok(result.score >= 900);
    assert.equal(result.ratingLabel, 'Perfect Pitch');
  });

  it('classifies 10 to 35 cents error as Golden Ear', () => {
    // 440 to 446 Hz is ~23.4 cents
    const result = calculatePitchScore(440, 446);
    assert.ok(result.absCentsDiff > 10 && result.absCentsDiff <= 35);
    assert.equal(result.ratingLabel, 'Golden Ear');
    assert.equal(result.ratingEmoji, '⚡');
  });

  it('classifies 35 to 75 cents error as In Tune', () => {
    // 440 to 455 Hz is ~58 cents
    const result = calculatePitchScore(440, 455);
    assert.ok(result.absCentsDiff > 35 && result.absCentsDiff <= 75);
    assert.equal(result.ratingLabel, 'In Tune');
    assert.equal(result.ratingEmoji, '🎵');
  });

  it('classifies ~1 semitone error (75 to 150 cents) as Close Match', () => {
    // 440 to 466.16 Hz is ~100 cents
    const result = calculatePitchScore(440, 466.16);
    assert.ok(result.absCentsDiff >= 90 && result.absCentsDiff <= 110);
    assert.equal(result.ratingLabel, 'Close Match');
    assert.ok(result.score >= 400 && result.score <= 500);
  });

  it('diminishes score towards 0 for large errors (octave off)', () => {
    const result = calculatePitchScore(440, 880);
    assert.equal(result.absCentsDiff, 1200);
    assert.equal(result.score, 0);
    assert.equal(result.accuracy, 0);
    assert.equal(result.ratingLabel, 'Out of Tune');
  });

  it('evaluates complete round structure properly', () => {
    const roundResult = evaluateSoundMatchRound(2, 440, 442, 1);
    assert.equal(roundResult.roundNumber, 2);
    assert.equal(roundResult.targetFrequency, 440);
    assert.equal(roundResult.guessFrequency, 442);
    assert.equal(roundResult.replaysUsed, 1);
    assert.equal(roundResult.targetNote, 'A4');
    assert.equal(roundResult.guessNote, 'A4');
    assert.ok(roundResult.score > 0);
  });
});
