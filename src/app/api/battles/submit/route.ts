import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildScoreResult } from '@/lib/constants/scoring';
import { DIFFICULTIES } from '@/lib/constants/difficulties';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { battleId, roundId, guess } = await request.json();

    // 1. Get round and question info securely
    const { data: round, error: roundError } = await supabaseAdmin
      .from('battle_rounds')
      .select('*, questions(reference_answer, difficulty)')
      .eq('id', roundId)
      .single();

    if (roundError || !round) throw new Error('Round not found');
    if (round.status !== 'guessing') throw new Error('Round is closed');

    const { BATTLE_ROUND_TIMEOUT_SECONDS } = await import('@/lib/constants/battle');
    const { finalizeBattleRound } = await import('@/lib/battle/finalizeRound');

    const now = new Date().getTime();
    const startedAt = round.started_at ? new Date(round.started_at).getTime() : now;
    const isTimeout = (now - startedAt) / 1000 >= BATTLE_ROUND_TIMEOUT_SECONDS;

    if (isTimeout) {
      // Force reveal immediately
      await finalizeBattleRound(battleId, roundId);
      // Do not allow this late guess to count
      return NextResponse.json({ success: true, late: true });
    }

    // 2. Calculate score securely
    const actual = round.questions.reference_answer;
    const diffMultiplier = DIFFICULTIES[round.questions.difficulty as keyof typeof DIFFICULTIES]?.xpMultiplier || 1.0;
    const secureScore = buildScoreResult(guess, actual, diffMultiplier, false);

    // 3. Insert guess
    const { error: guessError } = await supabase
      .from('battle_guesses')
      .upsert({
        round_id: roundId,
        user_id: session.user.id,
        guess: guess,
        factor: secureScore.factor,
        points_awarded: secureScore.xpEarned // Map XP to points for battle
      }, { onConflict: 'round_id,user_id' });

    if (guessError) throw guessError;

    // 4. Check if everyone has guessed
    const { data: players, error: playersError } = await supabase
      .from('battle_players')
      .select('user_id')
      .eq('battle_id', battleId);
      
    if (playersError) throw playersError;

    const { count: guessCount } = await supabase
      .from('battle_guesses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', roundId);
      
    if ((guessCount || 0) >= players.length) {
      // Everyone guessed! Auto-reveal the round securely.
      await finalizeBattleRound(battleId, roundId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Battles Submit Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

