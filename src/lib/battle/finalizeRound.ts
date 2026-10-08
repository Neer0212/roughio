import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function finalizeBattleRound(battleId: string, roundId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Lock/Mark round as revealed using optimistic concurrency if possible, or just standard update
  // To avoid race conditions, only update if status is 'guessing'
  const { data: updateRes, error: updateError } = await supabaseAdmin
    .from('battle_rounds')
    .update({ 
      status: 'revealed', 
      revealed_at: new Date().toISOString() 
    })
    .eq('id', roundId)
    .eq('status', 'guessing')
    .select()
    .single();

  // If updateRes is null/empty, it means someone else already finalized it or it's not guessing
  if (updateError || !updateRes) {
    return false; // Already finalized or error
  }

  // 2. Tally scores from existing guesses
  // Note: we only aggregate scores that were actually submitted
  const { data: allGuesses } = await supabaseAdmin
    .from('battle_guesses')
    .select('user_id, points_awarded')
    .eq('round_id', roundId);
    
  if (allGuesses && allGuesses.length > 0) {
    for (const g of allGuesses) {
      // Update cumulative scores
      const { data: bp } = await supabaseAdmin
        .from('battle_players')
        .select('score')
        .eq('battle_id', battleId)
        .eq('user_id', g.user_id)
        .single();
        
      if (bp) {
        await supabaseAdmin
          .from('battle_players')
          .update({ score: bp.score + g.points_awarded })
          .eq('battle_id', battleId)
          .eq('user_id', g.user_id);
      }
    }
  }

  return true;
}
