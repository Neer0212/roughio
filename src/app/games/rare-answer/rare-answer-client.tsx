// src/app/games/rare-answer/rare-answer-client.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Trophy,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Flame,
  Send,
  Loader2,
  BookOpen,
  Info,
} from 'lucide-react';
import { BackButton } from '@/components/layout/BackButton';
import { formatIndianNumber } from '@/lib/utils/number-parser';
import {
  getRandomSessionPrompts,
  getPromptById,
} from '@/lib/games/rare-answer/prompts';
import {
  checkLocalAnswer,
  createUnrecognizedResult,
  getTierInfo,
} from '@/lib/games/rare-answer/validator';
import type {
  RareAnswerPrompt,
  RareAnswerPhase,
  ValidationResult,
  RoundResult,
  RareAnswerSessionStats,
} from '@/lib/games/rare-answer/types';

const STORAGE_KEY = 'roughio_rare_answer_stats_v1';
const TOTAL_ROUNDS = 5;

export function RareAnswerClient() {
  const [phase, setPhase] = useState<RareAnswerPhase>('ready');
  const [sessionPrompts, setSessionPrompts] = useState<RareAnswerPrompt[]>([]);
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [currentValidation, setCurrentValidation] = useState<ValidationResult | null>(null);
  const [roundsHistory, setRoundsHistory] = useState<RoundResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<RareAnswerSessionStats>(() => {
    if (typeof window === 'undefined') {
      return { gamesPlayed: 0, highScore: 0, bestRoundScore: 0, totalScore: 0 };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { gamesPlayed: 0, highScore: 0, bestRoundScore: 0, totalScore: 0 };
  });

  // Focus input on entering question phase
  useEffect(() => {
    if (phase === 'question' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, roundIndex]);

  // Save session stats to localStorage
  const saveSessionStats = useCallback((finalScore: number, bestRound: number) => {
    setStats((prev) => {
      const isNewBest = finalScore > prev.highScore;
      setIsNewHighScore(isNewBest);
      const nextStats: RareAnswerSessionStats = {
        gamesPlayed: prev.gamesPlayed + 1,
        highScore: Math.max(prev.highScore, finalScore),
        bestRoundScore: Math.max(prev.bestRoundScore, bestRound),
        totalScore: prev.totalScore + finalScore,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
      } catch {}
      return nextStats;
    });
  }, []);

  // Start new 5-round game
  const startNewSession = useCallback(() => {
    const prompts = getRandomSessionPrompts(TOTAL_ROUNDS);
    setSessionPrompts(prompts);
    setRoundIndex(0);
    setCurrentGuess('');
    setCurrentValidation(null);
    setRoundsHistory([]);
    setInputError(null);
    setIsNewHighScore(false);
    setPhase('question');
  }, []);

  const currentPrompt = sessionPrompts[roundIndex];

  // Submit answer
  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPrompt || isSubmitting) return;

    const trimmed = currentGuess.trim();
    if (!trimmed) {
      setInputError('Please type an answer before submitting.');
      return;
    }

    setInputError(null);
    setIsSubmitting(true);
    setPhase('evaluating');

    try {
      // 1. Check local dictionary first
      const localResult = checkLocalAnswer(currentPrompt, trimmed);
      if (localResult !== null) {
        setCurrentValidation(localResult);
        setRoundsHistory((prev) => [
          ...prev,
          {
            roundNumber: roundIndex + 1,
            prompt: currentPrompt,
            userGuess: trimmed,
            validation: localResult,
          },
        ]);
        setPhase('reveal');
        setIsSubmitting(false);
        return;
      }

      // 2. Query validation API for creative / unlisted answers
      const res = await fetch('/api/games/rare-answer/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: currentPrompt.id,
          answer: trimmed,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const result: ValidationResult =
          data?.result || createUnrecognizedResult(currentPrompt.id, trimmed);
        setCurrentValidation(result);
        setRoundsHistory((prev) => [
          ...prev,
          {
            roundNumber: roundIndex + 1,
            prompt: currentPrompt,
            userGuess: trimmed,
            validation: result,
          },
        ]);
      } else {
        const fallback = createUnrecognizedResult(currentPrompt.id, trimmed);
        setCurrentValidation(fallback);
        setRoundsHistory((prev) => [
          ...prev,
          {
            roundNumber: roundIndex + 1,
            prompt: currentPrompt,
            userGuess: trimmed,
            validation: fallback,
          },
        ]);
      }
    } catch {
      const fallback = createUnrecognizedResult(currentPrompt.id, trimmed);
      setCurrentValidation(fallback);
      setRoundsHistory((prev) => [
        ...prev,
        {
          roundNumber: roundIndex + 1,
          prompt: currentPrompt,
          userGuess: trimmed,
          validation: fallback,
        },
      ]);
    } finally {
      setIsSubmitting(false);
      setPhase('reveal');
    }
  };

  // Advance to next round or game over
  const handleNextRound = useCallback(() => {
    if (roundIndex + 1 < TOTAL_ROUNDS) {
      setRoundIndex((prev) => prev + 1);
      setCurrentGuess('');
      setCurrentValidation(null);
      setInputError(null);
      setPhase('question');
    } else {
      // Game over
      const allRounds = [...roundsHistory];
      const totalScore = allRounds.reduce((acc, r) => acc + r.validation.score, 0);
      const bestRound = Math.max(0, ...allRounds.map((r) => r.validation.score));
      saveSessionStats(totalScore, bestRound);
      setPhase('game_over');
    }
  }, [roundIndex, roundsHistory, saveSessionStats]);

  const totalSessionScore = roundsHistory.reduce((sum, r) => sum + r.validation.score, 0);

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex flex-col items-center px-4 py-8">
      {/* Header Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#B9A0FF]/20 text-[#B9A0FF] border border-[#B9A0FF]/30">
                <Sparkles className="w-4 h-4" />
              </span>
              Rare Answer
            </h1>
            <p className="text-xs text-white/50">Arcade Trivia Depth & Obscurity Recall</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/80">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Best: {formatIndianNumber(stats.highScore)}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl flex-1 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {/* PHASE: READY / INSTRUCTION */}
          {phase === 'ready' && (
            <motion.div
              key="ready-phase"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full flex flex-col items-center text-center py-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#B9A0FF] to-[#8C6CEE] flex items-center justify-center shadow-xl shadow-[#B9A0FF]/20 mb-6 border border-white/20">
                <Sparkles className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                Think Beyond the Obvious
              </h2>
              <p className="text-white/60 text-sm max-w-md mb-8 leading-relaxed">
                You will be given prompts with multiple valid answers. Common answers earn basic
                points — find obscure, valid gems to maximize your rarity score!
              </p>

              {/* Tier Scoring Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full mb-8 text-left">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-lg block mb-1">💎</span>
                  <div className="text-xs font-bold text-purple-400">Ultra Rare</div>
                  <div className="text-sm font-extrabold text-white font-mono mt-0.5">950 pts</div>
                  <div className="text-[10px] text-white/40 mt-1 leading-tight">Niche & obscure valid answers</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-lg block mb-1">⚡</span>
                  <div className="text-xs font-bold text-amber-400">Uncommon</div>
                  <div className="text-sm font-extrabold text-white font-mono mt-0.5">650 pts</div>
                  <div className="text-[10px] text-white/40 mt-1 leading-tight">Clever secondary choices</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-lg block mb-1">⚪</span>
                  <div className="text-xs font-bold text-blue-400">Common</div>
                  <div className="text-sm font-extrabold text-white font-mono mt-0.5">350 pts</div>
                  <div className="text-[10px] text-white/40 mt-1 leading-tight">Top-of-mind obvious answers</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-lg block mb-1">❌</span>
                  <div className="text-xs font-bold text-rose-400">Invalid</div>
                  <div className="text-sm font-extrabold text-white font-mono mt-0.5">0 pts</div>
                  <div className="text-[10px] text-white/40 mt-1 leading-tight">Rule violations or incorrect facts</div>
                </div>
              </div>

              {/* Lifetime Stats */}
              {stats.gamesPlayed > 0 && (
                <div className="w-full flex items-center justify-around py-3 px-4 rounded-xl bg-white/[0.02] border border-white/10 mb-8">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-white/40 block">Games</span>
                    <span className="text-base font-bold text-white">{stats.gamesPlayed}</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-white/40 block">High Score</span>
                    <span className="text-base font-bold text-amber-400 font-mono">
                      {formatIndianNumber(stats.highScore)}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-white/40 block">Best Round</span>
                    <span className="text-base font-bold text-[#B9A0FF] font-mono">
                      +{formatIndianNumber(stats.bestRoundScore)}
                    </span>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={startNewSession}
                className="w-full max-w-sm py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#B9A0FF] to-[#8C6CEE] hover:brightness-110 shadow-lg shadow-[#B9A0FF]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Start Session (5 Rounds)</span>
              </button>
            </motion.div>
          )}

          {/* PHASE: QUESTION OR EVALUATING */}
          {(phase === 'question' || phase === 'evaluating') && currentPrompt && (
            <motion.div
              key="question-phase"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex flex-col items-center"
            >
              {/* Round Header */}
              <div className="w-full flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#B9A0FF]/20 text-[#B9A0FF] border border-[#B9A0FF]/30">
                    Round {roundIndex + 1} of {TOTAL_ROUNDS}
                  </span>
                  <span className="text-xs text-white/40">
                    Score: {formatIndianNumber(totalSessionScore)}
                  </span>
                </div>

                <span className="text-xs text-white/50 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  {currentPrompt.category}
                </span>
              </div>

              {/* Prompt Card */}
              <div className="w-full p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 flex flex-col">
                <span className="text-[11px] uppercase font-bold text-[#B9A0FF] tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Prompt
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-3">
                  {currentPrompt.prompt}
                </h3>
                {currentPrompt.clarification && (
                  <p className="text-xs text-white/50 flex items-start gap-1.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                    <Info className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                    <span>{currentPrompt.clarification}</span>
                  </p>
                )}
              </div>

              {/* Answer Input Form */}
              <form onSubmit={handleSubmitAnswer} className="w-full flex flex-col gap-3">
                <div className="relative w-full">
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentGuess}
                    onChange={(e) => {
                      setCurrentGuess(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    disabled={phase === 'evaluating'}
                    placeholder="Enter an uncommon or rare answer..."
                    className="w-full py-4 pl-4 pr-12 rounded-xl bg-white/[0.05] border border-white/15 focus:border-[#B9A0FF] focus:bg-white/[0.08] text-white placeholder-white/30 text-base font-medium outline-none transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={phase === 'evaluating' || !currentGuess.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg bg-[#B9A0FF] hover:bg-[#A382FF] text-white disabled:opacity-30 disabled:hover:bg-[#B9A0FF] transition-all"
                  >
                    {phase === 'evaluating' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {inputError && (
                  <p className="text-xs text-rose-400 pl-1">{inputError}</p>
                )}

                <button
                  type="submit"
                  disabled={phase === 'evaluating' || !currentGuess.trim()}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#B9A0FF] to-[#8C6CEE] hover:brightness-110 text-white shadow-lg shadow-[#B9A0FF]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {phase === 'evaluating' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Judging Answer Validity...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Answer (Enter)</span>
                    </>
                  )}
                </button>
              </form>

              {/* Helpful Strategy Tip */}
              <p className="text-[11px] text-white/30 text-center mt-6">
                Tip: Avoid the first answer that pops into mind. Obscure valid entities score the highest!
              </p>
            </motion.div>
          )}

          {/* PHASE: REVEAL */}
          {phase === 'reveal' && currentValidation && currentPrompt && (
            <motion.div
              key="reveal-phase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full flex flex-col items-center"
            >
              {/* Verdict Banner Card */}
              <div
                className={`w-full p-6 rounded-2xl border mb-6 flex flex-col items-center text-center relative overflow-hidden ${
                  currentValidation.valid
                    ? 'bg-purple-950/20 border-purple-500/30'
                    : 'bg-rose-950/20 border-rose-500/30'
                }`}
              >
                <div className="text-3xl mb-1.5">
                  {currentValidation.valid
                    ? getTierInfo(currentValidation.tier).badge
                    : '❌'}
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full border ${
                      currentValidation.valid
                        ? 'bg-[#B9A0FF]/20 border-[#B9A0FF]/40 text-[#B9A0FF]'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {currentValidation.valid
                      ? getTierInfo(currentValidation.tier).label
                      : 'Invalid Answer'}
                  </span>
                </div>

                <h3 className="text-2xl font-extrabold text-white tracking-tight capitalize mt-1">
                  {`"${currentValidation.userGuess}"`}
                </h3>

                <p className="text-xs text-white/60 mt-2 max-w-md leading-relaxed">
                  {currentValidation.reason}
                </p>

                {currentValidation.funFact && (
                  <div className="mt-3 text-xs text-amber-300/90 bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-lg max-w-md">
                    💡 <strong>Did you know?</strong> {currentValidation.funFact}
                  </div>
                )}

                {/* Score awarded pill */}
                <div
                  className={`mt-4 px-4 py-1.5 rounded-full border font-bold text-lg flex items-center gap-1.5 ${
                    currentValidation.valid
                      ? 'bg-purple-500/15 border-purple-400/40 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>+{formatIndianNumber(currentValidation.score)} pts</span>
                </div>
              </div>

              {/* Rarity Tier Explorer / Reference Comparison */}
              <div className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/10 mb-6">
                <span className="text-[11px] uppercase font-bold text-white/40 block mb-3">
                  Tier Breakdown for this prompt
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Rare Examples */}
                  <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <span className="font-bold text-purple-300 flex items-center gap-1 mb-1">
                      <span>💎 Ultra Rare (950 pts)</span>
                    </span>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      {currentPrompt.referenceAnswers
                        .filter((a) => a.tier === 'rare')
                        .slice(0, 3)
                        .map((a) => a.canonical)
                        .join(', ') || 'Niche answers'}
                    </p>
                  </div>

                  {/* Uncommon Examples */}
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="font-bold text-amber-300 flex items-center gap-1 mb-1">
                      <span>⚡ Uncommon (650 pts)</span>
                    </span>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      {currentPrompt.referenceAnswers
                        .filter((a) => a.tier === 'uncommon')
                        .slice(0, 3)
                        .map((a) => a.canonical)
                        .join(', ') || 'Clever answers'}
                    </p>
                  </div>

                  {/* Common Examples */}
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <span className="font-bold text-blue-300 flex items-center gap-1 mb-1">
                      <span>⚪ Common (350 pts)</span>
                    </span>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      {currentPrompt.referenceAnswers
                        .filter((a) => a.tier === 'common')
                        .slice(0, 3)
                        .map((a) => a.canonical)
                        .join(', ') || 'Obvious answers'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Next Round Button */}
              <button
                onClick={handleNextRound}
                className="w-full max-w-sm py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#B9A0FF] to-[#8C6CEE] hover:brightness-110 shadow-lg shadow-[#B9A0FF]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>
                  {roundIndex + 1 < TOTAL_ROUNDS ? 'Next Round' : 'View Final Results'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* PHASE: GAME OVER / SUMMARY */}
          {phase === 'game_over' && (
            <motion.div
              key="game-over-phase"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full flex flex-col items-center"
            >
              {/* Trophy Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#B9A0FF] to-[#8C6CEE] flex items-center justify-center shadow-xl shadow-[#B9A0FF]/20 mb-3 mx-auto border border-white/20">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                {isNewHighScore && (
                  <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider inline-block mb-2">
                    🌟 New Personal Best!
                  </span>
                )}
                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                  Session Completed
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  5 prompts tested across vocabulary and recall depth
                </p>
              </div>

              {/* Main Score Box */}
              <div className="w-full grid grid-cols-3 gap-3 mb-6 text-center">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                    Total Score
                  </span>
                  <span className="text-2xl font-extrabold text-[#B9A0FF] font-mono">
                    {formatIndianNumber(totalSessionScore)}
                  </span>
                  <span className="text-[10px] text-white/30 block mt-0.5">/ 5,000 pts</span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                    Valid Answers
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {roundsHistory.filter((r) => r.validation.valid).length} / 5
                  </span>
                  <span className="text-[10px] text-white/30 block mt-0.5">accuracy</span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                    Best Round
                  </span>
                  <span className="text-2xl font-extrabold text-amber-400 font-mono">
                    +{formatIndianNumber(Math.max(0, ...roundsHistory.map((r) => r.validation.score)))}
                  </span>
                  <span className="text-[10px] text-white/30 block mt-0.5">single score</span>
                </div>
              </div>

              {/* Round-by-Round Breakdown */}
              <div className="w-full rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Round Breakdown
                  </h4>
                </div>

                <div className="divide-y divide-white/5">
                  {roundsHistory.map((r) => (
                    <div
                      key={r.roundNumber}
                      className="px-4 py-3 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 font-mono text-white/40 font-bold">
                          #{r.roundNumber}
                        </span>
                        <div>
                          <div className="font-semibold text-white truncate max-w-[200px] sm:max-w-[320px]">
                            {r.prompt.prompt}
                          </div>
                          <div className="text-[11px] text-white/50 flex items-center gap-2 mt-0.5">
                            <span>Answer: {`"${r.userGuess}"`}</span>
                            <span>·</span>
                            <span
                              className={
                                r.validation.valid
                                  ? getTierInfo(r.validation.tier).color
                                  : 'text-rose-400'
                              }
                            >
                              {r.validation.valid
                                ? getTierInfo(r.validation.tier).label
                                : 'Invalid'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold ${
                            r.validation.score > 0 ? 'text-[#B9A0FF]' : 'text-white/30'
                          }`}
                        >
                          +{formatIndianNumber(r.validation.score)} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col sm:flex-row gap-3">
                <button
                  onClick={startNewSession}
                  className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#B9A0FF] to-[#8C6CEE] hover:brightness-110 text-white shadow-lg shadow-[#B9A0FF]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>

                <Link
                  href="/games"
                  className="py-3.5 px-6 rounded-xl font-medium text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center justify-center gap-2 transition-all"
                >
                  <span>Back to Arcade</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
