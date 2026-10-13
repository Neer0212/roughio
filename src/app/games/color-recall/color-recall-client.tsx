// src/app/games/color-recall/color-recall-client.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  RotateCcw,
  Sparkles,
  Trophy,
  ArrowRight,
  Check,
  CheckCircle2,
  Volume2,
  VolumeX,
  Layers,
  HelpCircle,
  Play,
} from 'lucide-react';
import { BackButton } from '@/components/layout/BackButton';
import {
  HSLColor,
  RoundResult,
  ColorRecallPhase,
  ColorRecallSessionStats,
} from '@/lib/games/color-recall/types';
import {
  generateRandomTargetColor,
  calculateColorAccuracy,
  hslToHex,
  toHslString,
} from '@/lib/games/color-recall/color-utils';
import { audio } from '@/lib/utils/audio';

const TOTAL_ROUNDS = 5;
const MEMORIZE_SECONDS = 3;
const STORAGE_KEY = 'roughio_color_recall_stats_v1';

export function ColorRecallClient() {
  const [phase, setPhase] = useState<ColorRecallPhase>('ready');
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [targetColor, setTargetColor] = useState<HSLColor>({ h: 180, s: 70, l: 50 });
  const [guessColor, setGuessColor] = useState<HSLColor>({ h: 180, s: 50, l: 50 });
  const [countdown, setCountdown] = useState<number>(MEMORIZE_SECONDS);
  const [roundsHistory, setRoundsHistory] = useState<RoundResult[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [stats, setStats] = useState<ColorRecallSessionStats>(() => {
    if (typeof window === 'undefined') {
      return { gamesPlayed: 0, highScore: 0, bestAccuracy: 0, totalPoints: 0 };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { gamesPlayed: 0, highScore: 0, bestAccuracy: 0, totalPoints: 0 };
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save stats to localStorage
  const updateStats = useCallback((sessionScore: number, avgAccuracy: number) => {
    setStats((prev) => {
      const nextStats: ColorRecallSessionStats = {
        gamesPlayed: prev.gamesPlayed + 1,
        highScore: Math.max(prev.highScore, sessionScore),
        bestAccuracy: Math.max(prev.bestAccuracy, avgAccuracy),
        totalPoints: prev.totalPoints + sessionScore,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
      } catch (e) {
        console.warn('Failed to save Color Recall stats:', e);
      }
      return nextStats;
    });
  }, []);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Starts a new round
  const startRound = useCallback((index: number) => {
    const nextTarget = generateRandomTargetColor();
    setTargetColor(nextTarget);
    // Reset guess to neutral baseline
    setGuessColor({ h: 180, s: 50, l: 50 });
    setRoundIndex(index);
    setCountdown(MEMORIZE_SECONDS);
    setPhase('memorize');

    // Countdown logic
    if (timerRef.current) clearInterval(timerRef.current);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = MEMORIZE_SECONDS - elapsed;
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('recreate');
        setRoundStartTime(Date.now());
      } else {
        setCountdown(remaining);
      }
    }, 200);
  }, []);

  // Skip countdown and jump directly to recreate
  const handleReadyToRecreate = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('recreate');
    setRoundStartTime(Date.now());
  }, []);

  // Start whole session
  const handleStartGame = useCallback(() => {
    setRoundsHistory([]);
    startRound(0);
  }, [startRound]);

  // Submit guess
  const handleSubmitGuess = useCallback(() => {
    if (phase !== 'recreate') return;

    if (!soundMuted) {
      audio.playLockSound();
    }

    const timeSpent = Math.max(1, Math.round((Date.now() - roundStartTime) / 1000));
    const accuracyResult = calculateColorAccuracy(targetColor, guessColor);

    const roundResult: RoundResult = {
      roundNumber: roundIndex + 1,
      target: targetColor,
      guess: guessColor,
      targetHex: hslToHex(targetColor),
      guessHex: hslToHex(guessColor),
      accuracy: accuracyResult.accuracy,
      score: accuracyResult.score,
      deltaE: accuracyResult.deltaE,
      ratingLabel: accuracyResult.ratingLabel,
      ratingEmoji: accuracyResult.ratingEmoji,
      timeSpentSeconds: timeSpent,
    };

    const nextHistory = [...roundsHistory, roundResult];
    setRoundsHistory(nextHistory);
    setPhase('reveal');

    // Play feedback audio
    if (!soundMuted) {
      if (roundResult.accuracy >= 80) {
        audio.playSuccessSound();
      } else if (roundResult.accuracy <= 40) {
        audio.playFailSound();
      } else {
        audio.playNeutralSound();
      }
    }
  }, [
    phase,
    soundMuted,
    roundStartTime,
    targetColor,
    guessColor,
    roundIndex,
    roundsHistory,
  ]);

  // Advance to next round or finish session
  const handleNextRound = useCallback(() => {
    if (roundIndex + 1 < TOTAL_ROUNDS) {
      startRound(roundIndex + 1);
    } else {
      // Game Over
      const totalScore = roundsHistory.reduce((acc, r) => acc + r.score, 0);
      const avgAccuracy = Math.round(
        roundsHistory.reduce((acc, r) => acc + r.accuracy, 0) / TOTAL_ROUNDS
      );
      updateStats(totalScore, avgAccuracy);
      setPhase('game_over');
    }
  }, [roundIndex, startRound, roundsHistory, updateStats]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not hijack typing inside inputs
      if (e.target instanceof HTMLInputElement && e.target.type === 'text') return;

      if (e.key === 'Enter' || e.code === 'Space') {
        if (phase === 'ready') {
          e.preventDefault();
          handleStartGame();
        } else if (phase === 'memorize') {
          e.preventDefault();
          handleReadyToRecreate();
        } else if (phase === 'recreate') {
          e.preventDefault();
          handleSubmitGuess();
        } else if (phase === 'reveal') {
          e.preventDefault();
          handleNextRound();
        } else if (phase === 'game_over') {
          e.preventDefault();
          handleStartGame();
        }
      }

      if ((e.key === 'r' || e.key === 'R') && phase === 'game_over') {
        e.preventDefault();
        handleStartGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    phase,
    handleStartGame,
    handleReadyToRecreate,
    handleSubmitGuess,
    handleNextRound,
  ]);

  // Quick preset hues for quick exploration
  const PRESET_HUES = [
    { label: 'Red', h: 0 },
    { label: 'Orange', h: 30 },
    { label: 'Yellow', h: 60 },
    { label: 'Green', h: 120 },
    { label: 'Cyan', h: 180 },
    { label: 'Blue', h: 225 },
    { label: 'Purple', h: 280 },
    { label: 'Pink', h: 330 },
  ];

  const currentRoundScore = roundsHistory[roundIndex]?.score || 0;
  const currentTotalScore = roundsHistory.reduce((acc, r) => acc + r.score, 0);

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <BackButton fallback="/games" />

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const nextMuted = !soundMuted;
              setSoundMuted(nextMuted);
              audio.toggle(!nextMuted);
            }}
            className="p-2.5 rounded-xl border border-border bg-surface hover:bg-elevated text-text-secondary hover:text-text-primary transition-colors"
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <Link
            href="/games"
            className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary px-4 py-2 rounded-full border border-border bg-surface hover:bg-elevated transition-colors"
          >
            Arcade Hub
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full">
        {/* ============================================================== */}
        {/* PHASE 0: READY / INTRO CARD                                   */}
        {/* ============================================================== */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border-2 border-border rounded-[2.5rem] p-8 sm:p-12 text-center shadow-xl max-w-2xl mx-auto"
          >
            <div className="w-20 h-20 rounded-3xl bg-accent text-white flex items-center justify-center mx-auto mb-6 shadow-md">
              <Eye className="w-10 h-10" />
            </div>

            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-accent/15 text-accent border border-accent/30 mb-4">
              Visual Perception
            </span>

            <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight text-text-primary">
              Color Recall
            </h1>

            <p className="text-text-secondary text-base sm:text-lg mb-8 leading-relaxed font-medium">
              A target color will appear for <span className="text-text-primary font-bold">3 seconds</span>. 
              Once it vanishes, tune Hue, Saturation, and Lightness to recreate it from memory.
            </p>

            {/* Quick High Score Banner */}
            {stats.gamesPlayed > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-8 text-left bg-elevated p-4 rounded-2xl border border-border">
                <div>
                  <span className="text-xs uppercase font-bold text-text-secondary">High Score</span>
                  <div className="text-2xl font-black text-accent">{stats.highScore} pts</div>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-text-secondary">Best Accuracy</span>
                  <div className="text-2xl font-black text-success">{stats.bestAccuracy}%</div>
                </div>
              </div>
            )}

            <button
              onClick={handleStartGame}
              className="w-full sm:w-auto px-10 py-5 rounded-full font-black text-lg bg-accent text-white shadow-[0_4px_0_rgb(224,77,57)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 mx-auto uppercase tracking-wider"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start 5-Round Session</span>
            </button>
            <p className="text-xs text-text-secondary mt-3">Press Enter or Space to begin</p>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* ACTIVE GAMEPLAY ROUND HEADER (Rounds 1 - 5)                   */}
        {/* ============================================================== */}
        {phase !== 'ready' && phase !== 'game_over' && (
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold uppercase tracking-wider text-text-primary shadow-sm">
                Round {roundIndex + 1} <span className="text-text-secondary">/ {TOTAL_ROUNDS}</span>
              </span>

              {/* Round Progress Dots */}
              <div className="hidden sm:flex items-center gap-1.5">
                {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i < roundIndex
                        ? 'bg-success'
                        : i === roundIndex
                        ? 'bg-accent scale-125'
                        : 'bg-border'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-text-secondary tracking-widest">Score</span>
              <span className="font-mono font-bold text-lg text-accent">
                {currentTotalScore} pts
              </span>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PHASE 1: MEMORIZE (3-second target inspection)                */}
        {/* ============================================================== */}
        {phase === 'memorize' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border-2 border-border rounded-[2.5rem] p-6 sm:p-10 text-center shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Step 1: Memorize
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent px-3 py-1 rounded-full bg-accent/10">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                Vanishing in {countdown}s
              </span>
            </div>

            {/* Target Color Swatch */}
            <div
              className="w-full h-64 sm:h-80 rounded-[2rem] border-4 border-white shadow-2xl transition-all duration-300 relative flex items-center justify-center overflow-hidden mb-6"
              style={{ backgroundColor: toHslString(targetColor) }}
            >
              <div className="px-6 py-3 rounded-full bg-black/40 backdrop-blur-md text-white font-mono font-bold text-sm tracking-wider shadow-lg">
                Memorize this exact shade
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-text-secondary font-medium">
                Tip: Pay attention to both the color tone and its lightness.
              </p>

              <button
                onClick={handleReadyToRecreate}
                className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-sm bg-accent text-white hover:bg-accent/90 shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span>I&apos;ve Got It</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* PHASE 2: RECREATE (Interactive HSL Dialing)                   */}
        {/* ============================================================== */}
        {phase === 'recreate' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border-2 border-border rounded-[2.5rem] p-6 sm:p-10 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Step 2: Recreate from Memory
              </span>
              <span className="text-xs font-mono font-bold text-text-primary px-3 py-1 rounded-full bg-elevated border border-border">
                {hslToHex(guessColor)}
              </span>
            </div>

            {/* Live Guessed Color Swatch */}
            <div
              className="w-full h-44 sm:h-56 rounded-[2rem] border-4 border-white shadow-inner transition-colors duration-100 flex items-center justify-center mb-8 relative overflow-hidden"
              style={{ backgroundColor: toHslString(guessColor) }}
            >
              <div className="px-5 py-2 rounded-full bg-black/35 backdrop-blur-md text-white font-mono font-bold text-sm">
                Your Mix: H:{guessColor.h}° S:{guessColor.s}% L:{guessColor.l}%
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6 mb-8">
              {/* Slider 1: HUE */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="hue-slider" className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <span>Hue</span>
                    <span className="text-xs font-normal text-text-secondary">(Color Tone)</span>
                  </label>
                  <span className="font-mono font-bold text-sm">{guessColor.h}°</span>
                </div>
                <input
                  id="hue-slider"
                  type="range"
                  min="0"
                  max="360"
                  value={guessColor.h}
                  onChange={(e) => setGuessColor({ ...guessColor, h: Number(e.target.value) })}
                  className="w-full h-7 rounded-xl appearance-none cursor-pointer focus:outline-none shadow-sm"
                  style={{
                    background:
                      'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                  }}
                  aria-label="Hue Slider"
                />
                {/* Hue Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  {PRESET_HUES.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setGuessColor({ ...guessColor, h: preset.h })}
                      className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-elevated border border-border hover:border-text-primary text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 2: SATURATION */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="sat-slider" className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <span>Saturation</span>
                    <span className="text-xs font-normal text-text-secondary">(Vibrancy)</span>
                  </label>
                  <span className="font-mono font-bold text-sm">{guessColor.s}%</span>
                </div>
                <input
                  id="sat-slider"
                  type="range"
                  min="0"
                  max="100"
                  value={guessColor.s}
                  onChange={(e) => setGuessColor({ ...guessColor, s: Number(e.target.value) })}
                  className="w-full h-7 rounded-xl appearance-none cursor-pointer focus:outline-none shadow-sm"
                  style={{
                    background: `linear-gradient(to right, hsl(${guessColor.h}, 0%, ${guessColor.l}%), hsl(${guessColor.h}, 100%, ${guessColor.l}%))`,
                  }}
                  aria-label="Saturation Slider"
                />
              </div>

              {/* Slider 3: LIGHTNESS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="light-slider" className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <span>Lightness</span>
                    <span className="text-xs font-normal text-text-secondary">(Brightness)</span>
                  </label>
                  <span className="font-mono font-bold text-sm">{guessColor.l}%</span>
                </div>
                <input
                  id="light-slider"
                  type="range"
                  min="0"
                  max="100"
                  value={guessColor.l}
                  onChange={(e) => setGuessColor({ ...guessColor, l: Number(e.target.value) })}
                  className="w-full h-7 rounded-xl appearance-none cursor-pointer focus:outline-none shadow-sm"
                  style={{
                    background: `linear-gradient(to right, #000000 0%, hsl(${guessColor.h}, ${guessColor.s}%, 50%) 50%, #ffffff 100%)`,
                  }}
                  aria-label="Lightness Slider"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitGuess}
              className="w-full py-5 rounded-2xl font-black text-xl bg-accent text-white shadow-[0_4px_0_rgb(224,77,57)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <span>Lock In Color</span>
              <Check className="w-6 h-6 stroke-[3]" />
            </button>
            <p className="text-center text-xs text-text-secondary mt-3">Press Enter to Lock In</p>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* PHASE 3: REVEAL (Side-by-Side Comparison)                     */}
        {/* ============================================================== */}
        {phase === 'reveal' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border-2 border-border rounded-[2.5rem] p-6 sm:p-10 shadow-xl"
          >
            {/* Header Result */}
            {roundsHistory[roundIndex] && (
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/15 border border-success/30 text-success font-black text-sm uppercase tracking-widest mb-3">
                  <span>{roundsHistory[roundIndex].ratingEmoji}</span>
                  <span>{roundsHistory[roundIndex].ratingLabel}</span>
                </div>
                <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-text-primary">
                  {roundsHistory[roundIndex].accuracy}% Accuracy
                </h2>
                <p className="text-accent font-bold text-lg mt-1">
                  +{roundsHistory[roundIndex].score} Points
                </p>
              </div>
            )}

            {/* Split Swatches: Target vs Guess */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
              {/* Target Swatch */}
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  Target (Original)
                </span>
                <div
                  className="w-full h-40 sm:h-48 rounded-2xl border-4 border-white shadow-md flex items-end p-4"
                  style={{ backgroundColor: toHslString(targetColor) }}
                >
                  <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white font-mono text-xs font-bold">
                    {hslToHex(targetColor)}
                  </span>
                </div>
                <div className="mt-2 text-xs font-mono text-text-secondary">
                  H:{targetColor.h}° S:{targetColor.s}% L:{targetColor.l}%
                </div>
              </div>

              {/* Guessed Swatch */}
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  Your Memory
                </span>
                <div
                  className="w-full h-40 sm:h-48 rounded-2xl border-4 border-white shadow-md flex items-end p-4"
                  style={{ backgroundColor: toHslString(guessColor) }}
                >
                  <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white font-mono text-xs font-bold">
                    {hslToHex(guessColor)}
                  </span>
                </div>
                <div className="mt-2 text-xs font-mono text-text-secondary">
                  H:{guessColor.h}° S:{guessColor.s}% L:{guessColor.l}%
                </div>
              </div>
            </div>

            {/* Component Difference Breakdown */}
            {roundsHistory[roundIndex] && (
              <div className="grid grid-cols-3 gap-3 mb-8 text-center bg-elevated p-4 rounded-2xl border border-border">
                <div>
                  <div className="text-[10px] sm:text-xs uppercase font-bold text-text-secondary">Δ Hue</div>
                  <div className="font-mono font-bold text-sm sm:text-base">
                    {Math.abs(targetColor.h - guessColor.h)}°
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs uppercase font-bold text-text-secondary">Δ Saturation</div>
                  <div className="font-mono font-bold text-sm sm:text-base">
                    {Math.abs(targetColor.s - guessColor.s)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs uppercase font-bold text-text-secondary">Δ Lightness</div>
                  <div className="font-mono font-bold text-sm sm:text-base">
                    {Math.abs(targetColor.l - guessColor.l)}%
                  </div>
                </div>
              </div>
            )}

            {/* Next Action */}
            <button
              onClick={handleNextRound}
              className="w-full py-5 rounded-2xl font-black text-xl bg-accent text-white shadow-[0_4px_0_rgb(224,77,57)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              <span>{roundIndex + 1 < TOTAL_ROUNDS ? 'Next Round' : 'View Final Summary'}</span>
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            </button>
            <p className="text-center text-xs text-text-secondary mt-3">Press Enter or Space to continue</p>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* PHASE 4: GAME OVER / RESULTS RECAP                            */}
        {/* ============================================================== */}
        {phase === 'game_over' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border-2 border-border rounded-[2.5rem] p-8 sm:p-12 text-center shadow-xl max-w-3xl mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-accent text-white flex items-center justify-center mx-auto mb-6 shadow-md">
              <Trophy className="w-10 h-10" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-black mb-2 tracking-tight">
              Session Complete!
            </h1>

            <div className="text-5xl sm:text-6xl font-mono font-black text-accent mb-2">
              {roundsHistory.reduce((acc, r) => acc + r.score, 0)} pts
            </div>

            <p className="text-text-secondary font-bold text-base mb-8">
              Average Accuracy:{' '}
              <span className="text-text-primary">
                {Math.round(roundsHistory.reduce((acc, r) => acc + r.accuracy, 0) / TOTAL_ROUNDS)}%
              </span>
            </p>

            {/* Round-by-Round Chips */}
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4 text-left">
              Round Breakdown
            </h3>
            <div className="space-y-3 mb-8">
              {roundsHistory.map((round) => (
                <div
                  key={round.roundNumber}
                  className="flex items-center justify-between p-3.5 bg-elevated rounded-2xl border border-border gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-xs">
                      #{round.roundNumber}
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                        style={{ backgroundColor: toHslString(round.target) }}
                        title={`Target: ${round.targetHex}`}
                      />
                      <span className="text-xs font-bold text-text-secondary">vs</span>
                      <div
                        className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                        style={{ backgroundColor: toHslString(round.guess) }}
                        title={`Guess: ${round.guessHex}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-sm font-bold text-text-primary">{round.accuracy}%</div>
                      <div className="text-[10px] text-text-secondary font-medium">{round.ratingLabel}</div>
                    </div>
                    <div className="font-mono font-bold text-accent text-sm w-16">
                      +{round.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartGame}
                className="w-full sm:w-auto px-10 py-5 rounded-full font-black text-lg bg-accent text-white shadow-[0_4px_0_rgb(224,77,57)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Play Again</span>
              </button>

              <Link
                href="/games"
                className="w-full sm:w-auto px-8 py-5 rounded-full font-bold text-base bg-elevated text-text-primary border-2 border-border hover:bg-border/50 transition-colors"
              >
                Back to Arcade
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
