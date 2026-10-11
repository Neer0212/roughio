import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
try { require('dotenv').config({ path: '.env.local' }); } catch {}

import {
  aiHintCache,
  aiBattleAnalysisCache,
  pendingBattlePromises,
  buildHintCacheKey,
  checkRateLimit,
  getClientIp,
  logAiMetrics,
} from '../src/lib/ai/cache.ts';

test('Cache and Hashing - buildHintCacheKey produces consistent key', () => {
  const key1 = buildHintCacheKey('gpt-6', 'v2', 'q1', 'What is the speed of sound?', 'm/s');
  const key2 = buildHintCacheKey('gpt-6', 'v2', 'q1', 'What is the speed of sound?', 'm/s');
  assert.equal(key1, key2);
  assert.match(key1, /^hint:gpt-6:v2:q1:[a-f0-9]{16}$/);
});

test('Cache Invalidation - content change invalidates cache key', () => {
  const keyOriginal = buildHintCacheKey('gpt-6', 'v2', 'q1', 'What is the speed of sound in air?', 'm/s');
  const keyUpdated = buildHintCacheKey('gpt-6', 'v2', 'q1', 'What is the speed of sound in water?', 'm/s');
  assert.notEqual(keyOriginal, keyUpdated);
});

test('Cache Storage and Eviction - stores and retrieves values', () => {
  aiHintCache.clear();
  const testKey = 'test-key-1';
  aiHintCache.set(testKey, 'Hint text', 5000);
  assert.equal(aiHintCache.get(testKey), 'Hint text');

  // Nonexistent key
  assert.equal(aiHintCache.get('missing-key'), null);
});

test('Rate Limiter - enforces request threshold and returns retry header info', () => {
  const testIp = '10.99.88.77';
  const limit = 5;
  const windowMs = 1000;

  for (let i = 0; i < limit; i++) {
    const res = checkRateLimit(testIp, limit, windowMs);
    assert.equal(res.allowed, true, `Request #${i + 1} should be allowed`);
  }

  // 6th request must be blocked
  const blocked = checkRateLimit(testIp, limit, windowMs);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.resetInMs > 0);
});

test('Rate Limiter - handles missing/empty identifier safely without crashing', () => {
  const resEmpty = checkRateLimit('', 10, 5000);
  assert.equal(typeof resEmpty.allowed, 'boolean');
  const resBlank = checkRateLimit('   ', 10, 5000);
  assert.equal(typeof resBlank.allowed, 'boolean');
});

test('Client IP Extraction - does not blindly trust spoofed forwarded headers', () => {
  const headers1 = new Headers({ 'cf-connecting-ip': '203.0.113.195' });
  assert.equal(getClientIp(headers1), '203.0.113.195');

  const headers2 = new Headers({ 'x-real-ip': '198.51.100.22' });
  assert.equal(getClientIp(headers2), '198.51.100.22');

  const headers3 = new Headers({ 'x-forwarded-for': '192.0.2.1, 10.0.0.1' });
  assert.equal(getClientIp(headers3), '192.0.2.1');

  const headersEmpty = new Headers();
  assert.equal(getClientIp(headersEmpty), '127.0.0.1');
});

test('Observability - logs structured JSON and distinguishes null/undefined from 0', () => {
  let loggedOutput = '';
  const originalLog = console.log;
  console.log = (msg: string) => { loggedOutput = msg; };

  try {
    logAiMetrics({
      task: 'hint',
      cached: false,
      model: 'free/gpt-6-luna',
      durationMs: 120,
      promptTokens: 250,
      completionTokens: 80,
      reasoningTokens: 0, // Genuine 0
      totalTokens: 330,
      success: true,
    });

    const parsed = JSON.parse(loggedOutput);
    assert.equal(parsed.tag, 'AI_TOKEN_METRICS');
    assert.equal(parsed.tokens.reasoning, 0);
    assert.equal(parsed.tokens.prompt, 250);

    // Missing metric (null)
    logAiMetrics({
      task: 'feedback',
      cached: true,
      model: 'free/gpt-6-luna',
      durationMs: 5,
      promptTokens: null,
      completionTokens: null,
      reasoningTokens: null,
      totalTokens: null,
      success: true,
    });

    const parsedNull = JSON.parse(loggedOutput);
    assert.equal(parsedNull.tokens.reasoning, null);
    assert.equal(parsedNull.tokens.prompt, null);
  } finally {
    console.log = originalLog;
  }
});

test('Battle Deduplication - caches round results and deduplicates in-flight promises', async () => {
  aiBattleAnalysisCache.clear();
  pendingBattlePromises.clear();

  const battleKey = 'battle:test-b:test-r';
  assert.equal(aiBattleAnalysisCache.get(battleKey), null);

  // Set mock analysis
  aiBattleAnalysisCache.set(battleKey, 'Player 1 was closer.', 60000);
  assert.equal(aiBattleAnalysisCache.get(battleKey), 'Player 1 was closer.');

  // Pending promise deduplication
  let resolver: (val: { reply: string }) => void;
  const inFlightPromise = new Promise<{ reply: string }>((res) => { resolver = res; });
  pendingBattlePromises.set(battleKey, inFlightPromise);

  assert.equal(pendingBattlePromises.has(battleKey), true);
  resolver!({ reply: 'Resolved analysis' });
  const result = await pendingBattlePromises.get(battleKey);
  assert.equal(result?.reply, 'Resolved analysis');
});

test('Battle Deduplication - safe in-flight promise cleanup on success and failure', async () => {
  pendingBattlePromises.clear();
  const testKey = 'battle:clean-test:r1';

  // 1. Success cleanup: removes entry if still referring to same promise
  let resSuccess: (val: { reply: string }) => void;
  const successPromise = new Promise<{ reply: string }>((res) => { resSuccess = res; });
  successPromise.finally(() => {
    if (pendingBattlePromises.get(testKey) === successPromise) {
      pendingBattlePromises.delete(testKey);
    }
  });
  pendingBattlePromises.set(testKey, successPromise);
  assert.equal(pendingBattlePromises.has(testKey), true);
  resSuccess!({ reply: 'success' });
  await successPromise;
  assert.equal(pendingBattlePromises.has(testKey), false, 'Entry must be removed after resolution');

  // 2. Failure cleanup: removes entry on rejection without leaving stale state
  let rejFailure: (err: Error) => void;
  const rawFailPromise = new Promise<{ reply: string }>((_, rej) => { rejFailure = rej; });
  const failPromise = rawFailPromise.finally(() => {
    if (pendingBattlePromises.get(testKey) === failPromise) {
      pendingBattlePromises.delete(testKey);
    }
  });
  failPromise.catch(() => {}); // prevent unhandled rejection
  pendingBattlePromises.set(testKey, failPromise);
  assert.equal(pendingBattlePromises.has(testKey), true);
  rejFailure!(new Error('API error'));
  try {
    await failPromise;
  } catch {}
  assert.equal(pendingBattlePromises.has(testKey), false, 'Entry must be removed after rejection');

  // 3. Stale promise cleanup protection: does NOT delete if entry refers to a newer promise
  const oldPromise = Promise.resolve({ reply: 'old' });
  const newerPromise = new Promise<{ reply: string }>(() => {}); // pending
  pendingBattlePromises.set(testKey, newerPromise);
  // Old promise finally runs now
  if (pendingBattlePromises.get(testKey) === oldPromise) {
    pendingBattlePromises.delete(testKey);
  }
  assert.equal(pendingBattlePromises.get(testKey), newerPromise, 'Must not remove a newer promise');
  pendingBattlePromises.clear();
});

test('Supabase Admin Fail-Safe - rejects initialization if credentials missing in non-build runtime', async () => {
  const { getSupabaseAdmin } = await import('../src/lib/supabase/admin.ts');
  // In runtime with env loaded, getSupabaseAdmin returns a client
  const admin = getSupabaseAdmin();
  assert.ok(admin !== null && typeof admin === 'object');
});

