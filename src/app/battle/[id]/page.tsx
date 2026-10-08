'use client';

import { useEffect, useState, useRef } from 'react';
import { useBattle } from '@/lib/hooks/useBattle';
import { Loader2, Users, Trophy, ArrowRight, Play, Check, Brain } from 'lucide-react';
import { NumericInput } from '@/components/game/NumericInput';
import { parseNumber, formatLarge } from '@/lib/utils/number-parser';
import { SCORE_COLORS, SCORE_LABELS } from '@/lib/constants/scoring';
import { useAuth } from '@/lib/hooks/useAuth';
import { BattleCountdown } from '@/components/game/BattleCountdown';
import { BATTLE_ROUND_TIMEOUT_SECONDS } from '@/lib/constants/battle';

export default function BattleRoom({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { battle, players, rounds, guesses, isLoading, error, isHost, startGame, submitGuess, nextRound, refresh } = useBattle(params.id);
  
  const [guessInput, setGuessInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI State
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const aiRoundLock = useRef<string | null>(null);
  
  const parsedGuess = parseNumber(guessInput);
  
  const currentRound = battle ? rounds.find(r => r.round_number === battle.current_round) : null;
  const myGuess = guesses.find(g => g.user_id === user?.id);

  useEffect(() => {
    if (!currentRound || currentRound.status !== 'revealed' || !currentRound.question?.reference_answer) {
      return;
    }

    if (aiRoundLock.current === currentRound.id) {
      return;
    }
    
    aiRoundLock.current = currentRound.id;
    setAiFeedback(null);
    setFeedbackError(false);
    setIsGeneratingFeedback(true);

    const question = currentRound.question;
    
    // Construct player estimates summary
    const playerSummaries = guesses.map(g => {
      const player = players.find(p => p.user_id === g.user_id);
      const name = player?.email || 'Unknown Player';
      return `${name}: estimated ${g.guess} (factor: ${g.factor}x, points: ${g.points_awarded})`;
    }).join('\\n');

    const prompt = `You are the post-round analysis system for Roughio, an estimation game.

Both players have already submitted their estimates and the round result has already been revealed.

Question:
${question.text}

Unit:
${question.unit}

Reference answer:
${question.reference_answer}

Player estimates:
${playerSummaries}

Give a short comparative observation.

Rules:
- The round is already complete.
- Do not determine or change the winner.
- Do not recalculate official scores.
- Do not invent assumptions that are not supported.
- Explain the magnitude of the estimates relative to the reference value.
- If useful, mention whether an estimate was above or below the reference.
- Keep the response to 1-3 sentences.
- Be factual and concise.
- Do not use motivational filler.
- Do not repeat the entire question.`;

    fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('AI API failed');
        return res.json();
      })
      .then((data) => {
        if (data.response) {
          setAiFeedback(data.response);
        } else {
          setFeedbackError(true);
        }
      })
      .catch((err) => {
        console.error('AI Battle Feedback error:', err);
        setFeedbackError(true);
      })
      .finally(() => {
        setIsGeneratingFeedback(false);
      });
  }, [currentRound, guesses, players]);
  
  const handleStart = async () => {
    setIsSubmitting(true);
    await startGame();
    setIsSubmitting(false);
  };
  
  const handleSubmit = async () => {
    if (parsedGuess.value && !isSubmitting) {
      setIsSubmitting(true);
      await submitGuess(currentRound!.id, parsedGuess.value);
      setIsSubmitting(false);
    }
  };
  
  const handleNext = async () => {
    setIsSubmitting(true);
    await nextRound();
    setIsSubmitting(false);
    setGuessInput(''); // reset
  };

  if (isLoading && !battle) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold mb-2 text-destructive">Error</h2>
        <p className="text-text-secondary">{error || 'Battle not found'}</p>
      </div>
    );
  }

  // STATUS: WAITING LOBBY
  if (battle.status === 'waiting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full">
        <div className="bg-surface w-full rounded-[2.5rem] p-8 md:p-12 border border-border shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-32 bg-accent/10 blur-[50px] pointer-events-none" />
          
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">Match Code</h2>
          <div className="text-6xl md:text-8xl font-black font-mono tracking-widest mb-12 text-text-primary">
            {battle.short_code}
          </div>
          
          <div className="bg-elevated rounded-2xl p-6 mb-8 border border-border/50 text-left">
            <h3 className="flex items-center gap-2 font-bold text-lg mb-4">
              <Users className="text-accent" /> Players ({players.length})
            </h3>
            <ul className="space-y-3">
              {players.map((p) => (
                <li key={p.user_id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
                  <span className="font-medium truncate">{p.email}</span>
                  {p.user_id === battle.host_id && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded uppercase font-bold">Host</span>}
                </li>
              ))}
            </ul>
          </div>
          
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={isSubmitting || players.length < 1}
              className="w-full py-5 rounded-2xl font-bold text-xl bg-accent text-background shadow-[0_4px_0_rgb(10,135,95)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
              Start Battle
            </button>
          ) : (
            <div className="py-5 rounded-2xl font-bold text-lg bg-surface text-text-secondary border-2 border-border flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              Waiting for host to start...
            </div>
          )}
        </div>
      </div>
    );
  }

  // STATUS: FINISHED (PODIUM)
  if (battle.status === 'finished') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full">
        <div className="bg-surface w-full rounded-[2.5rem] p-8 md:p-12 border border-border shadow-2xl text-center">
          <div className="w-24 h-24 bg-accent/20 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-extrabold mb-2">Final Results</h2>
          <p className="text-text-secondary mb-12">The battle is over!</p>
          
          <div className="space-y-4 mb-8 text-left">
            {sortedPlayers.map((p, i) => (
              <div key={p.user_id} className={`flex items-center justify-between p-5 rounded-2xl border ${i === 0 ? 'bg-accent/10 border-accent/30' : 'bg-elevated border-border'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${i === 0 ? 'bg-accent text-background' : 'bg-surface text-text-secondary'}`}>
                    #{i + 1}
                  </div>
                  <span className="font-bold text-lg">{p.email}</span>
                </div>
                <span className="text-2xl font-mono font-bold text-accent">{p.score} pts</span>
              </div>
            ))}
          </div>
          
          <a href="/battle" className="inline-flex py-4 px-8 rounded-xl font-bold text-lg bg-surface text-text-primary border-2 border-border hover:bg-elevated transition-colors">
            Exit Battle
          </a>
        </div>
      </div>
    );
  }

  // STATUS: PLAYING
  if (!currentRound || !currentRound.question) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const question = currentRound.question;

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-8">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8 bg-surface p-4 rounded-2xl border border-border">
        <div className="font-bold text-text-secondary uppercase tracking-widest">
          Round {battle.current_round} <span className="opacity-50">/ {battle.max_rounds}</span>
        </div>
        {currentRound?.status === 'guessing' && currentRound?.started_at && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-widest text-text-secondary">Time</span>
            <BattleCountdown 
              startedAt={currentRound.started_at} 
              timeoutSeconds={BATTLE_ROUND_TIMEOUT_SECONDS} 
              onExpire={refresh} 
            />
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="text-sm">Players: <span className="font-bold">{guesses.length}/{players.length}</span> guessed</div>
        </div>
      </div>
      
      {/* Question */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight text-text-primary drop-shadow-sm mb-6">
          {question.text}
        </h1>
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-elevated border border-border shadow-inner">
          <span className="text-text-secondary text-sm font-bold uppercase tracking-widest">Unit</span>
          <span className="font-mono font-bold text-accent text-lg">{question.unit}</span>
        </div>
      </div>

      {currentRound.status === 'guessing' ? (
        <div className="max-w-xl mx-auto w-full">
          {myGuess ? (
            <div className="bg-surface rounded-2xl p-12 text-center border border-border shadow-lg">
              <Check className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Guess Locked In</h2>
              <p className="text-text-secondary font-mono text-xl mb-6">{formatLarge(myGuess.guess)}</p>
              <div className="flex items-center justify-center gap-3 text-text-secondary text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for other players...
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <NumericInput
                value={guessInput}
                onChange={setGuessInput}
                onSubmit={handleSubmit}
                disabled={isSubmitting}
                error={parsedGuess.error}
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !parsedGuess.value}
                className="w-full py-5 rounded-2xl font-bold text-xl bg-accent text-background shadow-[0_4px_0_rgb(10,135,95)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Lock In Guess'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto w-full">
          {/* Revealed State */}
          <div className="bg-surface rounded-3xl p-8 border border-border shadow-2xl mb-8">
            <div className="text-center mb-10">
              <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-2">Actual Answer</h2>
              <div className="text-5xl font-mono font-black text-accent">{formatLarge(question.reference_answer)}</div>
            </div>
            
            <div className="space-y-4">
              {guesses.map(g => {
                const player = players.find(p => p.user_id === g.user_id);
                // factor and points should be populated since round is revealed
                return (
                  <div key={g.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-elevated rounded-2xl border border-border gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center font-bold text-xs text-text-secondary">
                        {player?.email?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold">{player?.email}</span>
                      {g.user_id === user?.id && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded font-bold">You</span>}
                    </div>
                    <div className="flex items-center gap-6 justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <div className="text-sm text-text-secondary font-bold uppercase">Guess</div>
                        <div className="font-mono font-bold text-lg">{formatLarge(g.guess)}</div>
                      </div>
                      <div className="text-left sm:text-right w-24">
                        <div className="text-sm text-text-secondary font-bold uppercase">Factor</div>
                        <div className="font-mono font-bold text-lg">{g.factor ? `${g.factor.toFixed(2)}x` : '-'}</div>
                      </div>
                      <div className="text-right w-20">
                        <div className="font-bold text-accent">+{g.points_awarded || 0} pts</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Comparative Analysis */}
          <div className="bg-surface/50 rounded-2xl p-6 border border-border mb-8 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Brain className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <h3 className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest text-accent mb-3">
                <Brain className="w-5 h-5" />
                AI ROUND ANALYSIS
              </h3>
              
              {isGeneratingFeedback ? (
                <div className="flex items-center gap-3 text-text-secondary py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm">Generating analysis...</span>
                </div>
              ) : feedbackError ? (
                <div className="text-text-secondary text-sm italic py-2">
                  AI analysis is temporarily unavailable.
                </div>
              ) : aiFeedback ? (
                <div className="text-text-primary leading-relaxed">
                  {aiFeedback}
                </div>
              ) : (
                <div className="text-text-secondary text-sm py-2">
                  Waiting for analysis...
                </div>
              )}
            </div>
          </div>
          
          {isHost ? (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="w-full max-w-sm mx-auto py-4 rounded-xl font-bold text-lg bg-accent text-background shadow-[0_4px_0_rgb(10,135,95)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Next Round'} <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="text-center text-text-secondary font-bold py-4">
              Waiting for host to proceed...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
