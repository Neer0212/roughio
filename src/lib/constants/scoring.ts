import type { ScoreClassification, ScoreResult, Attempt, UserStats } from "@/types/game";

// ============================================================
// SCORE THRESHOLDS
// ============================================================

export const SCORE_THRESHOLDS: Array<{
  maxFactor: number;
  classification: ScoreClassification;
  label: string;
  description: string;
  emoji: string;
  color: string;
  bgColor: string;
  baseXP: number;
}> = [
  {
    maxFactor: 1.0,
    classification: "perfect",
    label: "Perfect",
    description: "Exact match. Are you even human?",
    emoji: "🎯",
    color: "#B9A0FF",
    bgColor: "rgba(185, 160, 255, 0.15)",
    baseXP: 100,
  },
  {
    maxFactor: 1.25,
    classification: "bullseye",
    label: "Bullseye",
    description: "Incredibly close. Within 25%.",
    emoji: "✨",
    color: "#8CE6B0",
    bgColor: "rgba(140, 230, 176, 0.15)",
    baseXP: 80,
  },
  {
    maxFactor: 2.0,
    classification: "excellent",
    label: "Excellent",
    description: "Within a factor of 2. Strong estimate.",
    emoji: "🔥",
    color: "#82C8FF",
    bgColor: "rgba(130, 200, 255, 0.15)",
    baseXP: 60,
  },
  {
    maxFactor: 5.0,
    classification: "close",
    label: "Close",
    description: "Within a factor of 5. Getting there.",
    emoji: "👍",
    color: "#FFD166",
    bgColor: "rgba(255, 209, 102, 0.15)",
    baseXP: 40,
  },
  {
    maxFactor: 10.0,
    classification: "not_bad",
    label: "Not Bad",
    description: "Within an order of magnitude.",
    emoji: "🤔",
    color: "#FFB347",
    bgColor: "rgba(255, 179, 71, 0.15)",
    baseXP: 20,
  },
  {
    maxFactor: 100.0,
    classification: "way_off",
    label: "Way Off",
    description: "Room for improvement.",
    emoji: "😬",
    color: "#FF8585",
    bgColor: "rgba(255, 133, 133, 0.15)",
    baseXP: 10,
  },
  {
    maxFactor: Infinity,
    classification: "chaos",
    label: "Absolute Chaos",
    description: "Spectacular. Chaotically wrong.",
    emoji: "💥",
    color: "#FF8585",
    bgColor: "rgba(255, 133, 133, 0.15)",
    baseXP: 5,
  },
];

export const SCORE_LABELS: Record<ScoreClassification, string> = SCORE_THRESHOLDS.reduce(
  (acc, t) => ({ ...acc, [t.classification]: t.label }),
  {} as Record<ScoreClassification, string>
);

export const SCORE_COLORS: Record<ScoreClassification, string> = SCORE_THRESHOLDS.reduce(
  (acc, t) => ({ ...acc, [t.classification]: t.color }),
  {} as Record<ScoreClassification, string>
);

// ============================================================
// SCORING FUNCTIONS
// ============================================================

/**
 * Calculate the factor score between a guess and the actual answer.
 * Score = max(guess/actual, actual/guess)
 * A score of 1× is exact. Lower is better.
 */
export function calculateFactor(guess: number, actual: number): number {
  if (actual === 0 || guess === 0) return Infinity;
  const ratio = guess / actual;
  return Math.max(ratio, 1 / ratio);
}

/**
 * Calculate logarithmic distance for aggregation purposes.
 * This prevents outliers from dominating statistics.
 */
export function calculateLogDistance(guess: number, actual: number): number {
  if (actual <= 0 || guess <= 0) return 10; // Capped penalty for invalid
  return Math.abs(Math.log10(guess / actual));
}

/**
 * Get the score classification and metadata for a given factor.
 */
export function classifyScore(factor: number): (typeof SCORE_THRESHOLDS)[0] {
  for (const threshold of SCORE_THRESHOLDS) {
    if (factor <= threshold.maxFactor) {
      return threshold;
    }
  }
  return SCORE_THRESHOLDS[SCORE_THRESHOLDS.length - 1];
}

/**
 * Calculate XP earned for a guess.
 */
export function calculateXP(
  factor: number,
  difficultyMultiplier: number,
  usedHint: boolean
): number {
  const classification = classifyScore(factor);
  const base = classification.baseXP;
  const hintPenalty = usedHint ? 0.75 : 1.0;
  return Math.round(base * difficultyMultiplier * hintPenalty);
}

/**
 * Build a complete ScoreResult from a guess and actual answer.
 */
export function buildScoreResult(
  guess: number,
  actual: number,
  difficultyMultiplier: number,
  usedHint: boolean
): ScoreResult {
  const factor = calculateFactor(guess, actual);
  const logDistance = calculateLogDistance(guess, actual);
  const classification = classifyScore(factor);
  const xpEarned = calculateXP(factor, difficultyMultiplier, usedHint);

  return {
    factor,
    classification: classification.classification,
    label: classification.label,
    description: classification.description,
    isOverEstimate: guess > actual,
    logDistance,
    xpEarned,
  };
}

/**
 * Format a factor score for display.
 * e.g. 1.39 → "1.39×"
 */
export function formatFactor(factor: number): string {
  if (factor === 1) return "1.00×";
  if (factor < 10) return `${factor.toFixed(2)}×`;
  if (factor < 100) return `${factor.toFixed(1)}×`;
  if (factor < 1000) return `${Math.round(factor)}×`;
  return `${(factor / 1000).toFixed(1)}k×`;
}

/**
 * Calculate aggregate log score from a list of attempts.
 * Uses geometric mean of factor scores.
 */
export function calculateAverageLogScore(attempts: Attempt[]): number {
  if (attempts.length === 0) return 0;
  const totalLog = attempts.reduce(
    (sum, a) => sum + a.scoreResult.logDistance,
    0
  );
  return totalLog / attempts.length;
}

/**
 * Get XP required for a given level.
 */
export function xpForLevel(level: number): number {
  // Exponential scaling: level 1 = 0, level 2 = 100, level 10 = ~2000
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.35, level - 2));
}

/**
 * Get cumulative XP required to reach a level.
 */
export function cumulativeXPForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/**
 * Get level from total XP.
 */
export function levelFromXP(totalXP: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
} {
  let level = 1;
  let cumulative = 0;

  while (true) {
    const nextLevelXP = xpForLevel(level + 1);
    if (cumulative + nextLevelXP > totalXP) {
      const currentLevelXP = totalXP - cumulative;
      return {
        level,
        currentLevelXP,
        nextLevelXP,
        progress: nextLevelXP > 0 ? currentLevelXP / nextLevelXP : 1,
      };
    }
    cumulative += nextLevelXP;
    level++;
    if (level > 100) break;
  }

  return { level: 100, currentLevelXP: 0, nextLevelXP: 0, progress: 1 };
}