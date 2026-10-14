// tests/order-of-magnitude.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  COMPARISON_PAIRS,
  getComparisonById,
  getRandomSessionPairs,
} from '../src/lib/games/order-of-magnitude/data.ts';
import {
  calculateMagnitudeDifference,
  formatScaleNumber,
  createActiveRound,
  evaluateOrderOfMagnitudeRound,
} from '../src/lib/games/order-of-magnitude/magnitude-utils.ts';
import type { RawComparisonPair } from '../src/lib/games/order-of-magnitude/types.ts';

describe('Order of Magnitude - Data Pool & Structure', () => {
  it('contains at least 30 diverse curated comparison pairs', () => {
    assert.ok(COMPARISON_PAIRS.length >= 30);
    const ids = new Set(COMPARISON_PAIRS.map((p) => p.id));
    assert.equal(ids.size, COMPARISON_PAIRS.length);
  });

  it('ensures each pair has valid items, positive values, units, and explanations', () => {
    for (const pair of COMPARISON_PAIRS) {
      assert.ok(pair.id.length > 0);
      assert.ok(pair.title.length > 0);
      assert.ok(pair.category.length > 0);
      assert.ok(pair.item1.label.length > 0);
      assert.ok(pair.item2.label.length > 0);
      assert.ok(pair.item1.value > 0);
      assert.ok(pair.item2.value > 0);
      assert.ok(pair.item1.unit.length > 0);
      assert.ok(pair.item2.unit.length > 0);
      assert.ok(pair.explanation.length > 0);
    }
  });

  it('looks up comparison pair by ID or returns undefined', () => {
    const pair = getComparisonById('stars-vs-trees');
    assert.ok(pair);
    assert.equal(pair.title, 'Milky Way Stars vs. Earth Trees');

    assert.equal(getComparisonById('non-existent-id'), undefined);
  });

  it('selects 10 unique pairs without duplicates for a session', () => {
    const sessionPairs = getRandomSessionPairs(10);
    assert.equal(sessionPairs.length, 10);
    const ids = new Set(sessionPairs.map((p) => p.id));
    assert.equal(ids.size, 10);
  });
});

describe('Order of Magnitude - Mathematics & Ratio Calculations', () => {
  it('calculates exact log10 difference and ratios', () => {
    // 100 vs 10,000 -> 2 orders of magnitude (100x)
    const diff = calculateMagnitudeDifference(100, 10000);
    assert.equal(diff.integerDiff, 2);
    assert.equal(diff.ratio, 100);
    assert.equal(diff.ratioDisplay, '~100x');
  });

  it('handles nearly equal quantities gracefully', () => {
    const diff = calculateMagnitudeDifference(100, 101);
    assert.equal(diff.integerDiff, 0);
    assert.ok(diff.ratioDisplay.includes('Nearly Equal'));
  });

  it('safely handles astronomical numbers without overflow', () => {
    // 8e67 vs 1.3e50 (17 orders of magnitude)
    const diff = calculateMagnitudeDifference(8e67, 1.3e50);
    assert.ok(diff.integerDiff >= 17 && diff.integerDiff <= 18);
    assert.ok(diff.ratioDisplay.includes('10^'));
  });

  it('formats scale numbers properly across magnitude bands', () => {
    assert.equal(formatScaleNumber(1.5e12), '~1.5 Trillion');
    assert.equal(formatScaleNumber(8.2e9), '~8.2 Billion');
    assert.equal(formatScaleNumber(5e7), '~50 Million');
    assert.equal(formatScaleNumber(45000), '45,000');
    // Extreme scientific notation
    const exp = formatScaleNumber(1.3e50);
    assert.ok(exp.includes('10⁵⁰'));
  });
});

describe('Order of Magnitude - Active Round & A/B Position Randomization', () => {
  const samplePair: RawComparisonPair = {
    id: 'test-pair',
    title: 'Test Comparison',
    category: 'Space & Astronomy',
    item1: { label: 'Small Item', value: 10, unit: 'units', formattedValue: '10' },
    item2: { label: 'Large Item', value: 1000, unit: 'units', formattedValue: '1,000' },
    explanation: 'Test explanation',
  };

  it('assigns largerOption correctly based on item values', () => {
    // Test with rng = 0 (no swap: optionA = item1 [10], optionB = item2 [1000])
    const roundNoSwap = createActiveRound(samplePair, 1, () => 0);
    assert.equal(roundNoSwap.optionA.value, 10);
    assert.equal(roundNoSwap.optionB.value, 1000);
    assert.equal(roundNoSwap.largerOption, 'B');

    // Test with rng = 0.9 (swap: optionA = item2 [1000], optionB = item1 [10])
    const roundSwap = createActiveRound(samplePair, 1, () => 0.9);
    assert.equal(roundSwap.optionA.value, 1000);
    assert.equal(roundSwap.optionB.value, 10);
    assert.equal(roundSwap.largerOption, 'A');
  });

  it('ensures randomized positioning across multiple draws', () => {
    let largerIsA = 0;
    let largerIsB = 0;
    for (let i = 0; i < 50; i++) {
      const round = createActiveRound(samplePair, i + 1);
      if (round.largerOption === 'A') largerIsA++;
      else largerIsB++;
    }
    assert.ok(largerIsA > 5 && largerIsB > 5);
  });
});

describe('Order of Magnitude - Scoring Rules & Boundaries', () => {
  it('awards 100 base points for correct selection with no magnitude guess', () => {
    const evalRes = evaluateOrderOfMagnitudeRound('A', 'A', null, 2);
    assert.equal(evalRes.isCorrectSelection, true);
    assert.equal(evalRes.baseScore, 100);
    assert.equal(evalRes.magnitudeBonus, 0);
    assert.equal(evalRes.totalRoundScore, 100);
  });

  it('awards full 50 bonus points for exact magnitude prediction (150 pts total)', () => {
    const evalRes = evaluateOrderOfMagnitudeRound('A', 'A', 2, 2);
    assert.equal(evalRes.isCorrectSelection, true);
    assert.equal(evalRes.baseScore, 100);
    assert.equal(evalRes.magnitudeBonus, 50);
    assert.equal(evalRes.totalRoundScore, 150);
  });

  it('awards tiered magnitude bonuses when off by 1 or 2 orders', () => {
    // Off by 1: 30 bonus pts
    const offBy1 = evaluateOrderOfMagnitudeRound('B', 'B', 3, 2);
    assert.equal(offBy1.magnitudeBonus, 30);
    assert.equal(offBy1.totalRoundScore, 130);

    // Off by 2: 15 bonus pts
    const offBy2 = evaluateOrderOfMagnitudeRound('B', 'B', 4, 2);
    assert.equal(offBy2.magnitudeBonus, 15);
    assert.equal(offBy2.totalRoundScore, 115);

    // Off by 3+: 0 bonus pts
    const offBy3 = evaluateOrderOfMagnitudeRound('B', 'B', 5, 2);
    assert.equal(offBy3.magnitudeBonus, 0);
    assert.equal(offBy3.totalRoundScore, 100);
  });

  it('NEVER awards points or magnitude bonus when larger/smaller selection is incorrect', () => {
    // Player picked 'A' when 'B' was larger, even if their magnitude guess was exact!
    const wrongPick = evaluateOrderOfMagnitudeRound('A', 'B', 2, 2);
    assert.equal(wrongPick.isCorrectSelection, false);
    assert.equal(wrongPick.baseScore, 0);
    assert.equal(wrongPick.magnitudeBonus, 0);
    assert.equal(wrongPick.totalRoundScore, 0);
  });
});
