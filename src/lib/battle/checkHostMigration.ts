import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function ensureActiveHost(battleId: string, currentHostId: string, requestingUserId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();

  // Try database-level atomic host claim first
  try {
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('claim_battle_host_atomic', {
      p_battle_id: battleId,
      p_user_id: requestingUserId,
    });
    if (!rpcError && rpcResult && rpcResult.success) {
      return rpcResult.host_id;
    }
    if (!rpcError && rpcResult && !rpcResult.success) {
      return currentHostId;
    }
  } catch {
    // Fallback in environments where RPC is not yet registered
  }

  // 1. Get host's last ping
  const { data: hostPlayer } = await supabaseAdmin
    .from('battle_players')
    .select('last_ping_at')
    .eq('battle_id', battleId)
    .eq('user_id', currentHostId)
    .maybeSingle();

  const now = Date.now();
  const hostLastPing = hostPlayer?.last_ping_at ? new Date(hostPlayer.last_ping_at).getTime() : 0;
  
  // If host is active (pinged in last 45 seconds), do not migrate
  if (hostLastPing > 0 && now - hostLastPing <= 45000) {
    return currentHostId;
  }

  // 2. Host is inactive! Migrate to the requesting user if they are a participant
  const { data: requester } = await supabaseAdmin
    .from('battle_players')
    .select('user_id')
    .eq('battle_id', battleId)
    .eq('user_id', requestingUserId)
    .maybeSingle();

  if (requester) {
    await supabaseAdmin
      .from('battles')
      .update({ host_id: requestingUserId })
      .eq('id', battleId);
      
    return requestingUserId;
  }

  return currentHostId;
}
