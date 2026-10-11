import test from 'node:test';
import assert from 'node:assert/strict';

import { createRequire } from 'node:module';

const require = createRequire(process.cwd() + '/test-helper.js');
try { require('dotenv').config({ path: '.env.local' }); } catch {}
const mod = require('./.next/server/app/api/ai/route.js');
const POST = mod.routeModule.userland.POST;

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
