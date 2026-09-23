import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const difficulty = searchParams.get('difficulty');
  const excludeStr = searchParams.get('exclude');
  const exclude = excludeStr ? excludeStr.split(',') : [];

  const stageId = searchParams.get('stage');

  const supabase = createClient();
  
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

  const { data, error } = await supabase.rpc('get_random_question_v2', {
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

  // Convert snake_case from DB to camelCase for the frontend
  const q = data[0];
  const question = {
    ...q,
    referenceAnswer: q.reference_answer,
    unitPlural: q.unit_plural,
    estimationApproach: q.estimation_approach,
    sourceName: q.source_name,
    referencePeriod: q.reference_period,
    uncertaintyLow: q.uncertainty_low,
    uncertaintyHigh: q.uncertainty_high,
    isAiGenerated: q.is_ai_generated,
    isCommunity: q.is_community,
    createdAt: q.created_at
  };

  return NextResponse.json(question);
}
