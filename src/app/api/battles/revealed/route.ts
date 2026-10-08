import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { battleId, roundIds } = await request.json();
    if (!battleId || !roundIds || !Array.isArray(roundIds) || roundIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Verify participation
    const { data: participation, error: pError } = await supabaseAdmin
      .from('battle_players')
      .select('user_id')
      .eq('battle_id', battleId)
      .eq('user_id', session.user.id)
      .single();

    if (pError || !participation) {
      return NextResponse.json({ error: 'Forbidden: not a participant' }, { status: 403 });
    }

    // Securely check which of these rounds are actually revealed
    const { data: rounds, error: roundsError } = await supabaseAdmin
      .from('battle_rounds')
      .select('id, status, questions(id, reference_answer)')
      .eq('battle_id', battleId)
      .in('id', roundIds);

    if (roundsError) throw roundsError;

    const answers: Record<string, number> = {};

    for (const round of rounds || []) {
      if (round.status === 'revealed' && round.questions) {
        const q: any = Array.isArray(round.questions) ? round.questions[0] : round.questions;
        if (q) answers[round.id] = q.reference_answer;
      }
    }

    return NextResponse.json({ success: true, answers });
  } catch (err: any) {
    console.error('API Battles Revealed Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
