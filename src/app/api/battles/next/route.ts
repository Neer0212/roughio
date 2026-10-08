import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { battleId } = await request.json();

    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) throw new Error('Battle not found');

    let activeHostId = battle.host_id;
    if (activeHostId !== session.user.id) {
      const { ensureActiveHost } = await import('@/lib/battle/checkHostMigration');
      activeHostId = await ensureActiveHost(battleId, activeHostId, session.user.id);
    }

    if (activeHostId !== session.user.id) throw new Error('Only the active host can advance the round');

    if (battle.current_round >= battle.max_rounds) {
      // Finish battle
      await supabase.from('battles').update({ status: 'finished' }).eq('id', battleId);
    } else {
      // Next round
      await supabase.from('battles').update({ current_round: battle.current_round + 1 }).eq('id', battleId);
      
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
      const admin = getSupabaseAdmin();
      await admin.from('battle_rounds')
        .update({ started_at: new Date().toISOString(), status: 'guessing', revealed_at: null })
        .eq('battle_id', battleId)
        .eq('round_number', battle.current_round + 1);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Battles Next Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

