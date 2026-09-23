import type { ParseResult } from "@/types/game";

// ============================================================
// NUMBER PARSING
// Handles: 250000000, 250 million, 250M, 2.5e8, 1.2 billion,
//          750k, 750K, 1.5B, 3.2 trillion, etc.
// ============================================================

const WORD_MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  thousands: 1_000,
  m: 1_000_000,
  million: 1_000_000,
  millions: 1_000_000,
  b: 1_000_000_000,
  billion: 1_000_000_000,
  billions: 1_000_000_000,
  t: 1_000_000_000_000,
  trillion: 1_000_000_000_000,
  trillions: 1_000_000_000_000,
};

/**
 * Parse a human-friendly number string into a numeric value.
 *
 * Examples:
 *   "250 million" → 250_000_000
 *   "1.2B"        → 1_200_000_000
 *   "750k"        → 750_000
 *   "2.5e8"       → 250_000_000
 *   "1,000,000"   → 1_000_000
 *   "-5"          → error (negative not allowed)
 *   "0"           → error (zero not allowed)
 *   "abc"         → error
 */
export function parseNumber(input: string): ParseResult {
  if (!input || typeof input !== "string") {
    return { value: null, error: "Please enter a number.", normalized: null };
  }

  const trimmed = input.trim();

  if (trimmed === "") {
    return { value: null, error: "Please enter a number.", normalized: null };
  }

  // Remove commas used as thousands separators
  const withoutCommas = trimmed.replace(/,/g, "");

  // Check for negative
  if (withoutCommas.startsWith("-")) {
    return {
      value: null,
      error: "Please enter a positive number.",
      normalized: null,
    };
  }

  let processed = withoutCommas.toLowerCase();

  // Replace word multipliers with math equivalents
  processed = processed.replace(/\b(k|thousand|thousands)\b/g, '*1000');
  processed = processed.replace(/\b(m|million|millions)\b/g, '*1000000');
  processed = processed.replace(/\b(b|billion|billions)\b/g, '*1000000000');
  processed = processed.replace(/\b(t|trillion|trillions)\b/g, '*1000000000000');

  // Support exponentiation using ^
  processed = processed.replace(/\^/g, '**');

  // Strip anything that is not a digit, operator, dot, e/E, parenthesis, or space
  // This makes `new Function` relatively safe from arbitrary code execution
  const sanitized = processed.replace(/[^0-9+\-*/().*eE\s]/g, '');

  if (sanitized.trim() === '') {
    return { value: null, error: "Please enter a valid number or calculation.", normalized: null };
  }

  try {
    // Evaluate the mathematical expression
    const value = new Function(`return (${sanitized})`)();
    
    if (typeof value === 'number' && !isNaN(value)) {
      return validateAndNormalize(value, trimmed);
    }
  } catch (e) {
    // Fall through to error
  }

  return {
    value: null,
    error:
      "Couldn't parse that. Try: 300 * 365, 1.5B, 750k, or a plain number.",
    normalized: null,
  };
}

function validateAndNormalize(value: number, original: string): ParseResult {
  if (isNaN(value)) {
    return { value: null, error: "Invalid number.", normalized: null };
  }

  if (!isFinite(value)) {
    return { value: null, error: "Number is too large.", normalized: null };
  }

  if (value === 0) {
    return {
      value: null,
      error: "Your estimate must be greater than zero.",
      normalized: null,
    };
  }

  if (value < 0) {
    return {
      value: null,
      error: "Please enter a positive number.",
      normalized: null,
    };
  }

  // Sanity check: prevent absurdly large numbers (> 1 quadrillion × 1000)
  if (value > 1e18) {
    return {
      value: null,
      error: "That number is impossibly large. Try something smaller.",
      normalized: null,
    };
  }

  return {
    value,
    error: null,
    normalized: formatLarge(value),
  };
}

/**
 * Format a large number into a human-readable string.
 * e.g. 250_000_000 → "250 million"
 */
export function formatLarge(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1e12) {
    const t = value / 1e12;
    return `${trimTrailingZeros(t.toFixed(3))} trillion`;
  }
  if (abs >= 1e9) {
    const b = value / 1e9;
    return `${trimTrailingZeros(b.toFixed(3))} billion`;
  }
  if (abs >= 1e6) {
    const m = value / 1e6;
    return `${trimTrailingZeros(m.toFixed(3))} million`;
  }
  if (abs >= 1e3) {
    const k = value / 1e3;
    return `${trimTrailingZeros(k.toFixed(3))}k`;
  }

  return value % 1 === 0
    ? value.toLocaleString("en-US")
    : value.toFixed(2);
}

/**
 * Format a number for display with commas.
 * e.g. 250000000 → "250,000,000"
 */
export function formatWithCommas(value: number): string {
  if (value >= 1e15) return value.toExponential(2);
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function trimTrailingZeros(str: string): string {
  if (!str.includes(".")) return str;
  return str.replace(/\.?0+$/, "");
}