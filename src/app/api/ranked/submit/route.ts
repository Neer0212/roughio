import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildScoreResult } from '@/lib/constants/scoring';
import { DIFFICULTIES } from '@/lib/constants/difficulties';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { date, guesses } = await request.json();
    if (!Array.isArray(guesses) || guesses.length !== 3) {
      return NextResponse.json({ error: 'Expected 3 guesses' }, { status: 400 });
    }

    // Check if already attempted
    const { data: existing } = await supabase
      .from('daily_attempts')
      .select('id')
      .eq('date', date)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You have already played the Daily Challenge today' }, { status: 400 });
    }

    // Fetch challenge
    const { data: challenge } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('date', date)
      .single();

    if (!challenge) throw new Error('Challenge not found');

    // Fetch questions to score securely
    const { data: questions } = await supabase
      .from('questions')
      .select('id, reference_answer, difficulty')
      .in('id', challenge.question_ids);

    if (!questions || questions.length !== 3) throw new Error('Failed to load questions for scoring');

    // Make sure we map guesses to the exact order of challenge.question_ids
    let totalScore = 0;
    let totalFactor = 0;

    for (let i = 0; i < 3; i++) {
      const qId = challenge.question_ids[i];
      const guess = guesses[i];
      const qDef = questions.find(q => q.id === qId);
      if (!qDef) throw new Error('Missing question data');

      const diffMultiplier = DIFFICULTIES[qDef.difficulty as keyof typeof DIFFICULTIES]?.multiplier || 1.0;
      const result = buildScoreResult(guess, qDef.reference_answer, diffMultiplier, false);
      
      totalScore += result.xpEarned;
      totalFactor += result.factor;
    }

    const avgFactor = totalFactor / 3;
    
    // Calculate Elo change
    let eloChange = 0;
    if (avgFactor <= 1.5) eloChange = 30;       // Legendary
    else if (avgFactor <= 3.0) eloChange = 15;  // Great
    else if (avgFactor <= 10.0) eloChange = 0;  // Average
    else if (avgFactor <= 100.0) eloChange = -15; // Poor
    else eloChange = -30;                       // Terrible

    // Insert attempt
    const { error: attemptError } = await supabase
      .from('daily_attempts')
      .insert({
        date,
        user_id: session.user.id,
        total_score: totalScore,
        elo_change: eloChange
      });

    if (attemptError) throw attemptError;

    // Update Profile Elo securely
    const { data: profile } = await supabase
      .from('profiles')
      .select('elo_rating')
      .eq('id', session.user.id)
      .single();

    const currentElo = profile?.elo_rating || 1200;
    const newElo = Math.max(0, currentElo + eloChange); // Prevents negative Elo

    await supabase
      .from('profiles')
      .update({ elo_rating: newElo })
      .eq('id', session.user.id);

    return NextResponse.json({ success: true, eloChange, newElo, totalScore, avgFactor });
  } catch (err: any) {
    console.error('API Ranked Submit Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
