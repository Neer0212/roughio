import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function generateShortCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Ensure user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { maxRounds = 3 } = await request.json().catch(() => ({}));

    // 1. Generate unique short code
    const shortCode = generateShortCode();

    // 2. Create the battle
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .insert({
        short_code: shortCode,
        host_id: session.user.id,
        status: 'waiting',
        current_round: 1,
        max_rounds: maxRounds
      })
      .select('id, short_code')
      .single();

    if (battleError) throw battleError;

    // 3. Add host to players
    const { error: playerError } = await supabase
      .from('battle_players')
      .insert({
        battle_id: battle.id,
        user_id: session.user.id
      });
      
    if (playerError) throw playerError;

    // 4. Pre-fetch questions for the rounds
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id')
      .eq('status', 'active')
      .limit(20);
      
    if (qError) throw qError;
    
    // Shuffle and pick
    const shuffled = questions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, maxRounds);
    
    // 5. Create the rounds
    const roundsToInsert = selected.map((q, idx) => ({
      battle_id: battle.id,
      round_number: idx + 1,
      question_id: q.id,
      status: 'guessing'
    }));
    
    const { error: roundsError } = await supabase
      .from('battle_rounds')
      .insert(roundsToInsert);
      
    if (roundsError) throw roundsError;

    return NextResponse.json({ success: true, battleId: battle.id, shortCode: battle.short_code });
  } catch (err: any) {
    console.error('API Battles Create Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
