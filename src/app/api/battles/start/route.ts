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

    const { battleId } = await request.json().catch(() => ({}));
    if (!battleId || typeof battleId !== 'string') {
      return NextResponse.json({ error: 'Invalid battle ID' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Try atomic database RPC function first
    try {
      const { data: rpcResult, error: rpcError } = await admin.rpc('start_battle_atomic', {
        p_battle_id: battleId,
        p_user_id: user.id,
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

    // 2. Resilient fallback with atomic conditional state transition
    const { data: battle, error: battleError } = await admin
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    if (battle.status !== 'waiting') {
      return NextResponse.json({ error: 'Battle has already started or finished' }, { status: 400 });
    }

    // Verify caller is an active participant
    const { data: participant } = await admin
      .from('battle_players')
      .select('user_id')
      .eq('battle_id', battleId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden: not a participant of this battle' }, { status: 403 });
    }

    // Check player count
    const { count: playerCount } = await admin
      .from('battle_players')
      .select('*', { count: 'exact', head: true })
      .eq('battle_id', battleId);

    if (!playerCount || playerCount < 1) {
      return NextResponse.json({ error: 'Not enough players to start' }, { status: 400 });
    }

    // Host check / Stale host migration
    let activeHostId = battle.host_id;
    if (activeHostId !== user.id) {
      const { ensureActiveHost } = await import('@/lib/battle/checkHostMigration');
      activeHostId = await ensureActiveHost(battleId, activeHostId, user.id);
    }
    
    if (activeHostId !== user.id) {
      return NextResponse.json({ error: 'Only the active host can start the battle' }, { status: 403 });
    }

    // Atomic update: only transitions if status is still 'waiting'
    const { data: updatedBattle } = await admin.from('battles')
      .update({ status: 'playing', host_id: activeHostId })
      .eq('id', battleId)
      .eq('status', 'waiting')
      .select()
      .maybeSingle();

    if (!updatedBattle) {
      return NextResponse.json({ error: 'Battle has already started' }, { status: 400 });
    }

    // Set started_at for round 1
    await admin.from('battle_rounds')
      .update({ started_at: new Date().toISOString(), status: 'guessing', revealed_at: null })
      .eq('battle_id', battleId)
      .eq('round_number', 1);

    return NextResponse.json({ success: true, host_id: activeHostId });
  } catch (err: any) {
    console.error('API Battles Start Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

