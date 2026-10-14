// src/lib/games/rare-answer/validator.ts
import type {
  RareAnswerPrompt,
  ValidationResult,
  RarityTier,
} from './types';

export const UNLISTED_RARE_POINTS = 850;

/**
 * Normalizes user answers and reference aliases:
 * - Trims and lowercases
 * - Strips accents and diacritics
 * - Normalizes hyphens to spaces
 * - Strips non-alphanumeric punctuation
 * - Removes leading articles ("the", "a", "an")
 * - Collapses consecutive whitespace
 */
export function normalizeAnswer(raw: string): string {
  if (!raw) return '';
  let str = raw
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Strip diacritics (e.g. Côte -> Cote)

  // Replace hyphens with spaces (e.g. duck-billed -> duck billed)
  str = str.replace(/-/g, ' ');

  // Strip punctuation except spaces and letters/digits
  str = str.replace(/[^\w\s]/g, '');

  // Strip leading articles
  str = str.replace(/^(the|a|an)\s+/, '');

  // Collapse multiple spaces
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

/**
 * Checks an answer synchronously against the prompt's curated dictionary.
 * Returns ValidationResult if matched (valid or known invalid), or null if unlisted.
 */
export function checkLocalAnswer(
  prompt: RareAnswerPrompt,
  rawInput: string
): ValidationResult | null {
  const normalized = normalizeAnswer(rawInput);
  if (!normalized) {
    return {
      valid: false,
      status: 'verified_invalid',
      score: 0,
      reason: 'Please enter a valid answer.',
      promptId: prompt.id,
      userGuess: rawInput,
    };
  }

  // 1. Check verified valid reference answers
  for (const ref of prompt.referenceAnswers) {
    const canonicalNorm = normalizeAnswer(ref.canonical);
    if (normalized === canonicalNorm) {
      return {
        valid: true,
        status: 'verified_valid',
        canonicalAnswer: ref.canonical,
        tier: ref.tier,
        score: ref.points,
        reason: `Matched verified answer: ${ref.canonical}`,
        promptId: prompt.id,
        userGuess: rawInput,
        funFact: ref.funFact,
      };
    }

    for (const alias of ref.aliases) {
      if (normalized === normalizeAnswer(alias)) {
        return {
          valid: true,
          status: 'verified_valid',
          canonicalAnswer: ref.canonical,
          tier: ref.tier,
          score: ref.points,
          reason: `Matched alias for ${ref.canonical}`,
          promptId: prompt.id,
          userGuess: rawInput,
          funFact: ref.funFact,
        };
      }
    }
  }

  // 2. Check known invalid answers
  if (prompt.knownInvalid) {
    for (const inv of prompt.knownInvalid) {
      const canonicalNorm = normalizeAnswer(inv.canonical);
      if (normalized === canonicalNorm) {
        return {
          valid: false,
          status: 'verified_invalid',
          canonicalAnswer: inv.canonical,
          score: 0,
          reason: inv.reason,
          promptId: prompt.id,
          userGuess: rawInput,
        };
      }

      for (const alias of inv.aliases) {
        if (normalized === normalizeAnswer(alias)) {
          return {
            valid: false,
            status: 'verified_invalid',
            canonicalAnswer: inv.canonical,
            score: 0,
            reason: inv.reason,
            promptId: prompt.id,
            userGuess: rawInput,
          };
        }
      }
    }
  }

  // Not in local dictionary
  return null;
}

/**
 * Creates result for an unlisted answer verified by AI.
 */
export function createUnlistedValidResult(
  promptId: string,
  userGuess: string,
  reason?: string
): ValidationResult {
  return {
    valid: true,
    status: 'ai_valid',
    canonicalAnswer: userGuess.trim(),
    tier: 'unlisted-rare',
    score: UNLISTED_RARE_POINTS,
    reason:
      reason ||
      'Creative or obscure answer verified outside our standard list! Scored as an Unlisted Rare Gem.',
    promptId,
    userGuess,
  };
}

/**
 * Creates result for an unlisted answer rejected by AI.
 */
export function createUnlistedInvalidResult(
  promptId: string,
  userGuess: string,
  reason?: string
): ValidationResult {
  return {
    valid: false,
    status: 'ai_invalid',
    score: 0,
    reason: reason || 'Not a valid answer for this prompt.',
    promptId,
    userGuess,
  };
}

/**
 * Graceful fallback when an answer is not in the dictionary and offline/AI cannot verify.
 */
export function createUnrecognizedResult(
  promptId: string,
  userGuess: string,
  reason?: string
): ValidationResult {
  return {
    valid: false,
    status: 'unrecognized',
    score: 0,
    reason:
      reason ||
      'Answer not found in our verified dictionary. No score awarded.',
    promptId,
    userGuess,
  };
}

/**
 * Helper to get human-readable tier label and badge.
 */
export function getTierInfo(tier?: RarityTier): { label: string; badge: string; color: string } {
  switch (tier) {
    case 'rare':
      return { label: 'Ultra Rare', badge: '💎', color: 'text-purple-400' };
    case 'unlisted-rare':
      return { label: 'Rare Gem', badge: '🌟', color: 'text-fuchsia-400' };
    case 'uncommon':
      return { label: 'Uncommon', badge: '⚡', color: 'text-amber-400' };
    case 'common':
      return { label: 'Common', badge: '⚪', color: 'text-blue-400' };
    default:
      return { label: 'Invalid', badge: '❌', color: 'text-rose-400' };
  }
}
