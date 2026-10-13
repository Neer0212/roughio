import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(process.cwd() + '/test-helper.js');
try { require('dotenv').config({ path: '.env.local' }); } catch {}

process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'mock-service-role-key';

import {
  validateFermiQuestion,
  normalizeQuestionText,
  extractJsonArray,
  generateQuestionBatch,
  VALID_CATEGORIES,
  VALID_DIFFICULTIES,
} from '../src/lib/ai/question-generator.ts';

test('normalizeQuestionText - normalizes case, punctuation, and whitespace', () => {
  const t1 = normalizeQuestionText('How many pianos are in Chicago?');
  const t2 = normalizeQuestionText('  HOW   MANY PIANOS ARE IN CHICAGO??  ');
  assert.equal(t1, 'how many pianos are in chicago');
  assert.equal(t1, t2);
});

test('extractJsonArray - parses raw and markdown-wrapped JSON arrays', () => {
  // 1. Raw array
  const raw = '[{"text": "How many stars?", "referenceAnswer": 1000}]';
  const parsedRaw = extractJsonArray(raw);
  assert.equal(parsedRaw.length, 1);
  assert.equal(parsedRaw[0].text, 'How many stars?');

  // 2. Markdown fence with ```json
  const markdown = 'Here are your questions:\n```json\n[{"text": "How many trees in the world?", "referenceAnswer": 3000000000000}]\n```\nHope you like them!';
  const parsedMarkdown = extractJsonArray(markdown);
  assert.equal(parsedMarkdown.length, 1);
  assert.equal(parsedMarkdown[0].referenceAnswer, 3000000000000);

  // 3. Invalid non-array throws
  assert.throws(() => extractJsonArray('{"not": "an array"}'), /JSON array/i);
  assert.throws(() => extractJsonArray('not json at all'), /SyntaxError|JSON/i);
});

test('validateFermiQuestion - Valid question candidate passes validation', () => {
  const candidate = {
    text: 'How many commercial flights take off globally each day?',
    referenceAnswer: 100000,
    unit: 'flights',
    category: 'technology',
    difficulty: 'medium',
    explanation: 'There are roughly 100,000 scheduled commercial flights worldwide on an average day.',
    estimationApproach: 'Consider major global airports (around 1,000 active hubs) with an average of 100 departures daily.',
    hint: 'Think about the number of busy international airports and their daily flight schedules.',
  };

  const res = validateFermiQuestion(candidate);
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.question.text, candidate.text);
    assert.equal(res.question.referenceAnswer, 100000);
    assert.equal(res.question.category, 'technology');
    assert.equal(res.question.difficulty, 'medium');
  }
});

test('validateFermiQuestion - Rejects malformed or incomplete question text', () => {
  // Too short
  const resShort = validateFermiQuestion({
    text: 'How many?',
    referenceAnswer: 10,
    unit: 'items',
    explanation: 'A short explanation of some items.',
    estimationApproach: 'Approach with a baseline estimation.',
    hint: 'Consider the basic count.',
  });
  assert.equal(resShort.valid, false);
  assert.match(resShort.reason, /length/i);

  // Missing question mark
  const resNoQuestion = validateFermiQuestion({
    text: 'Estimate the number of bicycles sold annually in Europe',
    referenceAnswer: 20000000,
    unit: 'bicycles',
    explanation: 'Around 20 million bicycles are sold annually in Europe.',
    estimationApproach: 'Population of Europe times bike ownership rate.',
    hint: 'Think about bicycle adoption in European cities.',
  });
  assert.equal(resNoQuestion.valid, false);
  assert.match(resNoQuestion.reason, /question mark/i);

  // Meta-prompt leakage
  const resMeta = validateFermiQuestion({
    text: 'Sure, here is a question: How many trees are in Central Park?',
    referenceAnswer: 18000,
    unit: 'trees',
    explanation: 'Central Park has approximately 18,000 trees across its 843 acres.',
    estimationApproach: 'Acreage times trees per acre.',
    hint: 'Think about park acreage.',
  });
  assert.equal(resMeta.valid, false);
  assert.match(resMeta.reason, /meta-prompt/i);
});

test('validateFermiQuestion - Rejects invalid referenceAnswer numbers and bounds', () => {
  const base = {
    text: 'How many gallons of water are in an Olympic swimming pool?',
    unit: 'gallons',
    explanation: 'An Olympic swimming pool holds roughly 660,000 gallons.',
    estimationApproach: 'Dimensions 50m x 25m x 2m equals 2,500 cubic meters converted to gallons.',
    hint: 'Recall dimensions in meters and conversion from cubic meters to gallons.',
  };

  // Zero answer
  assert.equal(validateFermiQuestion({ ...base, referenceAnswer: 0 }).valid, false);

  // Negative answer
  assert.equal(validateFermiQuestion({ ...base, referenceAnswer: -500 }).valid, false);

  // NaN / Infinity
  assert.equal(validateFermiQuestion({ ...base, referenceAnswer: NaN }).valid, false);
  assert.equal(validateFermiQuestion({ ...base, referenceAnswer: Infinity }).valid, false);

  // Impossibly large (> 1e16)
  assert.equal(validateFermiQuestion({ ...base, referenceAnswer: 1e20 }).valid, false);
});

test('validateFermiQuestion - Eliminates false precision for large Fermi estimates', () => {
  const candidate = {
    text: 'How many bricks were used to build the Empire State Building?',
    referenceAnswer: 10000000.2892, // False precision decimals
    unit: 'bricks',
    category: 'infrastructure',
    difficulty: 'hard',
    explanation: 'The Empire State Building contains approximately 10 million bricks.',
    estimationApproach: 'Estimate facade surface area and brick size.',
    hint: 'Think about height, floor count, and building volume.',
  };

  const res = validateFermiQuestion(candidate);
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.question.referenceAnswer, 10000000, 'Large Fermi answers must be rounded without false precision');
  }
});

test('validateFermiQuestion - Duplicate detection', () => {
  const existingSet = new Set<string>([
    normalizeQuestionText('How many commercial airplanes are airborne worldwide?'),
  ]);

  const duplicateCandidate = {
    text: 'How many commercial airplanes are airborne worldwide?',
    referenceAnswer: 10000,
    unit: 'airplanes',
    explanation: 'Around 10,000 to 12,000 commercial planes are in the air at peak times.',
    estimationApproach: 'Multiply global fleet by utilization percentage.',
    hint: 'Think about global airline fleets.',
  };

  const res = validateFermiQuestion(duplicateCandidate, existingSet);
  assert.equal(res.valid, false);
  assert.match(res.reason, /duplicate/i);
});

test('validateFermiQuestion - Rejects hint that explicitly leaks the answer', () => {
  const candidate = {
    text: 'How many keys are on a standard grand piano?',
    referenceAnswer: 88,
    unit: 'keys',
    explanation: 'Standard acoustic pianos feature 88 keys (52 white and 36 black).',
    estimationApproach: 'Recall seven octaves plus a few extra keys.',
    hint: 'The answer is exactly 88 keys on the keyboard.', // Explicit answer leakage!
  };

  const res = validateFermiQuestion(candidate);
  assert.equal(res.valid, false);
  assert.match(res.reason, /reveals/i);
});

test('generateQuestionBatch - Deduplicates concurrent batch requests (single in-flight promise)', async () => {
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes('/rest/v1/questions')) {
      // Mock DB recent questions check or insert
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        return new Response(JSON.stringify(body.map((b: any, i: number) => ({ id: `gen-${i}`, ...b }))), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.includes('api.apinex.bond')) {
      providerCalls++;
      // Simulate network latency so concurrent calls race together
      await new Promise((r) => setTimeout(r, 60));
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                text: 'How many passenger train cars operate in Tokyo daily?',
                referenceAnswer: 15000,
                unit: 'cars',
                category: 'infrastructure',
                difficulty: 'hard',
                explanation: 'Tokyo rail network operates thousands of train sets across JR and private lines.',
                estimationApproach: 'Estimate train lines times trains per line times 10 cars per train.',
                hint: 'Think about the massive scale of Tokyo transit network lines.',
              },
            ]),
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  }) as typeof fetch;

  try {
    const [p1, p2] = await Promise.all([
      generateQuestionBatch({ count: 1, apiKey: 'test-key' }),
      generateQuestionBatch({ count: 1, apiKey: 'test-key' }),
    ]);

    assert.equal(providerCalls, 1, 'Concurrent generation requests must register and reuse exactly one in-flight promise');
    assert.equal(p1.savedCount, 1);
    assert.equal(p2.savedCount, 1);
    assert.equal(p1.questions[0].text, p2.questions[0].text);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
