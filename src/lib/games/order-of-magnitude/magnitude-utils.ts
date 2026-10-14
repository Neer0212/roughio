import type {
  ComparisonItem,
  RawComparisonPair,
  ActiveRoundComparison,
  RoundEvaluation,
} from './types';

/**
 * Format a number using Indian digit grouping (en-IN).
 */
function formatIndianNumber(value: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return String(value ?? '');
  }
  const str = value.toString();
  const decimalPart = str.split('.')[1];
  const maxDecimals = decimalPart ? Math.min(decimalPart.length, 6) : 0;
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Calculates the exact order of magnitude difference between two positive numbers:
 * rawDiff = |log10(val1) - log10(val2)|
 * Safely computes in log space to prevent floating-point overflow for astronomical numbers.
 */
export function calculateMagnitudeDifference(
  val1: number,
  val2: number
): {
  rawDiff: number;
  integerDiff: number;
  ratio: number;
  ratioDisplay: string;
} {
  const safeVal1 = Math.max(1e-100, Math.abs(val1));
  const safeVal2 = Math.max(1e-100, Math.abs(val2));

  const log1 = Math.log10(safeVal1);
  const log2 = Math.log10(safeVal2);
  const rawDiff = Math.abs(log1 - log2);
  const integerDiff = Math.round(rawDiff);

  // Compute ratio safely
  let ratio = 1;
  let ratioDisplay = '1x';

  if (rawDiff <= 15) {
    const larger = Math.max(safeVal1, safeVal2);
    const smaller = Math.min(safeVal1, safeVal2);
    ratio = larger / smaller;

    if (rawDiff < 0.05) {
      ratioDisplay = `~${ratio.toFixed(2)}x (Nearly Equal)`;
    } else if (ratio < 10) {
      ratioDisplay = `~${ratio.toFixed(1)}x`;
    } else if (ratio < 10000) {
      ratioDisplay = `~${Math.round(ratio).toLocaleString('en-US')}x`;
    } else if (ratio < 1e9) {
      ratioDisplay = `~${formatIndianNumber(Math.round(ratio))}x`;
    } else {
      ratioDisplay = `~10^${integerDiff}x`;
    }
  } else {
    // For extreme cosmic numbers (> 10^15), avoid overflow
    ratio = Infinity;
    ratioDisplay = `~10^${integerDiff}x`;
  }

  return {
    rawDiff: Math.round(rawDiff * 100) / 100,
    integerDiff,
    ratio,
    ratioDisplay,
  };
}

/**
 * Formats large values into human-readable notation (e.g. word scale or superscript scientific notation).
 */
export function formatScaleNumber(val: number): string {
  if (val === 0) return '0';
  const abs = Math.abs(val);

  if (abs >= 1e16 || (abs < 0.0001 && abs > 0)) {
    const exponent = Math.floor(Math.log10(abs));
    const mantissa = abs / Math.pow(10, exponent);
    const formattedMantissa = Math.round(mantissa * 10) / 10;
    const expStr = toSuperscript(exponent);
    return `${formattedMantissa === 1 ? '' : `${formattedMantissa} × `}10${expStr}`;
  }

  if (abs >= 1e12) {
    const t = abs / 1e12;
    return `~${t >= 10 ? Math.round(t) : t.toFixed(1)} Trillion`;
  }
  if (abs >= 1e9) {
    const b = abs / 1e9;
    return `~${b >= 10 ? Math.round(b) : b.toFixed(1)} Billion`;
  }
  if (abs >= 1e6) {
    const m = abs / 1e6;
    return `~${m >= 10 ? Math.round(m) : m.toFixed(1)} Million`;
  }

  return formatIndianNumber(Math.round(val * 10) / 10);
}

function toSuperscript(num: number): string {
  const map: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '-': '⁻',
  };
  return num
    .toString()
    .split('')
    .map((c) => map[c] || c)
    .join('');
}

/**
 * Constructs an active round with randomized A/B positioning to ensure the larger
 * answer is not consistently on one side.
 */
export function createActiveRound(
  pair: RawComparisonPair,
  roundNumber: number,
  rng: () => number = Math.random
): ActiveRoundComparison {
  const isSwapped = rng() >= 0.5;
  const optionA: ComparisonItem = isSwapped ? pair.item2 : pair.item1;
  const optionB: ComparisonItem = isSwapped ? pair.item1 : pair.item2;

  const largerOption: 'A' | 'B' = optionA.value >= optionB.value ? 'A' : 'B';
  const { rawDiff, integerDiff, ratio, ratioDisplay } = calculateMagnitudeDifference(
    optionA.value,
    optionB.value
  );

  return {
    roundNumber,
    pairId: pair.id,
    title: pair.title,
    category: pair.category,
    optionA,
    optionB,
    largerOption,
    ratio,
    ratioDisplay,
    actualMagnitudeDiff: integerDiff,
    rawMagnitudeDiff: rawDiff,
    explanation: pair.explanation,
    funFact: pair.funFact,
  };
}

/**
 * Evaluates round score deterministically:
 * - 100 points for choosing the correct larger quantity.
 * - Up to 50 bonus points for predicting magnitude power difference (0: +50, 1: +30, 2: +15).
 * - CRITICAL: Magnitude bonus is ONLY awarded if the player chose the correct larger quantity.
 */
export function evaluateOrderOfMagnitudeRound(
  chosenOption: 'A' | 'B',
  largerOption: 'A' | 'B',
  chosenMagnitudeGuess: number | null,
  actualMagnitudeDiff: number
): RoundEvaluation {
  const isCorrectSelection = chosenOption === largerOption;

  if (!isCorrectSelection) {
    // If the selection is incorrect, no points or magnitude bonus are awarded
    return {
      chosenOption,
      isCorrectSelection: false,
      chosenMagnitudeGuess,
      actualMagnitudeDiff,
      magnitudeError:
        chosenMagnitudeGuess !== null
          ? Math.abs(chosenMagnitudeGuess - actualMagnitudeDiff)
          : null,
      baseScore: 0,
      magnitudeBonus: 0,
      totalRoundScore: 0,
    };
  }

  // Correct selection
  const baseScore = 100;
  let magnitudeBonus = 0;
  let magnitudeError: number | null = null;

  if (chosenMagnitudeGuess !== null) {
    magnitudeError = Math.abs(chosenMagnitudeGuess - actualMagnitudeDiff);
    if (magnitudeError === 0) {
      magnitudeBonus = 50;
    } else if (magnitudeError === 1) {
      magnitudeBonus = 30;
    } else if (magnitudeError === 2) {
      magnitudeBonus = 15;
    } else {
      magnitudeBonus = 0;
    }
  }

  return {
    chosenOption,
    isCorrectSelection: true,
    chosenMagnitudeGuess,
    actualMagnitudeDiff,
    magnitudeError,
    baseScore,
    magnitudeBonus,
    totalRoundScore: baseScore + magnitudeBonus,
  };
}
