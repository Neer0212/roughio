import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(process.cwd() + '/test-helper.js');
try { require('dotenv').config({ path: '.env.local' }); } catch {}
const mod = require('./.next/server/app/api/ai/route.js');
const POST = mod.routeModule.userland.POST;

import {
  aiBattleAnalysisCache,
  pendingBattlePromises,
} from '../src/lib/ai/cache.ts';

test('AI Route Hardening - Validation Rules', async () => {
  // 1. Oversized body (> 10 KB)
  const hugeBody = JSON.stringify({ task: 'hint', questionId: 'q'.repeat(15000) });
  const reqOversized = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'content-length': String(Buffer.byteLength(hugeBody)) },
    body: hugeBody,
  });
  const resOversized = await POST(reqOversized);
  assert.equal(resOversized.status, 413, 'Oversized body must return 413');

  // 2. Malformed JSON
  const reqMalformed = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ bad json',
  });
  const resMalformed = await POST(reqMalformed);
  assert.equal(resMalformed.status, 400, 'Malformed JSON must return 400');

  // 3. Missing/Invalid Task
  const reqInvalidTask = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'unknown_task' }),
  });
  const resInvalidTask = await POST(reqInvalidTask);
  assert.equal(resInvalidTask.status, 400, 'Unknown task must return 400');

  // 4. Feedback with NaN / Infinity / Negative guess
  const reqNaN = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'feedback', questionId: 'test-q', guess: 'not-a-number' }),
  });
  const resNaN = await POST(reqNaN);
  assert.equal(resNaN.status, 400, 'Non-number guess must return 400');

  const reqInfinity = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'feedback', questionId: 'test-q', guess: 1e30 }),
  });
  const resInfinity = await POST(reqInfinity);
  assert.equal(resInfinity.status, 400, 'Out-of-bounds guess must return 400');

  // 5. Missing questionId in hint
  const reqNoQ = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'hint' }),
  });
  const resNoQ = await POST(reqNoQ);
  assert.equal(resNoQ.status, 400, 'Missing questionId in hint must return 400');

  // 6. Nonexistent question ID in feedback (must 404, never fallback to client answer)
  const reqNonexistentQ = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'feedback',
      questionId: '00000000-0000-0000-0000-000000000000',
      guess: 100,
      referenceAnswer: 50, // Client tries to spoof reference answer
    }),
  });
  const resNonexistentQ = await POST(reqNonexistentQ);
  assert.equal(resNonexistentQ.status, 404, 'Nonexistent question must return 404, not trust client referenceAnswer');

  // 7. Battle analysis with missing battleId/roundId
  const reqBadBattle = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'battle_analysis' }),
  });
  const resBadBattle = await POST(reqBadBattle);
  assert.equal(resBadBattle.status, 400, 'Missing battle identifiers must return 400');

  // 8. Battle analysis with nonexistent round
  const reqFakeRound = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'battle_analysis',
      battleId: '00000000-0000-0000-0000-000000000000',
      roundId: '00000000-0000-0000-0000-000000000000',
    }),
  });
  const resFakeRound = await POST(reqFakeRound);
  assert.equal(resFakeRound.status, 404, 'Nonexistent round must return 404');
});

test('Feedback Calculations - Rejects zero, negative, and non-finite reference answers', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/rest/v1/questions')) {
      if (url.includes('id=eq.q-zero')) {
        return new Response(JSON.stringify({ id: 'q-zero', text: 'Zero ref', unit: 'pts', reference_answer: 0 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('id=eq.q-negative')) {
        return new Response(JSON.stringify({ id: 'q-negative', text: 'Negative ref', unit: 'pts', reference_answer: -42 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('id=eq.q-null')) {
        return new Response(JSON.stringify({ id: 'q-null', text: 'Null ref', unit: 'pts', reference_answer: null }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  try {
    // 1. Zero reference answer -> 400
    const resZero = await POST(new Request('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'feedback', questionId: 'q-zero', guess: 50 }),
    }));
    assert.equal(resZero.status, 400);
    const dataZero = await resZero.json();
    assert.match(dataZero.error, /reference answer/i);

    // 2. Negative reference answer -> 400
    const resNeg = await POST(new Request('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'feedback', questionId: 'q-negative', guess: 50 }),
    }));
    assert.equal(resNeg.status, 400);

    // 3. Null / Non-finite reference answer -> 400
    const resNull = await POST(new Request('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'feedback', questionId: 'q-null', guess: 50 }),
    }));
    assert.equal(resNull.status, 400);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Battle Analysis Cache - Validates database and round status before serving cache', async () => {
  const originalFetch = globalThis.fetch;

  // Pre-populate cache with an unrevealed round's key to test cache bypass prevention
  const unrevealedKey = 'battle:b-test:r-unrevealed';
  aiBattleAnalysisCache.set(unrevealedKey, 'Premature cached analysis', 60000);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/rest/v1/battle_rounds')) {
      if (url.includes('id=eq.r-unrevealed')) {
        // Database reports round is still in 'guessing' phase
        return new Response(JSON.stringify({
          id: 'r-unrevealed',
          status: 'guessing',
          battle_id: 'b-test',
          question_id: 'q1',
          questions: { id: 'q1', text: 'Q?', unit: 'u', reference_answer: 100 },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  try {
    const resUnrevealed = await POST(new Request('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'battle_analysis', battleId: 'b-test', roundId: 'r-unrevealed' }),
    }));

    // Must NOT return cached analysis: must reject unrevealed round with 400
    assert.equal(resUnrevealed.status, 400, 'Unrevealed round must return 400 even if key is in cache');
    const data = await resUnrevealed.json();
    assert.equal(data.error, 'Round is not yet revealed');
  } finally {
    globalThis.fetch = originalFetch;
    aiBattleAnalysisCache.delete(unrevealedKey);
  }
});

test('Battle Analysis Deduplication - Exactly one APInex provider call for concurrent requests', async () => {
  const originalFetch = globalThis.fetch;
  let providerCallCount = 0;

  aiBattleAnalysisCache.clear();
  pendingBattlePromises.clear();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes('/rest/v1/battle_rounds')) {
      return new Response(JSON.stringify({
        id: 'r-dedup',
        status: 'revealed',
        battle_id: 'b-dedup',
        question_id: 'q-dedup',
        questions: { id: 'q-dedup', text: 'How many stars?', unit: 'stars', reference_answer: 1000 },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.includes('/rest/v1/battle_guesses')) {
      return new Response(JSON.stringify([
        { user_id: 'p1', guess: 800, factor: 1.25, points_awarded: 100 },
        { user_id: 'p2', guess: 1500, factor: 1.5, points_awarded: 75 },
      ]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.includes('api.apinex.bond')) {
      providerCallCount++;
      // Simulate network delay to ensure both requests race together
      await new Promise((r) => setTimeout(r, 60));
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Player 1 was closer to the star count.' } }],
        usage: { prompt_tokens: 45, completion_tokens: 15, total_tokens: 60 },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  }) as typeof fetch;

  try {
    const req1 = new Request('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'battle_analysis', battleId: 'b-dedup', roundId: 'r-dedup' }),
    });

    const req2 = new Request('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'battle_analysis', battleId: 'b-dedup', roundId: 'r-dedup' }),
    });

    const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    const body1 = await res1.json();
    const body2 = await res2.json();

    assert.equal(body1.reply, 'Player 1 was closer to the star count.');
    assert.equal(body2.reply, 'Player 1 was closer to the star count.');

    // Assert that provider was called EXACTLY ONCE for both simultaneous requests
    assert.equal(providerCallCount, 1, 'Provider must be called exactly once across concurrent requests');

    // In-flight map must be cleaned up
    assert.equal(pendingBattlePromises.has('battle:b-dedup:r-dedup'), false, 'In-flight promise map must be cleaned up in finally');

    // Subsequent call should hit cache without calling provider
    const req3 = new Request('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'battle_analysis', battleId: 'b-dedup', roundId: 'r-dedup' }),
    });
    const res3 = await POST(req3);
    assert.equal(res3.status, 200);
    const body3 = await res3.json();
    assert.equal(body3.cached, true);
    assert.equal(providerCallCount, 1, 'Subsequent request must be served from cache without invoking provider');
  } finally {
    globalThis.fetch = originalFetch;
    aiBattleAnalysisCache.clear();
    pendingBattlePromises.clear();
  }
});

test('Provider Error Handling - Returns sanitized errors without leaking upstream diagnostics', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes('/rest/v1/battle_rounds')) {
      return new Response(JSON.stringify({
        id: 'r-err',
        status: 'revealed',
        battle_id: 'b-err',
        question_id: 'q-err',
        questions: { id: 'q-err', text: 'Q?', unit: 'u', reference_answer: 50 },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.includes('/rest/v1/battle_guesses')) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.includes('api.apinex.bond')) {
      // Simulate upstream 500 error leaking sensitive internal diagnostic
      return new Response(JSON.stringify({
        error: { message: 'Internal DB crash: postgres://admin:secretPass@internal.db:5432/core' },
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  }) as typeof fetch;

  try {
    const res = await POST(new Request('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'battle_analysis', battleId: 'b-err', roundId: 'r-err' }),
    }));

    // Must return 502 with safe generic message
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error, 'AI service temporarily unavailable');
    // Must NOT leak upstream credentials or stack
    assert.ok(!JSON.stringify(body).includes('secretPass'), 'Upstream credentials must never be leaked to client');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
