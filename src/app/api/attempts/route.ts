import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Ensure user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { attempts } = body;

    if (!attempts || !Array.isArray(attempts)) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    if (attempts.length === 0) {
      return NextResponse.json(
        { error: 'No attempts provided' },
        { status: 400 }
      );
    }

    // 1. Collect all unique question IDs
    const questionIds = Array.from(
      new Set(
        attempts
          .map((attempt: any) => attempt.questionId)
          .filter(Boolean)
      )
    );

    if (questionIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid question IDs provided' },
        { status: 400 }
      );
    }

    // 2. Fetch the actual answers and difficulty
    //    from the database.
    const {
      data: questions,
      error: questionError,
    } = await supabase
      .from('questions')
      .select('id, reference_answer, difficulty')
      .in('id', questionIds);

    if (questionError) {
      throw questionError;
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Questions not found' },
        { status: 404 }
      );
    }

    const questionsMap = new Map(
      questions.map((question) => [
        question.id,
        question,
      ])
    );

    // 3. Import scoring logic
    const { buildScoreResult } = await import(
      '@/lib/constants/scoring'
    );

    const { DIFFICULTIES } = await import(
      '@/lib/constants/difficulties'
    );

    // 4. Recalculate everything securely on the server
    const rowsToInsert = attempts.map((attempt: any) => {
      const question = questionsMap.get(
        attempt.questionId
      );

      if (!question) {
        throw new Error(
          `Question ${attempt.questionId} not found`
        );
      }

      const difficulty =
        DIFFICULTIES[
          question.difficulty as keyof typeof DIFFICULTIES
        ];

      const diffMultiplier =
        difficulty?.xpMultiplier ?? 1.0;

      const secureScore = buildScoreResult(
        attempt.userGuess,
        question.reference_answer,
        diffMultiplier,
        attempt.usedHint || false
      );

      return {
        user_id: session.user.id,
        question_id: attempt.questionId,
        guess: attempt.userGuess,
        actual: question.reference_answer,
        factor: secureScore.factor,
        score_classification:
          secureScore.classification,
        log_distance: secureScore.logDistance,
        xp_earned: secureScore.xpEarned,
        used_hint: attempt.usedHint || false,
      };
    });

    // 5. Insert attempts
    const {
      data: insertedRows,
      error: insertError,
    } = await supabase
      .from('attempts')
      .insert(rowsToInsert)
      .select('id');

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      processed: rowsToInsert.length,
      attempts: insertedRows,
    });
  } catch (error: unknown) {
    console.error('API Attempts Error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Server error',
      },
      { status: 500 }
    );
  }
}


