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
      const { data: rpcResult, error: rpcError } = await admin.rpc('claim_battle_host_atomic', {
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

    // 2. Resilient fallback
    const { data: battle } = await admin.from('battles').select('host_id').eq('id', battleId).maybeSingle();
    if (!battle) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });

    const { ensureActiveHost } = await import('@/lib/battle/checkHostMigration');
    const newHostId = await ensureActiveHost(battleId, battle.host_id, user.id);

    if (newHostId === user.id) {
      return NextResponse.json({ success: true, host_id: user.id });
    }

    return NextResponse.json({ error: 'Host is currently active' }, { status: 403 });
  } catch (err: any) {
    console.error('API Battles Claim Host Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
