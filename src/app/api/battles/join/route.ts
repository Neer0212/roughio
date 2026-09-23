import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Ensure user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shortCode } = await request.json();
    if (!shortCode) {
      return NextResponse.json({ error: 'Missing short code' }, { status: 400 });
    }

    // 1. Find the battle
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('id, status')
      .eq('short_code', shortCode.toUpperCase())
      .single();

    if (battleError || !battle) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    if (battle.status !== 'waiting') {
      return NextResponse.json({ error: 'Match has already started or finished' }, { status: 400 });
    }

    // 2. Add player to battle (Ignore error if they are already in the battle)
    const { error: playerError } = await supabase
      .from('battle_players')
      .upsert({
        battle_id: battle.id,
        user_id: session.user.id
      }, { onConflict: 'battle_id,user_id' });
      
    if (playerError) throw playerError;

    return NextResponse.json({ success: true, battleId: battle.id });
  } catch (err: any) {
    console.error('API Battles Join Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
