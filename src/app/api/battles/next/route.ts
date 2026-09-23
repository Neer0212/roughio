import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { battleId } = await request.json();

    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) throw new Error('Battle not found');
    if (battle.host_id !== session.user.id) throw new Error('Only the host can advance the round');

    if (battle.current_round >= battle.max_rounds) {
      // Finish battle
      await supabase.from('battles').update({ status: 'finished' }).eq('id', battleId);
    } else {
      // Next round
      await supabase.from('battles').update({ current_round: battle.current_round + 1 }).eq('id', battleId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Battles Next Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
