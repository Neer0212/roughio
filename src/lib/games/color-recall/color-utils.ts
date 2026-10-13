// src/lib/games/color-recall/color-utils.ts
import type { HSLColor, RGBColor, LabColor, ColorAccuracyResult } from './types';

/**
 * Converts HSL to RGB [0-255].
 */
export function hslToRgb(hsl: HSLColor): RGBColor {
  const h = ((hsl.h % 360) + 360) % 360 / 360;
  const s = Math.max(0, Math.min(100, hsl.s)) / 100;
  const l = Math.max(0, Math.min(100, hsl.l)) / 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let corrected = t;
    if (corrected < 0) corrected += 1;
    if (corrected > 1) corrected -= 1;
    if (corrected < 1 / 6) return p + (q - p) * 6 * corrected;
    if (corrected < 1 / 2) return q;
    if (corrected < 2 / 3) return p + (q - p) * (2 / 3 - corrected) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return { r, g, b };
}

/**
 * Converts RGB [0-255] to Hex string (#RRGGBB).
 */
export function rgbToHex(rgb: RGBColor): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/**
 * Converts HSL to Hex string (#RRGGBB).
 */
export function hslToHex(hsl: HSLColor): string {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Converts sRGB [0-255] to CIE-L*a*b* using standard D65 illuminant.
 */
export function rgbToLab(rgb: RGBColor): LabColor {
  // 1. Normalize and linearize sRGB
  const linearize = (val: number) => {
    const v = val / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };

  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);

  // 2. Convert Linear RGB to CIE XYZ (D65)
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  // 3. Convert XYZ to Lab
  const f = (t: number) => {
    return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  };

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  const l = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return { l, a, b: bVal };
}

/**
 * Calculates CIE76 Delta-E (Euclidean perceptual distance).
 */
export function calculateDeltaE(lab1: LabColor, lab2: LabColor): number {
  const dL = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Computes shortest angular distance on a 360° circle.
 */
export function circularHueDistance(h1: number, h2: number): number {
  const diff = Math.abs((h1 % 360) - (h2 % 360));
  return Math.min(diff, 360 - diff);
}

/**
 * Calculates accuracy, score, and breakdown between target and guess HSL colors.
 */
export function calculateColorAccuracy(target: HSLColor, guess: HSLColor): ColorAccuracyResult {
  const targetRgb = hslToRgb(target);
  const guessRgb = hslToRgb(guess);

  const targetLab = rgbToLab(targetRgb);
  const guessLab = rgbToLab(guessRgb);

  const deltaE = calculateDeltaE(targetLab, guessLab);

  // Perceptual Accuracy curve:
  // DeltaE <= 2 is nearly indistinguishable (~98-100%)
  // DeltaE <= 5 is an exceptional guess (~92-97%)
  // DeltaE <= 15 is very strong (~75-90%)
  // DeltaE <= 35 is in the ballpark (~45-70%)
  // DeltaE >= 65 drops to 0%
  const normalizedDistance = Math.min(1, deltaE / 65);
  const accuracyRaw = 100 * Math.max(0, 1 - Math.pow(normalizedDistance, 0.9));
  const accuracy = Math.round(accuracyRaw);

  const score = Math.round(accuracy * 10); // 0 to 1,000 points per round

  const hueDiff = circularHueDistance(target.h, guess.h);
  const satDiff = Math.abs(target.s - guess.s);
  const lightDiff = Math.abs(target.l - guess.l);

  let ratingLabel = 'Off Spectrum';
  let ratingEmoji = '💥';

  if (accuracy >= 96) {
    ratingLabel = 'Chameleon Vision';
    ratingEmoji = '🦎';
  } else if (accuracy >= 88) {
    ratingLabel = 'Sharp Match';
    ratingEmoji = '✨';
  } else if (accuracy >= 76) {
    ratingLabel = 'Great Memory';
    ratingEmoji = '🎯';
  } else if (accuracy >= 62) {
    ratingLabel = 'Close Shade';
    ratingEmoji = '👍';
  } else if (accuracy >= 45) {
    ratingLabel = 'In the Ballpark';
    ratingEmoji = '🤔';
  }

  return {
    deltaE: Math.round(deltaE * 10) / 10,
    accuracy,
    score,
    ratingLabel,
    ratingEmoji,
    hueDiff: Math.round(hueDiff),
    satDiff: Math.round(satDiff),
    lightDiff: Math.round(lightDiff),
  };
}

/**
 * Generates an engaging, distinguishable target color.
 * Keeps saturation and lightness within a human-friendly range to avoid muddy greys or pure black/white.
 */
export function generateRandomTargetColor(): HSLColor {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(45 + Math.random() * 50); // 45% - 95%
  const l = Math.floor(35 + Math.random() * 40); // 35% - 75%
  return { h, s, l };
}

/**
 * Returns a CSS HSL string.
 */
export function toHslString(hsl: HSLColor): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}
