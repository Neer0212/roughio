// src/lib/games/registry.ts
import type { GameDefinition, GameId } from './types';

export const ARCADE_GAMES: GameDefinition[] = [
  {
    id: 'fermi',
    name: 'Fermi Estimate',
    tagline: 'Order-of-magnitude intuition on anything in the universe',
    description:
      'Estimate answers to unsearchable questions. From total iPhones sold to the weight of clouds, get within orders of magnitude to climb the ladder.',
    category: 'Estimation',
    route: '/game/play',
    status: 'playable',
    badge: 'Playable',
    accentColor: '#FF5A43',
    themeClass: 'from-[#FF5A43] to-[#E04D39]',
    metrics: {
      duration: '1–2 min / round',
      skills: ['Fermi Estimation', 'Napkin Math', 'Scale'],
      difficulty: 'Adaptive',
    },
    features: [
      'Infinite question pool across 15 categories',
      'Logarithmic scoring & order-of-magnitude tolerances',
      'Daily Ranked Elo ladder & real-time multiplayer Battles',
    ],
  },
  {
    id: 'color-recall',
    name: 'Color Recall',
    tagline: 'Memorize a target shade and recreate it from pure memory',
    description:
      'A test of visual memory and perception. Study a target color for 3 seconds, then dial in the exact Hue, Saturation, and Lightness from memory.',
    category: 'Perception & Memory',
    route: '/games/color-recall',
    status: 'playable',
    badge: 'New Mode',
    accentColor: '#35D07F',
    themeClass: 'from-[#35D07F] to-[#209F5E]',
    metrics: {
      duration: '2 min (5 rounds)',
      skills: ['Visual Memory', 'Color Theory', 'HSL Intuition'],
      difficulty: 'Casual',
    },
    features: [
      '5-round memory test with timed memorization',
      'Full HSL precision controls with live gradient tracks',
      'Perceptual Delta-E accuracy calculation and session recap',
    ],
  },
  {
    id: 'sound-match',
    name: 'Sound Match',
    tagline: 'Reproduce remembered audio pitches and micro-intervals',
    description:
      'Train your ear. Hear a brief musical frequency or synthesizer tone, then sweep an oscillator slider to match the exact pitch from memory.',
    category: 'Audio & Pitch',
    route: '/games/sound-match',
    status: 'playable',
    badge: 'New Mode',
    accentColor: '#4A65FF',
    themeClass: 'from-[#4A65FF] to-[#3548CC]',
    metrics: {
      duration: '2–3 min',
      skills: ['Relative Pitch', 'Acoustic Memory', 'Frequency Tuning'],
      difficulty: 'Adaptive',
    },
    features: [
      'Synthesized Web Audio tones with variable timbre',
      'Cent-level frequency precision matching',
      'Difficulty tiers from basic notes to microtonal intervals',
    ],
  },
  {
    id: 'pattern-recall',
    name: 'Pattern Recall',
    tagline: 'Memorize and reproduce spatial matrix sequences',
    description:
      'Flash memory under pressure. Watch an animated matrix of geometric tiles ignite in sequence, then reconstruct the exact pattern without missing a beat.',
    category: 'Working Memory',
    route: '/games/pattern-recall',
    status: 'playable',
    badge: 'New Mode',
    accentColor: '#FFDE00',
    themeClass: 'from-[#FFDE00] to-[#E0BE00]',
    metrics: {
      duration: '2–3 min',
      skills: ['Spatial Memory', 'Working Memory Span', 'Pattern Recognition'],
      difficulty: 'Challenging',
    },
    features: [
      'Responsive 3x3 interactive matrix with synthesized tones',
      'Adaptive pacing with sequence lengths up to 15 rounds',
      'Keyboard support (1–9) and local high score tracking',
    ],
  },
  {
    id: 'rare-answer',
    name: 'Rare Answer',
    tagline: 'Open-ended trivia where less obvious valid answers score higher',
    description:
      'Inspired by Pointless and Krillion. Given a broad prompt (e.g., "Countries starting with M"), enter valid answers that few other players would remember.',
    category: 'Trivia & Language',
    route: '/games/rare-answer',
    status: 'playable',
    badge: 'New Mode',
    accentColor: '#B9A0FF',
    themeClass: 'from-[#B9A0FF] to-[#8C6CEE]',
    metrics: {
      duration: '3 min',
      skills: ['Recall Depth', 'Vocabulary', 'Lateral Thinking'],
      difficulty: 'Adaptive',
    },
    features: [
      'Verified semantic dictionary with frequency weighting',
      'Obscurity multipliers for esoteric correct answers',
      'Direct head-to-head friend challenges',
    ],
  },
  {
    id: 'order-of-magnitude',
    name: 'Order of Magnitude',
    tagline: 'Rapid comparison of numbers across cosmic and atomic scales',
    description:
      'Fast-paced binary and sorting duels. Is the number of stars in the Milky Way greater than the number of seconds since the Pyramids were built?',
    category: 'Scale & Numbers',
    route: '/games/order-of-magnitude',
    status: 'playable',
    badge: 'New Mode',
    accentColor: '#FF8585',
    themeClass: 'from-[#FF8585] to-[#E05B5B]',
    metrics: {
      duration: '1–2 min',
      skills: ['Number Sense', 'Scientific Notation', 'Speed Comparison'],
      difficulty: 'Casual',
    },
    features: [
      'High-speed swipe/arrow decision mechanics',
      'Mind-bending real-world scale benchmarks',
      'Streak multipliers with sudden-death rounds',
    ],
  },
];

export function getGameById(id: GameId | string): GameDefinition | undefined {
  return ARCADE_GAMES.find((game) => game.id === id);
}

export function getPlayableGames(): GameDefinition[] {
  return ARCADE_GAMES.filter((game) => game.status === 'playable');
}

export function getComingSoonGames(): GameDefinition[] {
  return ARCADE_GAMES.filter((game) => game.status === 'coming-soon');
}
