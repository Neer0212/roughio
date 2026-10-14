// src/app/games/order-of-magnitude/order-of-magnitude-client.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  Trophy,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Flame,
  Sparkles,
  Zap,
  Info,
  Check,
} from 'lucide-react';
import { BackButton } from '@/components/layout/BackButton';
import { formatIndianNumber } from '@/lib/utils/number-parser';
import { getRandomSessionPairs } from '@/lib/games/order-of-magnitude/data';
import {
  createActiveRound,
  evaluateOrderOfMagnitudeRound,
} from '@/lib/games/order-of-magnitude/magnitude-utils';
import type {
  ActiveRoundComparison,
  RoundEvaluation,
  SessionRoundResult,
  OrderOfMagnitudePhase,
  OrderOfMagnitudeStats,
} from '@/lib/games/order-of-magnitude/types';

const STORAGE_KEY = 'roughio_order_of_magnitude_stats_v1';
const TOTAL_ROUNDS = 10;

const MAGNITUDE_OPTIONS = [
  { val: 0, label: '0 (1x–3x)' },
  { val: 1, label: '1 (~10x)' },
  { val: 2, label: '2 (~100x)' },
  { val: 3, label: '3 (~1,000x)' },
  { val: 4, label: '4 (~10,000x)' },
  { val: 5, label: '5 (~100,000x)' },
  { val: 6, label: '6+ (Million+)' },
];

export function OrderOfMagnitudeClient() {
  const [phase, setPhase] = useState<OrderOfMagnitudePhase>('ready');
  const [sessionComparisons, setSessionComparisons] = useState<ActiveRoundComparison[]>([]);
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [selectedMagnitudeGuess, setSelectedMagnitudeGuess] = useState<number | null>(null);
  const [currentEvaluation, setCurrentEvaluation] = useState<RoundEvaluation | null>(null);
  const [roundsHistory, setRoundsHistory] = useState<SessionRoundResult[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestSessionStreak, setBestSessionStreak] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  const [stats, setStats] = useState<OrderOfMagnitudeStats>(() => {
    if (typeof window === 'undefined') {
      return {
        gamesPlayed: 0,
        highScore: 0,
        bestStreak: 0,
        totalScore: 0,
        correctComparisons: 0,
        totalComparisons: 0,
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      gamesPlayed: 0,
      highScore: 0,
      bestStreak: 0,
      totalScore: 0,
      correctComparisons: 0,
      totalComparisons: 0,
    };
  });

  // Save session stats to localStorage
  const saveSessionStats = useCallback(
    (finalScore: number, correctCount: number, peakStreak: number) => {
      setStats((prev) => {
        const isNewBest = finalScore > prev.highScore;
        setIsNewHighScore(isNewBest);
        const nextStats: OrderOfMagnitudeStats = {
          gamesPlayed: prev.gamesPlayed + 1,
          highScore: Math.max(prev.highScore, finalScore),
          bestStreak: Math.max(prev.bestStreak, peakStreak),
          totalScore: prev.totalScore + finalScore,
          correctComparisons: prev.correctComparisons + correctCount,
          totalComparisons: prev.totalComparisons + TOTAL_ROUNDS,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
        } catch {}
        return nextStats;
      });
    },
    []
  );

  // Start new 10-round session
  const startNewSession = useCallback(() => {
    const rawPairs = getRandomSessionPairs(TOTAL_ROUNDS);
    const rounds = rawPairs.map((pair, idx) => createActiveRound(pair, idx + 1));
    setSessionComparisons(rounds);
    setRoundIndex(0);
    setSelectedOption(null);
    setSelectedMagnitudeGuess(null);
    setCurrentEvaluation(null);
    setRoundsHistory([]);
    setCurrentStreak(0);
    setBestSessionStreak(0);
    setIsNewHighScore(false);
    setPhase('playing');
  }, []);

  const currentComparison = sessionComparisons[roundIndex];

  // Submit answer
  const handleLockInAnswer = useCallback(() => {
    if (!currentComparison || selectedOption === null) return;

    const evaluation = evaluateOrderOfMagnitudeRound(
      selectedOption,
      currentComparison.largerOption,
      selectedMagnitudeGuess,
      currentComparison.actualMagnitudeDiff
    );

    setCurrentEvaluation(evaluation);

    // Update streak tracking
    if (evaluation.isCorrectSelection) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      setBestSessionStreak((prev) => Math.max(prev, newStreak));
    } else {
      setCurrentStreak(0);
    }

    setRoundsHistory((prev) => [
      ...prev,
      {
        roundNumber: roundIndex + 1,
        comparison: currentComparison,
        evaluation,
      },
    ]);

    setPhase('reveal');
  }, [
    currentComparison,
    selectedOption,
    selectedMagnitudeGuess,
    currentStreak,
    roundIndex,
  ]);

  // Advance to next round or game over
  const handleNextRound = useCallback(() => {
    if (roundIndex + 1 < TOTAL_ROUNDS) {
      setRoundIndex((prev) => prev + 1);
      setSelectedOption(null);
      setSelectedMagnitudeGuess(null);
      setCurrentEvaluation(null);
      setPhase('playing');
    } else {
      // Game over
      const allRounds = [...roundsHistory];
      const totalScore = allRounds.reduce((acc, r) => acc + r.evaluation.totalRoundScore, 0);
      const correctCount = allRounds.filter((r) => r.evaluation.isCorrectSelection).length;
      saveSessionStats(totalScore, correctCount, bestSessionStreak);
      setPhase('game_over');
    }
  }, [roundIndex, roundsHistory, bestSessionStreak, saveSessionStats]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (phase === 'playing') {
        if (e.key === 'a' || e.key === 'A' || e.key === '1') {
          e.preventDefault();
          setSelectedOption('A');
        } else if (e.key === 'b' || e.key === 'B' || e.key === '2') {
          e.preventDefault();
          setSelectedOption('B');
        } else if (e.key === 'Enter' && selectedOption !== null) {
          e.preventDefault();
          handleLockInAnswer();
        }
      } else if (phase === 'reveal') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNextRound();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedOption, handleLockInAnswer, handleNextRound]);

  const totalSessionScore = roundsHistory.reduce(
    (sum, r) => sum + r.evaluation.totalRoundScore,
    0
  );

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex flex-col items-center px-4 py-8">
      {/* Header Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#FF8585]/20 text-[#FF8585] border border-[#FF8585]/30">
                <Scale className="w-4 h-4" />
              </span>
              Order of Magnitude
            </h1>
            <p className="text-xs text-white/50">Rapid Scale & Power-of-Ten Intuition</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStreak > 1 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{currentStreak} Streak</span>
            </div>
          )}

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
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#FF8585] to-[#E05B5B] flex items-center justify-center shadow-xl shadow-[#FF8585]/20 mb-6 border border-white/20">
                <Scale className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                Which is Greater?
              </h2>
              <p className="text-white/60 text-sm max-w-md mb-8 leading-relaxed">
                Compare surprising pairs of real-world quantities across cosmic, atomic, and global
                scales. Pick the larger value, and predict how many powers of ten separate them.
              </p>

              {/* Scoring Rules Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-8 text-left">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-md bg-[#FF8585]/20 text-[#FF8585] flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-white">Pick the Larger Quantity</h3>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Correctly identify which number is greater to earn a guaranteed <strong>100 points</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-md bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <h3 className="text-sm font-bold text-white">Magnitude Challenge</h3>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Optionally estimate how many orders of magnitude separate them for up to{' '}
                    <strong>50 bonus points</strong>!
                  </p>
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
                    <span className="text-[10px] uppercase font-bold text-white/40 block">
                      Best Score
                    </span>
                    <span className="text-base font-bold text-amber-400 font-mono">
                      {formatIndianNumber(stats.highScore)}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-white/40 block">
                      Best Streak
                    </span>
                    <span className="text-base font-bold text-[#FF8585] font-mono">
                      {stats.bestStreak} 🔥
                    </span>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={startNewSession}
                className="w-full max-w-sm py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#FF8585] to-[#E05B5B] hover:brightness-110 shadow-lg shadow-[#FF8585]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Start Session (10 Rounds)</span>
              </button>
            </motion.div>
          )}

          {/* PHASE: PLAYING */}
          {phase === 'playing' && currentComparison && (
            <motion.div
              key="playing-phase"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex flex-col items-center"
            >
              {/* Progress & Category */}
              <div className="w-full flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#FF8585]/20 text-[#FF8585] border border-[#FF8585]/30">
                    Round {roundIndex + 1} of {TOTAL_ROUNDS}
                  </span>
                  <span className="text-xs text-white/40">
                    Score: {formatIndianNumber(totalSessionScore)}
                  </span>
                </div>

                <span className="text-xs text-white/50 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  {currentComparison.category}
                </span>
              </div>

              {/* Question Heading */}
              <h2 className="text-2xl font-bold text-white tracking-tight mb-6 text-center">
                Which quantity is greater?
              </h2>

              {/* A/B Choice Cards */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Option A */}
                <button
                  type="button"
                  onClick={() => setSelectedOption('A')}
                  className={`p-6 rounded-2xl border text-left flex flex-col transition-all cursor-pointer relative ${
                    selectedOption === 'A'
                      ? 'bg-[#FF8585]/15 border-[#FF8585] ring-2 ring-[#FF8585]/30 shadow-lg shadow-[#FF8585]/10'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        selectedOption === 'A'
                          ? 'bg-[#FF8585] text-white'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      A
                    </span>
                    <span className="text-[11px] text-white/40">Press A or 1</span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug mb-2 flex-1">
                    {currentComparison.optionA.label}
                  </h3>

                  <div className="text-xs text-white/40 font-mono">
                    Unit: {currentComparison.optionA.unit}
                  </div>
                </button>

                {/* Option B */}
                <button
                  type="button"
                  onClick={() => setSelectedOption('B')}
                  className={`p-6 rounded-2xl border text-left flex flex-col transition-all cursor-pointer relative ${
                    selectedOption === 'B'
                      ? 'bg-[#FF8585]/15 border-[#FF8585] ring-2 ring-[#FF8585]/30 shadow-lg shadow-[#FF8585]/10'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        selectedOption === 'B'
                          ? 'bg-[#FF8585] text-white'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      B
                    </span>
                    <span className="text-[11px] text-white/40">Press B or 2</span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug mb-2 flex-1">
                    {currentComparison.optionB.label}
                  </h3>

                  <div className="text-xs text-white/40 font-mono">
                    Unit: {currentComparison.optionB.unit}
                  </div>
                </button>
              </div>

              {/* Optional Magnitude Challenge Selector */}
              <div className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/10 mb-6 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Optional: Magnitude Difference (Powers of 10)
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold">Up to +50 pts bonus</span>
                </div>
                <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
                  How many orders of magnitude separate these two quantities?
                </p>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {MAGNITUDE_OPTIONS.map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() =>
                        setSelectedMagnitudeGuess((prev) => (prev === opt.val ? null : opt.val))
                      }
                      className={`py-2 px-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                        selectedMagnitudeGuess === opt.val
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm shadow-amber-400/20'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                      }`}
                    >
                      {opt.val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lock In Button */}
              <button
                type="button"
                onClick={handleLockInAnswer}
                disabled={selectedOption === null}
                className="w-full py-4 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-[#FF8585] to-[#E05B5B] hover:brightness-110 text-white shadow-lg shadow-[#FF8585]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Lock In Answer (Enter)</span>
              </button>
            </motion.div>
          )}

          {/* PHASE: REVEAL */}
          {phase === 'reveal' && currentEvaluation && currentComparison && (
            <motion.div
              key="reveal-phase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full flex flex-col items-center"
            >
              {/* Verdict Header Banner */}
              <div
                className={`w-full p-6 rounded-2xl border mb-6 flex flex-col items-center text-center ${
                  currentEvaluation.isCorrectSelection
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-rose-950/20 border-rose-500/30'
                }`}
              >
                <div className="text-3xl mb-1">
                  {currentEvaluation.isCorrectSelection ? '🎯' : '❌'}
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  {currentEvaluation.isCorrectSelection ? 'Correct Choice!' : 'Incorrect Choice'}
                </h3>

                <p className="text-xs text-white/60 mt-1">
                  Option {currentComparison.largerOption} is the larger quantity.
                </p>

                {/* Points Awarded */}
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-1.5 ${
                      currentEvaluation.totalRoundScore > 0
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <span>+{currentEvaluation.totalRoundScore} pts</span>
                  </span>

                  {currentEvaluation.magnitudeBonus > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                      +{currentEvaluation.magnitudeBonus} magnitude bonus
                    </span>
                  )}
                </div>
              </div>

              {/* Comparison Cards with Revealed Quantities */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Option A Card */}
                <div
                  className={`p-5 rounded-2xl border flex flex-col ${
                    currentComparison.largerOption === 'A'
                      ? 'bg-emerald-950/15 border-emerald-500/40 ring-1 ring-emerald-500/30'
                      : 'bg-white/[0.02] border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white/50">Option A</span>
                    {currentComparison.largerOption === 'A' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 uppercase tracking-wider">
                        Larger ✓
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white mb-2">
                    {currentComparison.optionA.label}
                  </h4>

                  <div className="mt-auto pt-2 border-t border-white/10">
                    <div className="text-xl font-mono font-extrabold text-emerald-400">
                      {currentComparison.optionA.formattedValue}
                    </div>
                    <span className="text-[11px] text-white/40">
                      {currentComparison.optionA.unit}
                    </span>
                    {currentComparison.optionA.detail && (
                      <p className="text-[10px] text-white/50 mt-1 leading-tight">
                        {currentComparison.optionA.detail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Option B Card */}
                <div
                  className={`p-5 rounded-2xl border flex flex-col ${
                    currentComparison.largerOption === 'B'
                      ? 'bg-emerald-950/15 border-emerald-500/40 ring-1 ring-emerald-500/30'
                      : 'bg-white/[0.02] border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white/50">Option B</span>
                    {currentComparison.largerOption === 'B' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 uppercase tracking-wider">
                        Larger ✓
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white mb-2">
                    {currentComparison.optionB.label}
                  </h4>

                  <div className="mt-auto pt-2 border-t border-white/10">
                    <div className="text-xl font-mono font-extrabold text-emerald-400">
                      {currentComparison.optionB.formattedValue}
                    </div>
                    <span className="text-[11px] text-white/40">
                      {currentComparison.optionB.unit}
                    </span>
                    {currentComparison.optionB.detail && (
                      <p className="text-[10px] text-white/50 mt-1 leading-tight">
                        {currentComparison.optionB.detail}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Scale & Explanation Details */}
              <div className="w-full p-5 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                  <span className="text-white/50">Relative Ratio:</span>
                  <span className="font-mono font-bold text-white">
                    {currentComparison.ratioDisplay}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                  <span className="text-white/50">Magnitude Difference:</span>
                  <span className="font-mono font-bold text-amber-300">
                    ~10^{currentComparison.actualMagnitudeDiff} ({currentComparison.actualMagnitudeDiff}{' '}
                    {currentComparison.actualMagnitudeDiff === 1 ? 'order' : 'orders'} of magnitude)
                  </span>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  {currentComparison.explanation}
                </p>

                {currentComparison.funFact && (
                  <div className="text-xs text-amber-300/90 bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-lg">
                    💡 <strong>Did you know?</strong> {currentComparison.funFact}
                  </div>
                )}
              </div>

              {/* Next Round Button */}
              <button
                type="button"
                onClick={handleNextRound}
                className="w-full max-w-sm py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#FF8585] to-[#E05B5B] hover:brightness-110 shadow-lg shadow-[#FF8585]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF8585] to-[#E05B5B] flex items-center justify-center shadow-xl shadow-[#FF8585]/20 mb-3 mx-auto border border-white/20">
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
                  10 comparisons across cosmic and everyday scales
                </p>
              </div>

              {/* Metrics Box */}
              <div className="w-full grid grid-cols-3 gap-3 mb-6 text-center">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                    Total Score
                  </span>
                  <span className="text-2xl font-extrabold text-amber-400 font-mono">
                    {formatIndianNumber(totalSessionScore)}
                  </span>
                  <span className="text-[10px] text-white/30 block mt-0.5">/ 1,500 pts</span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                    Correct Picks
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {roundsHistory.filter((r) => r.evaluation.isCorrectSelection).length} / 10
                  </span>
                  <span className="text-[10px] text-white/30 block mt-0.5">
                    {Math.round(
                      (roundsHistory.filter((r) => r.evaluation.isCorrectSelection).length / 10) *
                        100
                    )}
                    % accuracy
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                    Best Streak
                  </span>
                  <span className="text-2xl font-extrabold text-[#FF8585] font-mono">
                    {bestSessionStreak} 🔥
                  </span>
                  <span className="text-[10px] text-white/30 block mt-0.5">consecutive</span>
                </div>
              </div>

              {/* Round Breakdown */}
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
                            {r.comparison.title}
                          </div>
                          <div className="text-[11px] text-white/50 flex items-center gap-1.5 mt-0.5">
                            <span>Pick: Option {r.evaluation.chosenOption}</span>
                            <span>·</span>
                            <span
                              className={
                                r.evaluation.isCorrectSelection
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-rose-400'
                              }
                            >
                              {r.evaluation.isCorrectSelection ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold ${
                            r.evaluation.totalRoundScore > 0
                              ? 'text-[#FF8585]'
                              : 'text-white/30'
                          }`}
                        >
                          +{r.evaluation.totalRoundScore} pts
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">
                          {r.comparison.ratioDisplay}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={startNewSession}
                  className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#FF8585] to-[#E05B5B] hover:brightness-110 text-white shadow-lg shadow-[#FF8585]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
