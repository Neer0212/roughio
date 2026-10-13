import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildScoreResult } from '@/lib/constants/scoring';
import { DIFFICULTIES } from '@/lib/constants/difficulties';

export async function POST(request: Request) {
  try {
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { battleId, roundId, guess } = await request.json();

    if (!battleId || typeof battleId !== 'string' || !roundId || typeof roundId !== 'string') {
      return NextResponse.json({ error: 'Invalid battle or round ID' }, { status: 400 });
    }
    if (typeof guess !== 'number' || !Number.isFinite(guess) || guess <= 0) {
      return NextResponse.json({ error: 'Invalid guess value' }, { status: 400 });
    }

    // Verify player is an active participant in this battle
    const { data: playerRecord, error: playerError } = await supabaseAdmin
      .from('battle_players')
      .select('user_id')
      .eq('battle_id', battleId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (playerError || !playerRecord) {
      return NextResponse.json({ error: 'Forbidden: not a participant of this battle' }, { status: 403 });
    }

    // 1. Get round and question info securely
    const { data: round, error: roundError } = await supabaseAdmin
      .from('battle_rounds')
      .select('*, questions(reference_answer, difficulty)')
      .eq('id', roundId)
      .eq('battle_id', battleId)
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

    // 3. Insert guess via admin (server-authorized path to prevent client tampering)
    const { error: guessError } = await supabaseAdmin
      .from('battle_guesses')
      .upsert({
        round_id: roundId,
        battle_id: battleId,
        user_id: user.id,
        guess: guess,
        factor: secureScore.factor,
        points_awarded: secureScore.xpEarned // Map XP to points for battle
      }, { onConflict: 'round_id,user_id' });

    if (guessError) throw guessError;

    // 4. Check if everyone has guessed
    const { data: players, error: playersError } = await supabaseAdmin
      .from('battle_players')
      .select('user_id')
      .eq('battle_id', battleId);
      
    if (playersError) throw playersError;

    // Must query with supabaseAdmin: RLS prevents regular client from seeing opponents' guesses during 'guessing'
    const { count: guessCount } = await supabaseAdmin
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

