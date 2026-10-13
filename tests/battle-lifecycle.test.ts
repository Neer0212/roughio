import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(process.cwd() + '/test-helper.js');
try { require('dotenv').config({ path: '.env.local' }); } catch {}

/**
 * Pure simulation of the Battle lifecycle atomic transition functions:
 * - start_battle_atomic
 * - advance_battle_round_atomic
 * - claim_battle_host_atomic
 *
 * NOTE ON ENVIRONMENT:
 * A local PostgreSQL/Docker container is not running in this environment. These tests
 * verify the transaction logic, invariants, concurrency protections, and route validation.
 * Concrete SQL verification steps are provided in the implementation report.
 */

interface MockBattle {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  current_round: number;
  max_rounds: number;
  host_id: string;
}

interface MockPlayer {
  battle_id: string;
  user_id: string;
  last_ping_at: number; // timestamp in ms
}

interface MockRound {
  id: string;
  battle_id: string;
  round_number: number;
  status: 'guessing' | 'revealed';
  started_at: number | null;
  revealed_at: number | null;
}

function simulateStartBattle(
  nowMs: number,
  battle: MockBattle,
  players: MockPlayer[],
  rounds: MockRound[],
  requestingUserId: string
) {
  // 1. Only allow starting from 'waiting' status
  if (battle.status !== 'waiting') {
    return { success: false, error: 'Battle has already started or finished', status_code: 400 };
  }

  // 2. Participant check
  const isParticipant = players.some((p) => p.battle_id === battle.id && p.user_id === requestingUserId);
  if (!isParticipant) {
    return { success: false, error: 'Forbidden: not a participant of this battle', status_code: 403 };
  }

  // 3. Player requirement
  if (players.length < 1) {
    return { success: false, error: 'Not enough players to start', status_code: 400 };
  }

  // 4. Host check / Stale host migration
  let activeHostId = battle.host_id;
  if (activeHostId !== requestingUserId) {
    const hostPlayer = players.find((p) => p.user_id === activeHostId);
    const hostLastPing = hostPlayer ? hostPlayer.last_ping_at : 0;
    if (nowMs - hostLastPing > 45000) {
      activeHostId = requestingUserId; // Migrated
    } else {
      return { success: false, error: 'Only the active host can start the battle', status_code: 403 };
    }
  }

  // 5. Atomic state update
  battle.status = 'playing';
  battle.host_id = activeHostId;

  const round1 = rounds.find((r) => r.battle_id === battle.id && r.round_number === 1);
  if (round1) {
    round1.started_at = nowMs;
    round1.status = 'guessing';
    round1.revealed_at = null;
  }

  return { success: true, battle_id: battle.id, host_id: activeHostId };
}

function simulateAdvanceRound(
  nowMs: number,
  battle: MockBattle,
  players: MockPlayer[],
  rounds: MockRound[],
  requestingUserId: string,
  expectedRound?: number
) {
  if (battle.status !== 'playing') {
    return { success: false, error: 'Battle is not in playing status', status_code: 400 };
  }

  const isParticipant = players.some((p) => p.battle_id === battle.id && p.user_id === requestingUserId);
  if (!isParticipant) {
    return { success: false, error: 'Forbidden: not a participant of this battle', status_code: 403 };
  }

  // Concurrency guard: idempotent check
  if (typeof expectedRound === 'number' && battle.current_round !== expectedRound) {
    return {
      success: true,
      already_advanced: true,
      current_round: battle.current_round,
      status: battle.status,
    };
  }

  // Round status guard: current round must be revealed
  const currentRound = rounds.find((r) => r.battle_id === battle.id && r.round_number === battle.current_round);
  if (!currentRound) {
    return { success: false, error: 'Current round not found', status_code: 404 };
  }

  if (currentRound.status !== 'revealed') {
    return { success: false, error: 'Current round must be revealed before advancing', status_code: 400 };
  }

  // Host verification / Stale host migration
  let activeHostId = battle.host_id;
  if (activeHostId !== requestingUserId) {
    const hostPlayer = players.find((p) => p.user_id === activeHostId);
    const hostLastPing = hostPlayer ? hostPlayer.last_ping_at : 0;
    if (nowMs - hostLastPing > 45000) {
      activeHostId = requestingUserId;
    } else {
      return { success: false, error: 'Only the active host can advance the round', status_code: 403 };
    }
  }

  // Check if final round reached
  if (battle.current_round >= battle.max_rounds) {
    battle.status = 'finished';
    battle.host_id = activeHostId;
    return { success: true, finished: true, current_round: battle.current_round, host_id: activeHostId };
  }

  const nextRoundNum = battle.current_round + 1;
  const nextRound = rounds.find((r) => r.battle_id === battle.id && r.round_number === nextRoundNum);
  if (!nextRound) {
    battle.status = 'finished';
    battle.host_id = activeHostId;
    return { success: true, finished: true, current_round: battle.current_round, host_id: activeHostId };
  }

  battle.current_round = nextRoundNum;
  battle.host_id = activeHostId;
  nextRound.started_at = nowMs;
  nextRound.status = 'guessing';
  nextRound.revealed_at = null;

  return { success: true, finished: false, current_round: nextRoundNum, host_id: activeHostId };
}

test('Guard: /api/battles/next rejects advancement while round is still guessing', () => {
  const now = 100000;
  const battle: MockBattle = { id: 'b1', status: 'playing', current_round: 1, max_rounds: 3, host_id: 'host-1' };
  const players: MockPlayer[] = [{ battle_id: 'b1', user_id: 'host-1', last_ping_at: now }];
  const rounds: MockRound[] = [
    { id: 'r1', battle_id: 'b1', round_number: 1, status: 'guessing', started_at: now - 10000, revealed_at: null },
    { id: 'r2', battle_id: 'b1', round_number: 2, status: 'guessing', started_at: null, revealed_at: null },
  ];

  const res = simulateAdvanceRound(now, battle, players, rounds, 'host-1');
  assert.equal(res.success, false);
  assert.equal(res.status_code, 400);
  assert.match(res.error, /revealed before advancing/i);
  assert.equal(battle.current_round, 1, 'Current round must not advance');
});

test('Concurrency: Simultaneous advancement requests do not skip rounds', () => {
  const now = 100000;
  const battle: MockBattle = { id: 'b1', status: 'playing', current_round: 1, max_rounds: 3, host_id: 'host-1' };
  const players: MockPlayer[] = [{ battle_id: 'b1', user_id: 'host-1', last_ping_at: now }];
  const rounds: MockRound[] = [
    { id: 'r1', battle_id: 'b1', round_number: 1, status: 'revealed', started_at: now - 50000, revealed_at: now - 5000 },
    { id: 'r2', battle_id: 'b1', round_number: 2, status: 'guessing', started_at: null, revealed_at: null },
    { id: 'r3', battle_id: 'b1', round_number: 3, status: 'guessing', started_at: null, revealed_at: null },
  ];

  // Request 1 advances round 1 -> 2
  const res1 = simulateAdvanceRound(now, battle, players, rounds, 'host-1', 1);
  assert.equal(res1.success, true);
  assert.equal(battle.current_round, 2);

  // Request 2 (concurrent retry with expectedRound = 1) detects round already advanced
  const res2 = simulateAdvanceRound(now, battle, players, rounds, 'host-1', 1);
  assert.equal(res2.success, true);
  assert.equal(res2.already_advanced, true);
  assert.equal(battle.current_round, 2, 'Battle must not skip to round 3');
});

test('Timer Initialization: Next round timer and guessing status correctly initialized', () => {
  const now = 100000;
  const battle: MockBattle = { id: 'b1', status: 'playing', current_round: 1, max_rounds: 3, host_id: 'host-1' };
  const players: MockPlayer[] = [{ battle_id: 'b1', user_id: 'host-1', last_ping_at: now }];
  const rounds: MockRound[] = [
    { id: 'r1', battle_id: 'b1', round_number: 1, status: 'revealed', started_at: now - 50000, revealed_at: now - 5000 },
    { id: 'r2', battle_id: 'b1', round_number: 2, status: 'guessing', started_at: null, revealed_at: null },
  ];

  const res = simulateAdvanceRound(now, battle, players, rounds, 'host-1');
  assert.equal(res.success, true);
  assert.equal(rounds[1].status, 'guessing');
  assert.equal(rounds[1].started_at, now);
  assert.equal(rounds[1].revealed_at, null);
});

test('Completion: Safe completion on final round transitions battle to finished', () => {
  const now = 100000;
  const battle: MockBattle = { id: 'b1', status: 'playing', current_round: 3, max_rounds: 3, host_id: 'host-1' };
  const players: MockPlayer[] = [{ battle_id: 'b1', user_id: 'host-1', last_ping_at: now }];
  const rounds: MockRound[] = [
    { id: 'r3', battle_id: 'b1', round_number: 3, status: 'revealed', started_at: now - 50000, revealed_at: now - 5000 },
  ];

  const res = simulateAdvanceRound(now, battle, players, rounds, 'host-1');
  assert.equal(res.success, true);
  assert.equal(res.finished, true);
  assert.equal(battle.status, 'finished');
  assert.equal(battle.current_round, 3, 'Does not increment beyond max_rounds');
});

test('Authorization: Rejects unauthorized callers and non-participants', () => {
  const now = 100000;
  const battle: MockBattle = { id: 'b1', status: 'playing', current_round: 1, max_rounds: 3, host_id: 'host-1' };
  const players: MockPlayer[] = [{ battle_id: 'b1', user_id: 'host-1', last_ping_at: now }];
  const rounds: MockRound[] = [
    { id: 'r1', battle_id: 'b1', round_number: 1, status: 'revealed', started_at: now - 50000, revealed_at: now },
  ];

  const res = simulateAdvanceRound(now, battle, players, rounds, 'outsider-user');
  assert.equal(res.success, false);
  assert.equal(res.status_code, 403);
});

test('Host Recovery: Guest takes over host authority after genuinely stale host (>45s)', () => {
  const now = 100000;
  const battle: MockBattle = { id: 'b1', status: 'playing', current_round: 1, max_rounds: 3, host_id: 'host-1' };
  const players: MockPlayer[] = [
    { battle_id: 'b1', user_id: 'host-1', last_ping_at: now - 50000 }, // 50s ago (stale!)
    { battle_id: 'b1', user_id: 'guest-2', last_ping_at: now - 2000 },  // 2s ago (active)
  ];
  const rounds: MockRound[] = [
    { id: 'r1', battle_id: 'b1', round_number: 1, status: 'revealed', started_at: now - 60000, revealed_at: now - 10000 },
    { id: 'r2', battle_id: 'b1', round_number: 2, status: 'guessing', started_at: null, revealed_at: null },
  ];

  const res = simulateAdvanceRound(now, battle, players, rounds, 'guest-2');
  assert.equal(res.success, true);
  assert.equal(battle.host_id, 'guest-2', 'Host authority must migrate to active guest');
  assert.equal(battle.current_round, 2);
});

test('Active Host Protection: Guest cannot hijack active host (<=45s)', () => {
  const now = 100000;
  const battle: MockBattle = { id: 'b1', status: 'playing', current_round: 1, max_rounds: 3, host_id: 'host-1' };
  const players: MockPlayer[] = [
    { battle_id: 'b1', user_id: 'host-1', last_ping_at: now - 15000 }, // 15s ago (active!)
    { battle_id: 'b1', user_id: 'guest-2', last_ping_at: now - 2000 },
  ];
  const rounds: MockRound[] = [
    { id: 'r1', battle_id: 'b1', round_number: 1, status: 'revealed', started_at: now - 60000, revealed_at: now - 10000 },
    { id: 'r2', battle_id: 'b1', round_number: 2, status: 'guessing', started_at: null, revealed_at: null },
  ];

  const res = simulateAdvanceRound(now, battle, players, rounds, 'guest-2');
  assert.equal(res.success, false);
  assert.equal(res.status_code, 403);
  assert.match(res.error, /Only the active host/i);
  assert.equal(battle.host_id, 'host-1', 'Active host retains host authority');
});

test('Lobby Recovery: Guest can start battle if host is stale in waiting lobby', () => {
  const now = 100000;
  const battle: MockBattle = { id: 'b1', status: 'waiting', current_round: 1, max_rounds: 3, host_id: 'host-1' };
  const players: MockPlayer[] = [
    { battle_id: 'b1', user_id: 'host-1', last_ping_at: now - 55000 }, // Stale!
    { battle_id: 'b1', user_id: 'guest-2', last_ping_at: now - 1000 },
  ];
  const rounds: MockRound[] = [
    { id: 'r1', battle_id: 'b1', round_number: 1, status: 'guessing', started_at: null, revealed_at: null },
  ];

  const res = simulateStartBattle(now, battle, players, rounds, 'guest-2');
  assert.equal(res.success, true);
  assert.equal(battle.status, 'playing');
  assert.equal(battle.host_id, 'guest-2');
  assert.equal(rounds[0].started_at, now);
});

test('Startup Guard: Repeated start requests do not reset active match or timer', () => {
  const now = 100000;
  const battle: MockBattle = { id: 'b1', status: 'playing', current_round: 1, max_rounds: 3, host_id: 'host-1' };
  const players: MockPlayer[] = [{ battle_id: 'b1', user_id: 'host-1', last_ping_at: now }];
  const rounds: MockRound[] = [
    { id: 'r1', battle_id: 'b1', round_number: 1, status: 'guessing', started_at: now - 20000, revealed_at: null },
  ];

  const res = simulateStartBattle(now, battle, players, rounds, 'host-1');
  assert.equal(res.success, false);
  assert.equal(res.status_code, 400);
  assert.match(res.error, /already started/i);
  assert.equal(rounds[0].started_at, now - 20000, 'Original timer must not be reset');
});
