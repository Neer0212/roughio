import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export interface BattlePlayer {
  user_id: string;
  email: string; // we might need to fetch this
  score: number;
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
          email: p.profiles?.email || 'Unknown'
        })));
      }
      
      // Fetch Rounds with Questions
      const { data: rData } = await supabase
        .from('battle_rounds')
        .select('*, questions(*)')
        .eq('battle_id', battleId)
        .order('round_number', { ascending: true });
        
      if (rData) {
        setRounds(rData.map(r => ({
          id: r.id,
          round_number: r.round_number,
          status: r.status,
          question: r.questions
        })));
      }
      
      // Fetch Guesses for current round
      if (bData && rData) {
        const currentRoundId = rData[bData.current_round - 1]?.id;
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_guesses' }, fetchState)
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, fetchState, supabase]);

  const startGame = async () => {
    await fetch('/api/battles/start', {
      method: 'POST',
      body: JSON.stringify({ battleId })
    });
  };

  const submitGuess = async (roundId: string, guess: number) => {
    await fetch('/api/battles/submit', {
      method: 'POST',
      body: JSON.stringify({ battleId, roundId, guess })
    });
  };

  const nextRound = async () => {
    await fetch('/api/battles/next', {
      method: 'POST',
      body: JSON.stringify({ battleId })
    });
  };

  return {
    battle,
    players,
    rounds,
    guesses,
    isLoading,
    error,
    isHost: battle?.host_id === user?.id,
    startGame,
    submitGuess,
    nextRound
  };
}
