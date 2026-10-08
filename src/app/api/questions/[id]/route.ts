import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing question ID' }, { status: 400 });
    }

    const { data: q, error } = await supabaseAdmin
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
      id: q.id,
      text: q.text,
      unit: q.unit,
      unitPlural: q.unit_plural,
      categoryId: q.category_id,
      difficulty: q.difficulty,
      hint: q.hint,
      sourceName: q.source_name,
      referencePeriod: q.reference_period,
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
