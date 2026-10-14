// src/app/games/sound-match/sound-match-client.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Trophy,
  ArrowRight,
  Sparkles,
  Music,
  CheckCircle2,
  Sliders,
  HelpCircle,
  Headphones,
  Minus,
  Plus,
  Radio,
} from 'lucide-react';
import { BackButton } from '@/components/layout/BackButton';
import { GameHeader } from '@/components/game-shell/GameHeader';
import { formatIndianNumber } from '@/lib/utils/number-parser';
import {
  MIN_FREQUENCY,
  MAX_FREQUENCY,
  TOTAL_ROUNDS,
  MAX_REPLAYS,
  DEFAULT_GUESS_FREQUENCY,
  sliderToFrequency,
  frequencyToSlider,
  calculateCentsDifference,
  frequencyToNoteName,
  formatFrequencyWithNote,
  generateRandomTargetFrequency,
  evaluateSoundMatchRound,
} from '@/lib/games/sound-match/sound-utils';
import type {
  SoundMatchPhase,
  SoundMatchRoundResult,
  SoundMatchSessionStats,
} from '@/lib/games/sound-match/types';
import { soundAudio } from '@/lib/games/sound-match/audio';

const STORAGE_KEY = 'roughio_sound_match_stats_v1';
const MUTE_KEY = 'roughio_sound_match_muted_v1';

export function SoundMatchClient() {
  const [phase, setPhase] = useState<SoundMatchPhase>('ready');
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [targetFrequency, setTargetFrequency] = useState<number>(440);
  const [guessFrequency, setGuessFrequency] = useState<number>(DEFAULT_GUESS_FREQUENCY);
  const [sliderVal, setSliderVal] = useState<number>(() =>
    frequencyToSlider(DEFAULT_GUESS_FREQUENCY)
  );
  const [replaysUsed, setReplaysUsed] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playingType, setPlayingType] = useState<'target' | 'guess' | 'comparison' | null>(null);
  const [currentRoundResult, setCurrentRoundResult] = useState<SoundMatchRoundResult | null>(null);
  const [roundsHistory, setRoundsHistory] = useState<SoundMatchRoundResult[]>([]);
  const [soundMuted, setSoundMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(MUTE_KEY) === 'true';
  });

  const [stats, setStats] = useState<SoundMatchSessionStats>(() => {
    if (typeof window === 'undefined') {
      return { gamesPlayed: 0, highScore: 0, bestAccuracy: 0, totalScore: 0 };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { gamesPlayed: 0, highScore: 0, bestAccuracy: 0, totalScore: 0 };
  });

  // Track if active session set a new personal high score
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  // Sync audio mute state
  useEffect(() => {
    soundAudio.setMuted(soundMuted);
    try {
      localStorage.setItem(MUTE_KEY, soundMuted ? 'true' : 'false');
    } catch {}
  }, [soundMuted]);

  // Clean up audio nodes on unmount
  useEffect(() => {
    return () => {
      soundAudio.stopAll();
    };
  }, []);

  // Update session stats
  const saveSessionStats = useCallback(
    (finalScore: number, avgAccuracy: number) => {
      setStats((prev) => {
        const isNewBest = finalScore > prev.highScore;
        setIsNewHighScore(isNewBest);
        const nextStats: SoundMatchSessionStats = {
          gamesPlayed: prev.gamesPlayed + 1,
          highScore: Math.max(prev.highScore, finalScore),
          bestAccuracy: Math.max(prev.bestAccuracy, avgAccuracy),
          totalScore: prev.totalScore + finalScore,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
        } catch {}
        return nextStats;
      });
    },
    []
  );

  // Play target tone safely
  const playTargetTone = useCallback(async (freq: number) => {
    setIsPlaying(true);
    setPlayingType('target');
    await soundAudio.playTone(freq, 1.2);
    setIsPlaying(false);
    setPlayingType(null);
  }, []);

  // Play guess tone
  const playGuessTone = useCallback(async (freq: number) => {
    setIsPlaying(true);
    setPlayingType('guess');
    await soundAudio.playTone(freq, 1.2);
    setIsPlaying(false);
    setPlayingType(null);
  }, []);

  // Play comparison sequence
  const playComparison = useCallback(async (target: number, guess: number) => {
    setIsPlaying(true);
    setPlayingType('comparison');
    await soundAudio.playComparisonSequence(target, guess, 1.0, 250);
    setIsPlaying(false);
    setPlayingType(null);
  }, []);

  // Start a specific round
  const startRound = useCallback(
    async (roundNum: number) => {
      const target = generateRandomTargetFrequency();
      setTargetFrequency(target);
      // Reset guess frequency to a neutral mid frequency or 440 Hz
      const initialGuess = DEFAULT_GUESS_FREQUENCY;
      setGuessFrequency(initialGuess);
      setSliderVal(frequencyToSlider(initialGuess));
      setReplaysUsed(0);
      setRoundIndex(roundNum);
      setCurrentRoundResult(null);

      // Transition to listen phase
      setPhase('listen');
      // Automatically play reference tone once
      await playTargetTone(target);
      setPhase('adjust');
    },
    [playTargetTone]
  );

  // Start whole 5-round session
  const startNewSession = useCallback(() => {
    setRoundsHistory([]);
    setIsNewHighScore(false);
    startRound(0);
  }, [startRound]);

  // Handle replaying the target tone
  const handleReplayTarget = useCallback(() => {
    if (replaysUsed >= MAX_REPLAYS || isPlaying) return;
    setReplaysUsed((prev) => prev + 1);
    playTargetTone(targetFrequency);
  }, [replaysUsed, isPlaying, playTargetTone, targetFrequency]);

  // Handle slider adjustment
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSliderVal(val);
    const freq = sliderToFrequency(val);
    setGuessFrequency(freq);
  };

  // Nudge frequency by delta (+/- 1 or 10 Hz)
  const nudgeFrequency = useCallback((deltaHz: number) => {
    setGuessFrequency((prev) => {
      const nextFreq = Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, Math.round(prev + deltaHz)));
      setSliderVal(frequencyToSlider(nextFreq));
      return nextFreq;
    });
  }, []);

  // Submit / Lock in guess
  const handleLockIn = useCallback(() => {
    soundAudio.stopAll();
    setIsPlaying(false);
    setPlayingType(null);

    const result = evaluateSoundMatchRound(
      roundIndex + 1,
      targetFrequency,
      guessFrequency,
      replaysUsed
    );
    setCurrentRoundResult(result);
    setRoundsHistory((prev) => [...prev, result]);
    setPhase('reveal');

    if (result.score >= 800) {
      soundAudio.playCelebrationChime();
    }
  }, [roundIndex, targetFrequency, guessFrequency, replaysUsed]);

  // Advance to next round or game over
  const handleNextRound = useCallback(() => {
    if (roundIndex + 1 < TOTAL_ROUNDS) {
      startRound(roundIndex + 1);
    } else {
      // Game over
      const allRounds = [...roundsHistory];
      const totalScore = allRounds.reduce((acc, r) => acc + r.score, 0);
      const avgAccuracy = Math.round(
        allRounds.reduce((acc, r) => acc + r.accuracy, 0) / TOTAL_ROUNDS
      );
      saveSessionStats(totalScore, avgAccuracy);
      setPhase('game_over');
    }
  }, [roundIndex, roundsHistory, startRound, saveSessionStats]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (phase === 'adjust') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nudgeFrequency(e.shiftKey ? -10 : -1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nudgeFrequency(e.shiftKey ? 10 : 1);
        } else if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          playGuessTone(guessFrequency);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleReplayTarget();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleLockIn();
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
  }, [
    phase,
    guessFrequency,
    nudgeFrequency,
    playGuessTone,
    handleReplayTarget,
    handleLockIn,
    handleNextRound,
  ]);

  // Total session score so far
  const totalSessionScore = roundsHistory.reduce((sum, r) => sum + r.score, 0);
  const avgSessionAccuracy =
    roundsHistory.length > 0
      ? Math.round(roundsHistory.reduce((sum, r) => sum + r.accuracy, 0) / roundsHistory.length)
      : 0;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center">
      {/* Top Header Bar */}
      <GameHeader
        title="Sound Match"
        category="Audio & Pitch"
        accentColor="#4A65FF"
        soundMuted={soundMuted}
        onToggleSound={() => setSoundMuted((prev) => !prev)}
        highScore={stats.highScore}
        score={phase !== 'ready' ? totalSessionScore : undefined}
        roundInfo={
          phase !== 'ready' && phase !== 'game_over'
            ? `Round ${roundIndex + 1} / ${TOTAL_ROUNDS}`
            : undefined
        }
      />

      {/* Main Content Area */}
      <main className="w-full max-w-3xl flex-1 flex flex-col items-center">
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
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#4A65FF] to-[#3548CC] flex items-center justify-center shadow-xl shadow-[#4A65FF]/20 mb-6 border border-white/20">
                <Radio className="w-10 h-10 text-white animate-pulse" />
              </div>

              <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                Train Your Pitch Intuition
              </h2>
              <p className="text-white/60 text-sm max-w-md mb-8 leading-relaxed">
                Listen to a pure reference tone, then sweep the oscillator slider to match the exact
                frequency from memory. Scored in musical cents.
              </p>

              {/* Rules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8 text-left">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-[#4A65FF]/20 text-[#4A65FF] flex items-center justify-center mb-3 font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Listen Closely</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    A target frequency from 150 Hz to 1,000 Hz plays at the start of each round.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-[#4A65FF]/20 text-[#4A65FF] flex items-center justify-center mb-3 font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Dial It In</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Use the logarithmic slider and ±1 Hz / ±10 Hz nudge buttons to fine-tune your guess.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-[#4A65FF]/20 text-[#4A65FF] flex items-center justify-center mb-3 font-bold text-xs">
                    3
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Preview & Lock</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Preview your pitch anytime before locking it in. Up to 1,000 pts per round (5 rounds).
                  </p>
                </div>
              </div>

              {/* Lifetime Stats Bar */}
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
                    <span className="text-base font-bold text-amber-400">
                      {formatIndianNumber(stats.highScore)}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-white/40 block">
                      Best Accuracy
                    </span>
                    <span className="text-base font-bold text-[#4A65FF]">
                      {stats.bestAccuracy}%
                    </span>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={startNewSession}
                className="w-full max-w-sm py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#4A65FF] to-[#3548CC] hover:brightness-110 shadow-lg shadow-[#4A65FF]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Start Session (5 Rounds)</span>
              </button>
            </motion.div>
          )}

          {/* PHASE: LISTEN OR ADJUST */}
          {(phase === 'listen' || phase === 'adjust') && (
            <motion.div
              key="play-phase"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex flex-col items-center"
            >
              {/* Progress and Round Header */}
              <div className="w-full flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#4A65FF]/20 text-[#4A65FF] border border-[#4A65FF]/30">
                    Round {roundIndex + 1} of {TOTAL_ROUNDS}
                  </span>
                  <span className="text-xs text-white/40">
                    Score: {formatIndianNumber(totalSessionScore)}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-white/50">
                  <Headphones className="w-3.5 h-3.5 text-white/40" />
                  <span>
                    Replays left:{' '}
                    <strong className="text-white">
                      {Math.max(0, MAX_REPLAYS - replaysUsed)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Target Sound Card / Visualizer */}
              <div className="w-full p-6 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 flex flex-col items-center relative overflow-hidden">
                {/* Audio Waves Animated Effect */}
                <div className="flex items-center justify-center gap-1.5 h-16 mb-4">
                  {[40, 70, 100, 60, 85, 30, 90, 50, 75, 45].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={
                        isPlaying
                          ? {
                              height: [12, h, 16],
                              backgroundColor:
                                playingType === 'target'
                                  ? ['#4A65FF', '#818CF8', '#4A65FF']
                                  : ['#35D07F', '#6EE7B7', '#35D07F'],
                            }
                          : { height: 8, backgroundColor: '#ffffff20' }
                      }
                      transition={{
                        repeat: isPlaying ? Infinity : 0,
                        duration: 0.6,
                        delay: i * 0.05,
                        ease: 'easeInOut',
                      }}
                      className="w-2 rounded-full"
                    />
                  ))}
                </div>

                <div className="text-center mb-4">
                  <h3 className="text-base font-semibold text-white">
                    {phase === 'listen'
                      ? 'Listening to Target Tone...'
                      : isPlaying && playingType === 'target'
                      ? 'Playing Reference Tone...'
                      : isPlaying && playingType === 'guess'
                      ? 'Playing Your Guess...'
                      : 'Target Tone Locked'}
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    {phase === 'listen'
                      ? 'Memorize the frequency and pitch'
                      : 'Match this tone using the slider and nudge controls'}
                  </p>
                </div>

                {/* Replay Reference Button */}
                <button
                  onClick={handleReplayTarget}
                  disabled={replaysUsed >= MAX_REPLAYS || isPlaying}
                  className={`px-4 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${
                    replaysUsed >= MAX_REPLAYS
                      ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                      : isPlaying && playingType === 'target'
                      ? 'bg-[#4A65FF]/20 border-[#4A65FF]/50 text-[#818CF8] animate-pulse'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90 active:scale-95'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>
                    {replaysUsed >= MAX_REPLAYS
                      ? 'No Replays Remaining'
                      : `Replay Target Tone (${MAX_REPLAYS - replaysUsed} left)`}
                  </span>
                </button>
              </div>

              {/* Frequency Adjustment Control Card */}
              <div className="w-full p-6 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold text-white/40 tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#4A65FF]" />
                    Frequency Control
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-[#4A65FF]">
                      {Math.round(guessFrequency)} Hz
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 font-mono">
                      ~{frequencyToNoteName(guessFrequency)}
                    </span>
                  </div>
                </div>

                {/* Main Logarithmic Slider */}
                <div className="w-full my-4">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={sliderVal}
                    onChange={handleSliderChange}
                    disabled={phase === 'listen'}
                    className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4A65FF] focus:outline-none focus:ring-2 focus:ring-[#4A65FF]/50"
                  />
                  <div className="w-full flex justify-between text-[11px] text-white/40 font-mono mt-1.5">
                    <span>150 Hz (D3)</span>
                    <span>440 Hz (A4)</span>
                    <span>1000 Hz (B5)</span>
                  </div>
                </div>

                {/* Fine Nudge Controls */}
                <div className="w-full grid grid-cols-4 gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => nudgeFrequency(-10)}
                    disabled={phase === 'listen'}
                    className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 active:scale-95 transition-all flex items-center justify-center gap-1"
                    title="-10 Hz"
                  >
                    <Minus className="w-3 h-3 text-white/40" />
                    <span>10 Hz</span>
                  </button>
                  <button
                    onClick={() => nudgeFrequency(-1)}
                    disabled={phase === 'listen'}
                    className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 active:scale-95 transition-all flex items-center justify-center gap-1"
                    title="-1 Hz"
                  >
                    <Minus className="w-3 h-3 text-white/40" />
                    <span>1 Hz</span>
                  </button>
                  <button
                    onClick={() => nudgeFrequency(1)}
                    disabled={phase === 'listen'}
                    className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 active:scale-95 transition-all flex items-center justify-center gap-1"
                    title="+1 Hz"
                  >
                    <Plus className="w-3 h-3 text-white/40" />
                    <span>1 Hz</span>
                  </button>
                  <button
                    onClick={() => nudgeFrequency(10)}
                    disabled={phase === 'listen'}
                    className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 active:scale-95 transition-all flex items-center justify-center gap-1"
                    title="+10 Hz"
                  >
                    <Plus className="w-3 h-3 text-white/40" />
                    <span>10 Hz</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Preview Guess & Lock In */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => playGuessTone(guessFrequency)}
                  disabled={isPlaying}
                  className={`py-3.5 px-4 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    isPlaying && playingType === 'guess'
                      ? 'bg-[#35D07F]/20 border-[#35D07F]/50 text-[#35D07F] animate-pulse'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <Volume2 className="w-4 h-4 text-[#35D07F]" />
                  <span>Preview Your Guess (Space)</span>
                </button>

                <button
                  onClick={handleLockIn}
                  disabled={phase === 'listen'}
                  className="py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#4A65FF] to-[#3548CC] hover:brightness-110 text-white shadow-lg shadow-[#4A65FF]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lock In Guess (Enter)</span>
                </button>
              </div>

              {/* Keyboard shortcuts helper tip */}
              <p className="text-[11px] text-white/30 text-center mt-4 hidden sm:block">
                Hotkeys: <strong>←/→</strong> for ±1 Hz (Hold Shift for ±10 Hz) ·{' '}
                <strong>Space</strong> to preview · <strong>R</strong> to replay ·{' '}
                <strong>Enter</strong> to lock in
              </p>
            </motion.div>
          )}

          {/* PHASE: REVEAL */}
          {phase === 'reveal' && currentRoundResult && (
            <motion.div
              key="reveal-phase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full flex flex-col items-center"
            >
              {/* Score Award Banner */}
              <div className="w-full p-6 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 flex flex-col items-center text-center relative overflow-hidden">
                <div className="text-3xl mb-1">{currentRoundResult.ratingEmoji}</div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  {currentRoundResult.ratingLabel}
                </h3>
                <p className="text-sm text-white/60 mt-1 max-w-sm">
                  {currentRoundResult.absCentsDiff <= 15
                    ? 'Incredible pitch precision! Almost imperceptible microtonal difference.'
                    : currentRoundResult.absCentsDiff <= 50
                    ? 'Very impressive ear! Well within a quarter of a semitone.'
                    : currentRoundResult.absCentsDiff <= 120
                    ? 'Good pitch proximity within about one semitone.'
                    : 'A bit off-pitch this round. Compare both tones below!'}
                </p>

                {/* Score badge */}
                <div className="mt-4 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 font-bold text-lg flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>+{formatIndianNumber(currentRoundResult.score)} pts</span>
                </div>
              </div>

              {/* Tone Comparison Cards */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Target Tone */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                  <span className="text-[11px] uppercase font-bold text-white/40 block mb-1">
                    Target Tone
                  </span>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-2xl font-mono font-bold text-[#4A65FF]">
                      {currentRoundResult.targetFrequency} Hz
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#4A65FF]/20 text-[#818CF8] font-mono">
                      {currentRoundResult.targetNote}
                    </span>
                  </div>
                  <button
                    onClick={() => playTargetTone(currentRoundResult.targetFrequency)}
                    disabled={isPlaying}
                    className="w-full mt-auto py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#4A65FF]" />
                    <span>Play Target</span>
                  </button>
                </div>

                {/* Your Guess Tone */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                  <span className="text-[11px] uppercase font-bold text-white/40 block mb-1">
                    Your Guess
                  </span>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-2xl font-mono font-bold text-[#35D07F]">
                      {Math.round(currentRoundResult.guessFrequency)} Hz
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#35D07F]/20 text-[#35D07F] font-mono">
                      {currentRoundResult.guessNote}
                    </span>
                  </div>
                  <button
                    onClick={() => playGuessTone(currentRoundResult.guessFrequency)}
                    disabled={isPlaying}
                    className="w-full mt-auto py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#35D07F]" />
                    <span>Play Your Guess</span>
                  </button>
                </div>
              </div>

              {/* Pitch Error & Detailed Metrics Bar */}
              <div className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/10 mb-6">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-white/50">Pitch Error:</span>
                  <span
                    className={`font-mono font-bold ${
                      currentRoundResult.absCentsDiff <= 30
                        ? 'text-emerald-400'
                        : currentRoundResult.absCentsDiff <= 100
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {currentRoundResult.centsDiff > 0 ? '+' : ''}
                    {currentRoundResult.centsDiff} cents{' '}
                    <span className="text-white/40 font-normal">
                      ({currentRoundResult.centsDiff > 0 ? 'Sharp' : currentRoundResult.centsDiff < 0 ? 'Flat' : 'Perfect'})
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Accuracy:</span>
                  <span className="font-mono font-bold text-white">
                    {currentRoundResult.accuracy}%
                  </span>
                </div>

                {/* Combined A/B comparison button */}
                <button
                  onClick={() =>
                    playComparison(
                      currentRoundResult.targetFrequency,
                      currentRoundResult.guessFrequency
                    )
                  }
                  disabled={isPlaying}
                  className="w-full mt-4 py-2.5 px-3 rounded-lg bg-[#4A65FF]/10 hover:bg-[#4A65FF]/20 border border-[#4A65FF]/30 text-xs font-semibold text-[#818CF8] flex items-center justify-center gap-2 transition-all"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Play A/B Sequence (Target then Guess)</span>
                </button>
              </div>

              {/* Next Round Button */}
              <button
                onClick={handleNextRound}
                className="w-full max-w-sm py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-[#4A65FF] to-[#3548CC] hover:brightness-110 shadow-lg shadow-[#4A65FF]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center shadow-xl shadow-amber-500/20 mb-3 mx-auto border border-white/20">
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
                  5 rounds completed across the audio spectrum
                </p>
              </div>

              {/* Main Score & Metrics Summary */}
              <div className="w-full grid grid-cols-3 gap-3 mb-6 text-center">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                    Total Score
                  </span>
                  <span className="text-2xl font-extrabold text-amber-400 font-mono">
                    {formatIndianNumber(totalSessionScore)}
                  </span>
                  <span className="text-[10px] text-white/30 block mt-0.5">/ 5,000</span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                    Avg Accuracy
                  </span>
                  <span className="text-2xl font-extrabold text-[#4A65FF] font-mono">
                    {avgSessionAccuracy}%
                  </span>
                  <span className="text-[10px] text-white/30 block mt-0.5">pitch match</span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                    Avg Pitch Error
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {roundsHistory.length > 0
                      ? Math.round(
                          (roundsHistory.reduce((s, r) => s + r.absCentsDiff, 0) /
                            roundsHistory.length) *
                            10
                        ) / 10
                      : 0}
                    ¢
                  </span>
                  <span className="text-[10px] text-white/30 block mt-0.5">cents diff</span>
                </div>
              </div>

              {/* Round Breakdown Table */}
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
                          <div className="font-medium text-white flex items-center gap-1.5">
                            <span>{r.targetFrequency} Hz</span>
                            <span className="text-white/30">vs</span>
                            <span className="text-white/80">{Math.round(r.guessFrequency)} Hz</span>
                          </div>
                          <span className="text-[10px] text-white/40">
                            {r.targetNote} vs {r.guessNote}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-amber-400">
                          +{formatIndianNumber(r.score)} pts
                        </div>
                        <span
                          className={`text-[10px] font-mono ${
                            r.absCentsDiff <= 30
                              ? 'text-emerald-400'
                              : r.absCentsDiff <= 100
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {r.centsDiff > 0 ? '+' : ''}
                          {r.centsDiff}¢ ({r.accuracy}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col sm:flex-row gap-3">
                <button
                  onClick={startNewSession}
                  className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#4A65FF] to-[#3548CC] hover:brightness-110 text-white shadow-lg shadow-[#4A65FF]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
