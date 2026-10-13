import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export interface BattlePlayer {
  user_id: string;
  email: string; // we might need to fetch this
  score: number;
  last_ping_at?: string;
}

export interface BattleState {
  id: string;
  short_code: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
  current_round: number;
  max_rounds: number;
}

export interface BattleRound {
  id: string;
  round_number: number;
  status: 'guessing' | 'revealed';
  started_at?: string;
  revealed_at?: string;
  guessCount?: number;
  question: any;
}

export interface BattleGuess {
  user_id: string;
  guess: number;
  factor?: number;
  points_awarded?: number;
}

export function useBattle(battleId: string | null) {
  const supabase = createClient();
  const { user } = useAuth();
  
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [players, setPlayers] = useState<BattlePlayer[]>([]);
  const [rounds, setRounds] = useState<BattleRound[]>([]);
  const [guesses, setGuesses] = useState<BattleGuess[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!battleId) return;
    try {
      setIsLoading(true);
      // Fetch Battle
      const { data: bData } = await supabase.from('battles').select('*').eq('id', battleId).single();
      if (bData) setBattle(bData);
      
      // Fetch Players with Profiles
      const { data: pData } = await supabase
        .from('battle_players')
        .select('*, profiles(email)')
        .eq('battle_id', battleId);
        
      if (pData) {
        setPlayers(pData.map(p => ({
          user_id: p.user_id,
          score: p.score,
          email: p.profiles?.email || 'Unknown',
          last_ping_at: p.last_ping_at
        })));
      }
      
      // Fetch Rounds securely through API
      let mappedRounds: any[] = [];
      const roundsRes = await fetch(`/api/battles/rounds?id=${battleId}`);
      if (roundsRes.ok) {
        const roundsData = await roundsRes.json();
        if (roundsData.success && roundsData.rounds) {
          mappedRounds = roundsData.rounds;

          // Fetch reference answers securely only for revealed rounds
          const revealedRoundIds = mappedRounds.filter((r: any) => r.status === 'revealed').map((r: any) => r.id);
        
          if (revealedRoundIds.length > 0) {
            try {
              const res = await fetch('/api/battles/revealed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ battleId, roundIds: revealedRoundIds })
              });
              const { success, answers } = await res.json();
              
              if (success && answers) {
                mappedRounds.forEach(r => {
                  if (answers[r.id] !== undefined && r.question) {
                    r.question.reference_answer = answers[r.id];
                  }
                });
              }
            } catch (err) {
              console.error('Failed to fetch revealed answers:', err);
            }
          }
          
          setRounds(mappedRounds);
        }
      }
      
      // Fetch Guesses for current round
      if (bData && mappedRounds.length > 0) {
        const currentRoundId = mappedRounds[bData.current_round - 1]?.id;
        if (currentRoundId) {
          const { data: gData } = await supabase
            .from('battle_guesses')
            .select('*')
            .eq('round_id', currentRoundId);
          if (gData) setGuesses(gData);
        }
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [battleId, supabase]);

  useEffect(() => {
    if (!battleId) return;
    fetchState();
    
    // Subscribe to changes
    const channel = supabase.channel(`battle:${battleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battles', filter: `id=eq.${battleId}` }, fetchState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_players', filter: `battle_id=eq.${battleId}` }, fetchState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rounds', filter: `battle_id=eq.${battleId}` }, fetchState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_guesses', filter: `battle_id=eq.${battleId}` }, fetchState)
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, fetchState, supabase]);

  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Heartbeat
  useEffect(() => {
    if (!battleId) return;
    const ping = () => fetch('/api/battles/ping', { method: 'POST', body: JSON.stringify({ battleId }) });
    ping();
    const interval = setInterval(ping, 15000);
    return () => clearInterval(interval);
  }, [battleId]);

  const isHost = battle?.host_id === user?.id;
  const hostPlayer = players.find(p => p.user_id === battle?.host_id);
  const hostLastPingMs = hostPlayer?.last_ping_at ? new Date(hostPlayer.last_ping_at).getTime() : 0;
  const isHostStale = !isHost && (hostLastPingMs === 0 || (nowMs !== null && nowMs - hostLastPingMs > 45000));

  const startGame = async () => {
    const res = await fetch('/api/battles/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ battleId })
    });
    await fetchState();
    return res;
  };

  const submitGuess = async (roundId: string, guess: number) => {
    await fetch('/api/battles/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ battleId, roundId, guess })
    });
  };

  const nextRound = async (expectedRound?: number) => {
    const res = await fetch('/api/battles/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        battleId,
        expectedRound: typeof expectedRound === 'number' ? expectedRound : (battle?.current_round)
      })
    });
    await fetchState();
    return res;
  };

  const claimHost = async () => {
    const res = await fetch('/api/battles/claim-host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ battleId })
    });
    if (res.ok) {
      await fetchState();
    }
    return res;
  };

  return { refresh: fetchState,
    battle,
    players,
    rounds,
    guesses,
    isLoading,
    error,
    isHost,
    isHostStale,
    startGame,
    submitGuess,
    nextRound,
    claimHost
  };
}
