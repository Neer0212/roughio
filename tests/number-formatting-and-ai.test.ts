import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatIndianNumber,
  formatWithCommas,
  formatLarge,
  parseNumber,
} from '../src/lib/utils/number-parser.ts';

test('Indian Digit Grouping - formatIndianNumber', () => {
  assert.equal(formatIndianNumber(0), '0');
  assert.equal(formatIndianNumber(5), '5');
  assert.equal(formatIndianNumber(999), '999');
  assert.equal(formatIndianNumber(1000), '1,000');
  assert.equal(formatIndianNumber(27600), '27,600');
  assert.equal(formatIndianNumber(100000), '1,00,000', '1 lakh should group as 1,00,000');
  assert.equal(formatIndianNumber(4000000), '40,00,000', '40 lakhs should group as 40,00,000');
  assert.equal(formatIndianNumber(10000000), '1,00,00,000', '1 crore should group as 1,00,00,000');
  assert.equal(formatIndianNumber(333000000000), '3,33,00,00,00,000', '333 billion formatted with Indian grouping');
});

test('Indian Digit Grouping - Decimal preservation', () => {
  assert.equal(formatIndianNumber(27600.5), '27,600.5');
  assert.equal(formatIndianNumber(1234567.89), '12,34,567.89');
  assert.equal(formatIndianNumber(0.05), '0.05');
});

test('Number Formatting - No compact abbreviations (k, M, B)', () => {
  // formatLarge and formatWithCommas must return full numbers with Indian grouping, not compact abbreviations
  const formatted = formatLarge(4000000);
  assert.equal(formatted, '40,00,000');
  assert.ok(!formatted.includes('k') && !formatted.includes('M') && !formatted.includes('B'), 'Must not abbreviate with k, M, or B');

  const formatted27k = formatLarge(27600);
  assert.equal(formatted27k, '27,600');
  assert.ok(!formatted27k.includes('k'), '27,600 must not be displayed as 27.6k');
});

test('parseNumber - Normalizes outputs with Indian digit grouping', () => {
  const result1 = parseNumber('27600');
  assert.equal(result1.value, 27600);
  assert.equal(result1.normalized, '27,600');

  const result2 = parseNumber('40 lakhs');
  assert.equal(result2.value, 4000000);
  assert.equal(result2.normalized, '40,00,000');

  const result3 = parseNumber('2.5e6');
  assert.equal(result3.value, 2500000);
  assert.equal(result3.normalized, '25,00,000');
});
