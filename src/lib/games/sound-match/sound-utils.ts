// src/lib/games/sound-match/sound-utils.ts
import type { PitchScoreResult, SoundMatchRoundResult } from './types';

export const MIN_FREQUENCY = 150; // ~D3 (146.8 Hz)
export const MAX_FREQUENCY = 1000; // ~B5 (987.8 Hz)
export const TOTAL_ROUNDS = 5;
export const MAX_REPLAYS = 3;
export const DEFAULT_GUESS_FREQUENCY = 440; // Standard A4

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Maps a normalized slider value [0, 1] to a frequency in Hz using a logarithmic scale.
 * Logarithmic mapping ensures equal octave and semitone spacing across the slider.
 */
export function sliderToFrequency(
  sliderVal: number,
  minFreq: number = MIN_FREQUENCY,
  maxFreq: number = MAX_FREQUENCY
): number {
  const clamped = Math.max(0, Math.min(1, sliderVal));
  const freq = minFreq * Math.pow(maxFreq / minFreq, clamped);
  return Math.round(freq * 10) / 10;
}

/**
 * Inverts frequency to normalized slider value [0, 1].
 */
export function frequencyToSlider(
  frequency: number,
  minFreq: number = MIN_FREQUENCY,
  maxFreq: number = MAX_FREQUENCY
): number {
  const clampedFreq = Math.max(minFreq, Math.min(maxFreq, frequency));
  const val = Math.log(clampedFreq / minFreq) / Math.log(maxFreq / minFreq);
  return Math.max(0, Math.min(1, Math.round(val * 10000) / 10000));
}

/**
 * Calculates cents difference between guess and target frequency:
 * cents = 1200 * log2(guess / target)
 * Positive = sharp (guess is higher), Negative = flat (guess is lower).
 */
export function calculateCentsDifference(targetFreq: number, guessFreq: number): number {
  if (targetFreq <= 0 || guessFreq <= 0) return 0;
  const cents = 1200 * Math.log2(guessFreq / targetFreq);
  return Math.round(cents * 10) / 10;
}

/**
 * Returns nearest scientific pitch notation note name for a given frequency.
 * Example: 440 -> "A4", 261.63 -> "C4", 523.25 -> "C5".
 */
export function frequencyToNoteName(frequency: number): string {
  if (frequency <= 0) return 'N/A';
  // MIDI note 69 is A4 (440 Hz)
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const roundedMidi = Math.round(midi);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Formats a frequency with its nearest note and optional detune cents:
 * Example: 440 -> "440 Hz (A4)"
 * Example: 432 -> "432 Hz (A4 -32¢)"
 */
export function formatFrequencyWithNote(frequency: number): string {
  if (frequency <= 0) return '0 Hz';
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const roundedMidi = Math.round(midi);
  const detuneCents = Math.round((midi - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteName = `${NOTE_NAMES[noteIndex]}${octave}`;

  if (Math.abs(detuneCents) < 2) {
    return `${Math.round(frequency)} Hz (${noteName})`;
  }
  const sign = detuneCents > 0 ? '+' : '';
  return `${Math.round(frequency)} Hz (${noteName} ${sign}${detuneCents}¢)`;
}

/**
 * Generates a random target frequency uniformly distributed across musical pitch space (logarithmic).
 */
export function generateRandomTargetFrequency(
  minFreq: number = MIN_FREQUENCY,
  maxFreq: number = MAX_FREQUENCY,
  rng: () => number = Math.random
): number {
  const logMin = Math.log(minFreq);
  const logMax = Math.log(maxFreq);
  const freq = Math.exp(logMin + rng() * (logMax - logMin));
  return Math.round(freq);
}

/**
 * Calculates score, accuracy, cents error, and rating label.
 * Scoring curve: score = 1000 * exp(-|cents| / 120)
 * Accuracy curve: accuracy = 100 * exp(-|cents| / 150)
 */
export function calculatePitchScore(targetFreq: number, guessFreq: number): PitchScoreResult {
  const centsDiff = calculateCentsDifference(targetFreq, guessFreq);
  const absCentsDiff = Math.abs(centsDiff);

  const rawScore = Math.round(1000 * Math.exp(-absCentsDiff / 120));
  const score = Math.max(0, Math.min(1000, rawScore));

  const rawAccuracy = Math.round(100 * Math.exp(-absCentsDiff / 150));
  const accuracy = Math.max(0, Math.min(100, rawAccuracy));

  let ratingLabel: string;
  let ratingEmoji: string;
  let feedback: string;

  if (absCentsDiff <= 10) {
    ratingLabel = 'Perfect Pitch';
    ratingEmoji = '🎯';
    feedback = 'Bullseye! Within 10 cents — virtually indistinguishable pitch error.';
  } else if (absCentsDiff <= 35) {
    ratingLabel = 'Golden Ear';
    ratingEmoji = '⚡';
    feedback = 'Exceptional ear! Microtonal accuracy within a third of a semitone.';
  } else if (absCentsDiff <= 75) {
    ratingLabel = 'In Tune';
    ratingEmoji = '🎵';
    feedback = 'Well within half a semitone — solid musical pitch recognition.';
  } else if (absCentsDiff <= 150) {
    ratingLabel = 'Close Match';
    ratingEmoji = '🎸';
    feedback = 'Close! Within roughly one semitone of the target pitch.';
  } else if (absCentsDiff <= 300) {
    ratingLabel = 'Rough Estimate';
    ratingEmoji = '📻';
    feedback = 'Within a minor third, but audibly off-pitch.';
  } else {
    ratingLabel = 'Out of Tune';
    ratingEmoji = '🔇';
    feedback = 'Several semitones off. Take your time and use preview tones next round!';
  }

  return {
    centsDiff,
    absCentsDiff,
    score,
    accuracy,
    ratingLabel,
    ratingEmoji,
    feedback,
  };
}

/**
 * Evaluates round results.
 */
export function evaluateSoundMatchRound(
  roundNumber: number,
  targetFreq: number,
  guessFreq: number,
  replaysUsed: number
): SoundMatchRoundResult {
  const evalResult = calculatePitchScore(targetFreq, guessFreq);
  return {
    roundNumber,
    targetFrequency: targetFreq,
    guessFrequency: guessFreq,
    centsDiff: evalResult.centsDiff,
    absCentsDiff: evalResult.absCentsDiff,
    score: evalResult.score,
    accuracy: evalResult.accuracy,
    ratingLabel: evalResult.ratingLabel,
    ratingEmoji: evalResult.ratingEmoji,
    replaysUsed,
    targetNote: frequencyToNoteName(targetFreq),
    guessNote: frequencyToNoteName(guessFreq),
  };
}
