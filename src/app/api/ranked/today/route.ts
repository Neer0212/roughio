import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    const today = new Date().toISOString().split('T')[0];

    // Check if challenge exists
    let challenge = null;
    const { data: existingChallenge } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('date', today)
      .maybeSingle();
      
    challenge = existingChallenge;

    if (!challenge) {
      // Lazy Initialize today's challenge
      const { data: allQuestions, error: qError } = await supabaseAdmin
        .from('questions')
        .select('id')
        .eq('status', 'active')
        .limit(50);
        
      if (qError || !allQuestions) throw new Error('Failed to fetch questions');

      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3).map(q => q.id);

      // Insert
      const { data: newChallenge, error: insertError } = await supabaseAdmin
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
          
        if (retryChallenge) {
          challenge = retryChallenge;
        } else {
          throw insertError;
        }
      } else {
        challenge = newChallenge;
      }
    }
    
    // Fetch the actual questions securely and strip the answer
    const { data: rawQuestions } = await supabaseAdmin
      .from('questions')
      .select('id, text, unit')
      .in('id', challenge.question_ids);
      
    // Sort them in the exact order of question_ids
    const sortedQuestions = challenge.question_ids.map((id: string) => 
      rawQuestions?.find(q => q.id === id)
    ).filter(Boolean);

    return NextResponse.json({ success: true, challenge, questions: sortedQuestions });
  } catch (err: any) {
    console.error('API Ranked Today Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

