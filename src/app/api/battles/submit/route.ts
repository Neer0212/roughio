import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildScoreResult } from '@/lib/constants/scoring';
import { DIFFICULTIES } from '@/lib/constants/difficulties';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { battleId, roundId, guess } = await request.json();

    // 1. Get round and question info
    const { data: round, error: roundError } = await supabase
      .from('battle_rounds')
      .select('*, questions(reference_answer, difficulty)')
      .eq('id', roundId)
      .single();

    if (roundError || !round) throw new Error('Round not found');
    if (round.status !== 'guessing') throw new Error('Round is closed');

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

    const { data: guesses, error: guessesError } = await supabase
      .from('battle_guesses')
      .select('user_id')
      .eq('round_id', roundId);
      
    if (guessesError) throw guessesError;

    if (guesses.length >= players.length) {
      // Everyone guessed! Auto-reveal the round.
      await supabase
        .from('battle_rounds')
        .update({ status: 'revealed' })
        .eq('id', roundId);
        
      // Update cumulative scores
      const { data: allGuesses } = await supabase
        .from('battle_guesses')
        .select('user_id, points_awarded')
        .eq('round_id', roundId);
        
      if (allGuesses) {
        for (const g of allGuesses) {
          const { data: bp } = await supabase
            .from('battle_players')
            .select('score')
            .eq('battle_id', battleId)
            .eq('user_id', g.user_id)
            .single();
            
          if (bp) {
            await supabase
              .from('battle_players')
              .update({ score: bp.score + g.points_awarded })
              .eq('battle_id', battleId)
              .eq('user_id', g.user_id);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Battles Submit Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
