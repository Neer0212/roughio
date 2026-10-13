import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    let user = null;
    try {
      const supabase = await createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && authUser) user = authUser;
    } catch {
      // In environments without cookies / mock requests without cookies
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { battleId, expectedRound } = await request.json().catch(() => ({}));
    if (!battleId || typeof battleId !== 'string') {
      return NextResponse.json({ error: 'Invalid battle ID' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Try atomic database RPC function first
    try {
      const { data: rpcResult, error: rpcError } = await admin.rpc('advance_battle_round_atomic', {
        p_battle_id: battleId,
        p_user_id: user.id,
        p_expected_round: typeof expectedRound === 'number' ? expectedRound : null,
      });

      if (!rpcError && rpcResult) {
        if (!rpcResult.success) {
          return NextResponse.json({ error: rpcResult.error }, { status: rpcResult.status_code || 400 });
        }
        return NextResponse.json(rpcResult);
      }
    } catch {
      // Fallback in mock environments
    }

    // 2. Resilient fallback with optimistic concurrency protection
    const { data: battle, error: battleError } = await admin
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    if (battle.status !== 'playing') {
      return NextResponse.json({ error: 'Battle is not in playing status' }, { status: 400 });
    }

    // Verify caller is a participant in this battle
    const { data: participant } = await admin
      .from('battle_players')
      .select('user_id')
      .eq('battle_id', battleId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden: not a participant of this battle' }, { status: 403 });
    }

    // Concurrency check: if client specified expectedRound and it already advanced, return idempotent success
    if (typeof expectedRound === 'number' && battle.current_round !== expectedRound) {
      return NextResponse.json({
        success: true,
        already_advanced: true,
        current_round: battle.current_round,
      });
    }

    // Verify current round exists and is revealed
    const { data: currentRoundRecord } = await admin
      .from('battle_rounds')
      .select('status')
      .eq('battle_id', battleId)
      .eq('round_number', battle.current_round)
      .single();

    if (!currentRoundRecord) {
      return NextResponse.json({ error: 'Current round not found' }, { status: 404 });
    }

    if (currentRoundRecord.status !== 'revealed') {
      return NextResponse.json({ error: 'Current round must be revealed before advancing' }, { status: 400 });
    }

    // Host verification / Stale host migration
    let activeHostId = battle.host_id;
    if (activeHostId !== user.id) {
      const { ensureActiveHost } = await import('@/lib/battle/checkHostMigration');
      activeHostId = await ensureActiveHost(battleId, activeHostId, user.id);
    }

    if (activeHostId !== user.id) {
      return NextResponse.json({ error: 'Only the active host can advance the round' }, { status: 403 });
    }

    if (battle.current_round >= battle.max_rounds) {
      // Finish battle
      await admin.from('battles')
        .update({ status: 'finished', host_id: activeHostId })
        .eq('id', battleId)
        .eq('current_round', battle.current_round);

      return NextResponse.json({ success: true, finished: true, current_round: battle.current_round });
    } else {
      const nextRoundNum = battle.current_round + 1;

      // Verify next round exists
      const { data: nextRoundRecord } = await admin
        .from('battle_rounds')
        .select('id')
        .eq('battle_id', battleId)
        .eq('round_number', nextRoundNum)
        .maybeSingle();

      if (!nextRoundRecord) {
        await admin.from('battles')
          .update({ status: 'finished', host_id: activeHostId })
          .eq('id', battleId);
        return NextResponse.json({ success: true, finished: true, current_round: battle.current_round });
      }

      // Optimistic concurrency update: only updates if current_round still matches
      const { data: updatedBattle } = await admin.from('battles')
        .update({ current_round: nextRoundNum, host_id: activeHostId })
        .eq('id', battleId)
        .eq('current_round', battle.current_round)
        .select()
        .maybeSingle();

      if (!updatedBattle) {
        return NextResponse.json({ success: true, already_advanced: true });
      }

      await admin.from('battle_rounds')
        .update({ started_at: new Date().toISOString(), status: 'guessing', revealed_at: null })
        .eq('battle_id', battleId)
        .eq('round_number', nextRoundNum);

      return NextResponse.json({ success: true, current_round: nextRoundNum });
    }
  } catch (err: any) {
    console.error('API Battles Next Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

