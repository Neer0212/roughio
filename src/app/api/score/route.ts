import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildScoreResult } from '@/lib/constants/scoring';
import { DIFFICULTIES } from '@/lib/constants/difficulties';

export async function POST(request: Request) {
  try {
    const { questionId, guess, hintUsed } = await request.json();

    if (!questionId || typeof guess !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { data: q, error } = await supabaseAdmin
      .from('questions')
      .select('id, reference_answer, difficulty, explanation, estimation_approach')
      .eq('id', questionId)
      .single();

    if (error || !q) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const diffMultiplier = DIFFICULTIES[q.difficulty as keyof typeof DIFFICULTIES]?.xpMultiplier || 1.0;
    
    const secureScore = buildScoreResult(
      guess,
      q.reference_answer,
      diffMultiplier,
      hintUsed || false
    );

    const isOverestimate = guess > q.reference_answer;
    const difference = Math.abs(guess - q.reference_answer);

    const achievements: string[] = [];
    if (secureScore.factor <= 1.1 && !hintUsed) achievements.push("🎯 The Sniper");
    if (secureScore.factor >= 1000) achievements.push("🚀 Astronomical");
    if (difference === 0) achievements.push("🤯 Bullseye");
    if (isOverestimate && secureScore.factor > 10) achievements.push("📈 Too Optimistic");

    return NextResponse.json({
      success: true,
      result: {
        guess,
        referenceAnswer: q.reference_answer,
        factor: secureScore.factor,
        classification: secureScore.classification,
        difference,
        isOverestimate,
        explanation: q.explanation,
        estimationApproach: q.estimation_approach,
        achievements,
        xpEarned: secureScore.xpEarned
      }
    });
  } catch (err: any) {
    console.error('API Score Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
