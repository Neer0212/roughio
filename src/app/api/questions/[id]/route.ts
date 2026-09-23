import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: 'Missing question ID' }, { status: 400 });
    }

    const { data: q, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !q) {
      console.error('Error fetching specific question:', error);
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Convert snake_case from DB to camelCase for the frontend
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
  } catch (err) {
    console.error('Server error fetching question:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
