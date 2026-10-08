import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function ensureActiveHost(battleId: string, currentHostId: string, requestingUserId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();
  
  // 1. Get host's last ping
  const { data: hostPlayer } = await supabaseAdmin
    .from('battle_players')
    .select('last_ping_at')
    .eq('battle_id', battleId)
    .eq('user_id', currentHostId)
    .single();

  const now = new Date().getTime();
  const hostLastPing = hostPlayer?.last_ping_at ? new Date(hostPlayer.last_ping_at).getTime() : 0;
  
  // If host is active (pinged in last 45 seconds), do not migrate
  if (now - hostLastPing < 45000) {
    return currentHostId;
  }

  // 2. Host is inactive! Migrate to the requesting user if they are a participant
  const { data: requester } = await supabaseAdmin
    .from('battle_players')
    .select('user_id')
    .eq('battle_id', battleId)
    .eq('user_id', requestingUserId)
    .single();

  if (requester) {
    await supabaseAdmin
      .from('battles')
      .update({ host_id: requestingUserId })
      .eq('id', battleId);
      
    return requestingUserId;
  }

  return currentHostId;
}
