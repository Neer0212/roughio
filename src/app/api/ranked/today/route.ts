import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    
    const today = new Date().toISOString().split('T')[0];

    // Check if challenge exists
    const { data: challenge, error: challengeError } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (challenge) {
      return NextResponse.json({ success: true, challenge });
    }

    // Lazy Initialize today's challenge
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id')
      .eq('status', 'active')
      .limit(50);
      
    if (qError || !questions) throw new Error('Failed to fetch questions');

    const shuffled = questions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3).map(q => q.id);

    // Insert
    const { data: newChallenge, error: insertError } = await supabase
      .from('daily_challenges')
      .insert({
        date: today,
        question_ids: selected
      })
      .select()
      .single();

    if (insertError) {
      // Possible race condition where another user generated it simultaneously
      const { data: retryChallenge } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('date', today)
        .single();
        
      if (retryChallenge) return NextResponse.json({ success: true, challenge: retryChallenge });
      throw insertError;
    }

    return NextResponse.json({ success: true, challenge: newChallenge });
  } catch (err: any) {
    console.error('API Ranked Today Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
