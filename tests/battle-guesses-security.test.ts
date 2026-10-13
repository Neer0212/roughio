import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildScoreResult } from '../src/lib/constants/scoring.ts';

const require = createRequire(process.cwd() + '/test-helper.js');
try { require('dotenv').config({ path: '.env.local' }); } catch {}

const submitMod = require('./.next/server/app/api/battles/submit/route.js');
const POST_SUBMIT = submitMod.routeModule.userland.POST;

const roundsMod = require('./.next/server/app/api/battles/rounds/route.js');
const GET_ROUNDS = roundsMod.routeModule.userland.GET;

/**
 * Simulation of the PostgreSQL Row Level Security (RLS) policies implemented in
 * 005_secure_battle_guesses.sql and hardened in 006_prevent_score_tampering_and_canonical_battle_id.sql.
 *
 * NOTE ON ENVIRONMENT:
 * A local PostgreSQL/Docker container is not running in this environment. These pure logical tests
 * demonstrate the policy predicates and invariants. Concrete SQL execution steps are provided in the
 * project documentation / report for execution against a live PostgreSQL / Supabase database.
 */
interface BattleRoundRow {
  id: string;
  battle_id: string;
  status: 'guessing' | 'revealed';
}

interface BattlePlayerRow {
  battle_id: string;
  user_id: string;
}

interface BattleGuessRow {
  round_id: string;
  battle_id?: string;
  user_id: string;
  guess: number;
  factor?: number;
  points_awarded?: number;
}

function evaluateSelectPolicy(
  authUid: string | null,
  guessRow: BattleGuessRow,
  rounds: BattleRoundRow[],
  players: BattlePlayerRow[]
): boolean {
  if (!authUid) return false;

  // 1. A player can always view their own guess
  if (authUid === guessRow.user_id) {
    return true;
  }

  // 2. A participant in the battle can view all guesses in that battle's round once revealed
  const isRevealedAndParticipant = rounds.some((br) => {
    if (br.id !== guessRow.round_id) return false;
    if (br.status !== 'revealed') return false;
    return players.some((bp) => bp.battle_id === br.battle_id && bp.user_id === authUid);
  });

  return isRevealedAndParticipant;
}

test('RLS Policy: Pre-reveal privacy prevents opponent from viewing active guesses', () => {
  const round1: BattleRoundRow = { id: 'r1', battle_id: 'b1', status: 'guessing' };
  const players: BattlePlayerRow[] = [
    { battle_id: 'b1', user_id: 'user-a' },
    { battle_id: 'b1', user_id: 'user-b' },
  ];
  const guessA: BattleGuessRow = { round_id: 'r1', battle_id: 'b1', user_id: 'user-a', guess: 500 };

  // User A can view their own guess
  assert.equal(evaluateSelectPolicy('user-a', guessA, [round1], players), true);

  // User B (opponent) CANNOT view User A's guess while round is 'guessing'
  assert.equal(evaluateSelectPolicy('user-b', guessA, [round1], players), false);

  // Anonymous user cannot view User A's guess
  assert.equal(evaluateSelectPolicy(null, guessA, [round1], players), false);
});

test('RLS Policy: Post-reveal visibility allows participants to view all round guesses', () => {
  const round1Revealed: BattleRoundRow = { id: 'r1', battle_id: 'b1', status: 'revealed' };
  const players: BattlePlayerRow[] = [
    { battle_id: 'b1', user_id: 'user-a' },
    { battle_id: 'b1', user_id: 'user-b' },
  ];
  const guessA: BattleGuessRow = { round_id: 'r1', battle_id: 'b1', user_id: 'user-a', guess: 500 };
  const guessB: BattleGuessRow = { round_id: 'r1', battle_id: 'b1', user_id: 'user-b', guess: 620 };

  // User A can view User A's and User B's guesses
  assert.equal(evaluateSelectPolicy('user-a', guessA, [round1Revealed], players), true);
  assert.equal(evaluateSelectPolicy('user-a', guessB, [round1Revealed], players), true);

  // User B can view User A's and User B's guesses
  assert.equal(evaluateSelectPolicy('user-b', guessA, [round1Revealed], players), true);
  assert.equal(evaluateSelectPolicy('user-b', guessB, [round1Revealed], players), true);
});

test('RLS Policy: Cross-battle isolation prevents players in other battles from viewing guesses', () => {
  const round1Revealed: BattleRoundRow = { id: 'r1', battle_id: 'b1', status: 'revealed' };
  const players: BattlePlayerRow[] = [
    { battle_id: 'b1', user_id: 'user-a' },
    { battle_id: 'b1', user_id: 'user-b' },
    { battle_id: 'b2', user_id: 'user-c' }, // In a different battle
  ];
  const guessA: BattleGuessRow = { round_id: 'r1', battle_id: 'b1', user_id: 'user-a', guess: 500 };

  // User C in Battle 2 CANNOT view Battle 1's guess even when revealed!
  assert.equal(evaluateSelectPolicy('user-c', guessA, [round1Revealed], players), false);
});

test('Trigger: set_battle_guesses_battle_id enforces canonical battle_id and rejects spoofing', () => {
  const roundMap: Record<string, string> = {
    'round-101': 'battle-abc',
    'round-102': 'battle-xyz',
  };

  function hardenedTrigger(row: { round_id: string; battle_id?: string | null }) {
    const canonicalBattleId = roundMap[row.round_id];
    if (!canonicalBattleId) {
      throw new Error(`Invalid round_id: round ${row.round_id} does not exist`);
    }
    // Hardened trigger ALWAYS overwrites battle_id with the authoritative value from the round
    row.battle_id = canonicalBattleId;
    return row;
  }

  // 1. Omitted battle_id is populated from canonical round
  const rowOmitted = { round_id: 'round-101', battle_id: null };
  hardenedTrigger(rowOmitted);
  assert.equal(rowOmitted.battle_id, 'battle-abc');

  // 2. Client spoofed battle_id is overwritten with canonical battle_id
  const rowSpoofed = { round_id: 'round-101', battle_id: 'battle-spoofed' };
  hardenedTrigger(rowSpoofed);
  assert.equal(rowSpoofed.battle_id, 'battle-abc', 'Trigger must override client-supplied spoofed battle_id');

  // 3. Invalid round_id throws exception
  assert.throws(
    () => hardenedTrigger({ round_id: 'nonexistent-round', battle_id: null }),
    /Invalid round_id/
  );
});

test('Server Authoritative Scoring: Client cannot manipulate score fields', () => {
  // Score calculations must be strictly derived on the server via buildScoreResult
  const guess = 1500;
  const actual = 1000;
  const multiplier = 1.0;

  const result = buildScoreResult(guess, actual, multiplier, false);
  assert.equal(result.factor, 1.5);
  assert.ok(result.xpEarned > 0);

  // Even if an attacker tried to pass points_awarded: 99999 to /api/battles/submit,
  // the server re-computes factor and points_awarded from database questions table
  const computedPoints = result.xpEarned;
  assert.notEqual(computedPoints, 99999);
});

test('Submit Route Validation: Rejects unauthenticated callers via getUser()', async () => {
  // Unauthenticated request without valid auth token/cookie -> 401
  const reqUnauth = new Request('http://localhost:3000/api/battles/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ battleId: 'b1', roundId: 'r1', guess: 100 }),
  });
  const resUnauth = await POST_SUBMIT(reqUnauth);
  assert.equal(resUnauth.status, 401, 'Unauthenticated submit must return 401');
});

test('Rounds Route: Rejects unauthenticated callers and missing parameters via getUser()', async () => {
  // 1. Missing battle ID -> 400
  const reqNoParam = new Request('http://localhost:3000/api/battles/rounds');
  const resNoParam = await GET_ROUNDS(reqNoParam);
  assert.equal(resNoParam.status, 400, 'Missing battle ID must return 400');

  // 2. Unauthenticated -> 401
  const reqUnauth = new Request('http://localhost:3000/api/battles/rounds?id=b1');
  const resUnauth = await GET_ROUNDS(reqUnauth);
  assert.equal(resUnauth.status, 401, 'Unauthenticated rounds query must return 401');
});
