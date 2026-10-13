import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const battleId = searchParams.get('id');

    if (!battleId) {
      return NextResponse.json({ error: 'Missing battle ID' }, { status: 400 });
    }

    // Auth Check
    let user = null;
    try {
      const supabase = await createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && authUser) {
        user = authUser;
      }
    } catch {
      // In environments without cookies / mock requests without cookies
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Participation Check
    const { data: participation, error: pError } = await supabaseAdmin
      .from('battle_players')
      .select('user_id')
      .eq('battle_id', battleId)
      .eq('user_id', user.id)
      .single();

    if (pError || !participation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch Rounds with Questions securely via Admin to bypass RLS
    const { data: rData, error: rError } = await supabaseAdmin
      .from('battle_rounds')
      .select('*, questions(id, text, unit, category, difficulty)')
      .eq('battle_id', battleId)
      .order('round_number', { ascending: true });

    if (rError) throw rError;

    const roundIds = (rData || []).map((r) => r.id);
    const guessCountsByRound: Record<string, number> = {};
    if (roundIds.length > 0) {
      const { data: gData } = await supabaseAdmin
        .from('battle_guesses')
        .select('round_id')
        .in('round_id', roundIds);
      if (gData) {
        for (const g of gData) {
          guessCountsByRound[g.round_id] = (guessCountsByRound[g.round_id] || 0) + 1;
        }
      }
    }

    const { BATTLE_ROUND_TIMEOUT_SECONDS } = await import('@/lib/constants/battle');
    const { finalizeBattleRound } = await import('@/lib/battle/finalizeRound');

    const mappedRounds = [];
    for (const r of rData || []) {
      const q: any = Array.isArray(r.questions) ? r.questions[0] : r.questions;
      let status = r.status;
      
      if (status === 'guessing' && r.started_at) {
        const startedAt = new Date(r.started_at).getTime();
        const now = new Date().getTime();
        const isTimeout = (now - startedAt) / 1000 >= BATTLE_ROUND_TIMEOUT_SECONDS;
        
        if (isTimeout) {
          // Force finalize
          await finalizeBattleRound(battleId, r.id);
          status = 'revealed';
        }
      }

      mappedRounds.push({
        id: r.id,
        round_number: r.round_number,
        status: status,
        started_at: r.started_at,
        guessCount: guessCountsByRound[r.id] || 0,
        question: q
      });
    }

    return NextResponse.json({ success: true, rounds: mappedRounds });
  } catch (err: any) {
    console.error('API Battles Rounds Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
