import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRandomAiQuestion } from '@/lib/ai/question-generator';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const difficulty = searchParams.get('difficulty');
  const excludeStr = searchParams.get('exclude');
  const exclude = excludeStr ? excludeStr.split(',') : [];
  const stageId = searchParams.get('stage');
  const preferAi = searchParams.get('ai') === 'true' || searchParams.get('mode') === 'ai';

  let categories: string[] | null = category && category !== 'all' ? [category] : null;
  let difficulties: string[] | null = difficulty && difficulty !== 'all' ? [difficulty] : null;

  if (stageId) {
    const { LADDER_STAGES } = await import('@/lib/constants/ladder');
    const stage = LADDER_STAGES.find(s => s.id === stageId);
    if (stage) {
      categories = stage.categories;
      difficulties = stage.difficulties;
    }
  }

  // 1. If AI questions are explicitly preferred or requested, try AI pool first
  if (preferAi && !stageId) {
    try {
      const targetCategory = categories && categories.length === 1 ? categories[0] : null;
      const targetDifficulty = difficulties && difficulties.length === 1 ? difficulties[0] : null;
      const aiQuestion = await getRandomAiQuestion({
        category: targetCategory,
        difficulty: targetDifficulty,
        exclude,
      });

      if (aiQuestion) {
        return NextResponse.json({
          id: aiQuestion.id,
          text: aiQuestion.text,
          unit: aiQuestion.unit,
          unitPlural: aiQuestion.unit_plural,
          category: aiQuestion.category || aiQuestion.category_id,
          categoryId: aiQuestion.category_id || aiQuestion.category,
          difficulty: aiQuestion.difficulty,
          hint: aiQuestion.hint,
          sourceName: aiQuestion.source_name,
          referencePeriod: aiQuestion.reference_period,
          isAiGenerated: true,
          isCommunity: Boolean(aiQuestion.is_community),
          createdAt: aiQuestion.created_at,
        });
      }
    } catch (aiErr) {
      console.warn('AI question retrieval failed, gracefully falling back to question bank:', aiErr);
    }
  }

  // 2. Query question bank via Supabase RPC (includes active persisted AI questions and static questions)
  const { data, error } = await supabaseAdmin.rpc('get_random_question_v2', {
    p_categories: categories,
    p_difficulties: difficulties,
    p_exclude: exclude
  });

  if (error) {
    console.error('Supabase RPC Error:', error);
    return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No questions found' }, { status: 404 });
  }

  // Strip secure fields for the client
  const q = data[0];
  const question = {
    id: q.id,
    text: q.text,
    unit: q.unit,
    unitPlural: q.unit_plural,
    category: q.category || q.category_id,
    categoryId: q.category_id || q.category,
    difficulty: q.difficulty,
    hint: q.hint,
    sourceName: q.source_name,
    referencePeriod: q.reference_period,
    isAiGenerated: Boolean(q.is_ai_generated),
    isCommunity: Boolean(q.is_community),
    createdAt: q.created_at
  };

  return NextResponse.json(question);
}
