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

    const body = await request.json();
    const { attempts } = body; // Accept an array of attempts for batch migration

    if (!attempts || !Array.isArray(attempts)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Map the incoming Attempts to the DB schema
    const rowsToInsert = attempts.map(att => ({
      user_id: session.user.id,
      question_id: att.questionId,
      guess: att.userGuess,
      actual: att.scoreResult.referenceAnswer,
      factor: att.scoreResult.factor,
      score_classification: att.scoreResult.classification,
      log_distance: att.scoreResult.logDistance,
      xp_earned: att.scoreResult.xpEarned || 0,
      used_hint: att.usedHint || false,
      user_reasoning: att.userReasoning || null
    }));

    const { error } = await supabase
      .from('attempts')
      .insert(rowsToInsert);

    if (error) throw error;

    // We can also update the profile XP and streak here if needed,
    // or rely on a database trigger. A trigger is usually better.

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Attempts Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
