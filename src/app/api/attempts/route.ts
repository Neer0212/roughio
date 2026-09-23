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
    const { attempts } = body; // Accept an array of attempts

    if (!attempts || !Array.isArray(attempts)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Collect all unique question IDs
    const questionIds = Array.from(new Set(attempts.map((a: any) => a.questionId)));

    // 2. Fetch the actual answers and difficulty from the database
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, reference_answer, difficulty')
      .in('id', questionIds);

    if (qError) throw qError;
    const questionsMap = new Map(questions.map(q => [q.id, q]));

    // 3. Dynamically import scoring logic (it's safe to use in Node)
    const { buildScoreResult } = await import('@/lib/constants/scoring');
    const { DIFFICULTIES } = await import('@/lib/constants/difficulties');

    // 4. Map the incoming attempts to the DB schema, recalculating securely
    const rowsToInsert = attempts.map(att => {
      const q = questionsMap.get(att.questionId);
      if (!q) throw new Error(`Question ${att.questionId} not found`);

      // Calculate difficulty multiplier
      const diffMultiplier = DIFFICULTIES[q.difficulty as keyof typeof DIFFICULTIES]?.xpMultiplier || 1.0;

      // RE-CALCULATE EVERYTHING SECURELY ON SERVER
      const secureScore = buildScoreResult(
        att.userGuess,
        q.reference_answer,
        diffMultiplier,
        att.usedHint || false
      );

      return {
        user_id: session.user.id,
        question_id: att.questionId,
        guess: att.userGuess,
        actual: q.reference_answer,
        factor: secureScore.factor,
        score_classification: secureScore.classification,
        log_distance: secureScore.logDistance,
        xp_earned: secureScore.xpEarned,
        used_hint: att.usedHint || false,
        user_reasoning: att.userReasoning || null
      };
    });

    const { data: insertedRows, error } = await supabase
      .from('attempts')
      .insert(rowsToInsert)
      .select('id');

    if (error) throw error;

    return NextResponse.json({ success: true, processed: rowsToInsert.length, attempts: insertedRows });
  } catch (err: any) {
    console.error('API Attempts Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { attempt_id, reasoning } = await request.json();
    if (!attempt_id || !reasoning) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { error } = await supabase
      .from('attempts')
      .update({ user_reasoning: reasoning })
      .eq('id', attempt_id)
      .eq('user_id', session.user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
