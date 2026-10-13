// src/app/games/pattern-recall/pattern-recall-client.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid,
  RotateCcw,
  Trophy,
  ArrowRight,
  Volume2,
  VolumeX,
  Play,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { BackButton } from '@/components/layout/BackButton';
import { formatIndianNumber } from '@/lib/utils/number-parser';
import {
  PATTERN_TILES,
  DEFAULT_MAX_ROUNDS,
  createInitialState,
  generatePatternSequence,
  getSequenceLengthForRound,
  getTimingForRound,
  calculateAccuracy,
  processTileInput,
} from '@/lib/games/pattern-recall/pattern-utils';
import type {
  PatternRecallState,
  PatternRecallSessionStats,
} from '@/lib/games/pattern-recall/types';
import { patternAudio } from '@/lib/games/pattern-recall/audio';

const STORAGE_KEY = 'roughio_pattern_recall_stats_v1';
const MUTE_KEY = 'roughio_pattern_recall_muted_v1';

export function PatternRecallClient() {
  const [gameState, setGameState] = useState<PatternRecallState>(() => createInitialState(0));
  const [activeTileId, setActiveTileId] = useState<number | null>(null);
  const [errorTileId, setErrorTileId] = useState<number | null>(null);
  const [soundMuted, setSoundMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(MUTE_KEY) === 'true';
  });

  const [stats, setStats] = useState<PatternRecallSessionStats>(() => {
    if (typeof window === 'undefined') {
      return {
        gamesPlayed: 0,
        highScore: 0,
        bestRound: 1,
        longestSequence: 0,
        totalInputs: 0,
        correctInputs: 0,
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      gamesPlayed: 0,
      highScore: 0,
      bestRound: 1,
      longestSequence: 0,
      totalInputs: 0,
      correctInputs: 0,
    };
  });

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clear pending timers helper
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  // Sync mute with audio engine
  useEffect(() => {
    patternAudio.setMuted(soundMuted);
    try {
      localStorage.setItem(MUTE_KEY, soundMuted ? 'true' : 'false');
    } catch {}
  }, [soundMuted]);

  // Update session stats upon game over or victory
  const saveFinalStats = useCallback(
    (finalScore: number, finalRound: number, sequenceLen: number, correct: number, total: number) => {
      setStats((prev) => {
        const nextStats: PatternRecallSessionStats = {
          gamesPlayed: prev.gamesPlayed + 1,
          highScore: Math.max(prev.highScore, finalScore),
          bestRound: Math.max(prev.bestRound, finalRound),
          longestSequence: Math.max(prev.longestSequence, sequenceLen),
          totalInputs: prev.totalInputs + total,
          correctInputs: prev.correctInputs + correct,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
        } catch {}
        return nextStats;
      });
    },
    []
  );

  // Play demonstration sequence for the round
  const playDemonstration = useCallback(
    (sequence: number[], roundNum: number) => {
      clearAllTimeouts();
      setActiveTileId(null);
      setErrorTileId(null);

      const timing = getTimingForRound(roundNum);
      const stepDuration = timing.onDurationMs + timing.offDurationMs;

      // Start demonstration after initial pause
      const initialDelay = 450;

      sequence.forEach((tileId, stepIndex) => {
        const startTime = initialDelay + stepIndex * stepDuration;

        // Turn tile ON
        const onTimeout = setTimeout(() => {
          setActiveTileId(tileId);
          const tile = PATTERN_TILES[tileId];
          if (tile) {
            patternAudio.playTileTone(tile.noteFrequency, timing.onDurationMs / 1000);
          }
        }, startTime);
        timeoutsRef.current.push(onTimeout);

        // Turn tile OFF
        const offTimeout = setTimeout(() => {
          setActiveTileId(null);
        }, startTime + timing.onDurationMs);
        timeoutsRef.current.push(offTimeout);
      });

      // Transition to player input phase once demonstration completes
      const totalDemonstrationTime = initialDelay + sequence.length * stepDuration + 150;
      const endTimeout = setTimeout(() => {
        setActiveTileId(null);
        setGameState((prev) => ({
          ...prev,
          phase: 'input',
          currentStep: 0,
        }));
      }, totalDemonstrationTime);
      timeoutsRef.current.push(endTimeout);
    },
    [clearAllTimeouts]
  );

  // Start a new round
  const startRound = useCallback(
    (roundNumber: number, currentScore: number, currentCorrect: number, currentTotal: number) => {
      clearAllTimeouts();
      const sequenceLength = getSequenceLengthForRound(roundNumber);
      const newSequence = generatePatternSequence(sequenceLength);

      setGameState((prev) => ({
        ...prev,
        phase: 'demonstrating',
        round: roundNumber,
        sequence: newSequence,
        currentStep: 0,
        score: currentScore,
        correctInputs: currentCorrect,
        totalInputs: currentTotal,
        activeTileId: null,
        errorTileId: null,
      }));

      playDemonstration(newSequence, roundNumber);
    },
    [clearAllTimeouts, playDemonstration]
  );

  // Start whole session
  const handleStartGame = useCallback(() => {
    clearAllTimeouts();
    setGameState(createInitialState(stats.highScore));
    startRound(1, 0, 0, 0);
  }, [clearAllTimeouts, startRound, stats.highScore]);

  // Handle tile click or keyboard selection
  const handleTileSelect = useCallback(
    (tileId: number) => {
      // Disallow clicks during demonstration or after game over
      if (gameState.phase !== 'input') return;

      const result = processTileInput(gameState, tileId);

      if (result.isCorrect) {
        // Flash active tile briefly with tone
        setActiveTileId(tileId);
        const tile = PATTERN_TILES[tileId];
        if (tile) {
          patternAudio.playTileTone(tile.noteFrequency, 0.18);
        }
        const flashTimeout = setTimeout(() => {
          setActiveTileId(null);
        }, 180);
        timeoutsRef.current.push(flashTimeout);

        if (result.isRoundComplete) {
          patternAudio.playRoundComplete();
          setGameState(result.nextState);

          if (result.isGameOver) {
            // Victory at max round!
            saveFinalStats(
              result.nextState.score,
              result.nextState.round,
              result.nextState.sequence.length,
              result.nextState.correctInputs,
              result.nextState.totalInputs
            );
          } else {
            // Short celebration delay, then advance to next round
            const nextRoundTimeout = setTimeout(() => {
              startRound(
                result.nextState.round + 1,
                result.nextState.score,
                result.nextState.correctInputs,
                result.nextState.totalInputs
              );
            }, 750);
            timeoutsRef.current.push(nextRoundTimeout);
          }
        } else {
          setGameState(result.nextState);
        }
      } else {
        // Mistake made
        setErrorTileId(tileId);
        patternAudio.playMistake();
        setGameState(result.nextState);

        saveFinalStats(
          result.nextState.score,
          result.nextState.round,
          Math.max(0, result.nextState.sequence.length - 1),
          result.nextState.correctInputs,
          result.nextState.totalInputs
        );
      }
    },
    [gameState, saveFinalStats, startRound]
  );

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      // Space / Enter shortcuts on ready or game over screens
      if (gameState.phase === 'ready' || gameState.phase === 'game_over' || gameState.phase === 'victory') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartGame();
          return;
        }
      }

      // 1-9 & Numpad1-9 selection during input phase
      if (gameState.phase === 'input') {
        const key = e.key;
        let tileIndex = -1;

        if (key >= '1' && key <= '9') {
          tileIndex = parseInt(key, 10) - 1;
        } else if (key.startsWith('Numpad') && key.length === 7) {
          const num = parseInt(key.slice(6), 10);
          if (num >= 1 && num <= 9) {
            tileIndex = num - 1;
          }
        }

        if (tileIndex >= 0 && tileIndex < PATTERN_TILES.length) {
          e.preventDefault();
          handleTileSelect(tileIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, handleStartGame, handleTileSelect]);

  const accuracy = calculateAccuracy(gameState.correctInputs, gameState.totalInputs);
  const isDemonstrating = gameState.phase === 'demonstrating';
  const isInputPhase = gameState.phase === 'input';
  const isNewHighScore = gameState.score > 0 && gameState.score >= stats.highScore;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between mb-6">
        <BackButton fallback="/games" />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundMuted((m) => !m)}
            aria-label={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-2.5 rounded-full border border-border bg-surface hover:bg-elevated text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-accent" />}
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-surface text-xs font-bold uppercase tracking-wider text-text-secondary">
            <Trophy className="w-4 h-4 text-[#FFDE00]" />
            <span>High: {formatIndianNumber(stats.highScore)}</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ============================================================ */}
        {/* 1. READY / INSTRUCTION SCREEN                                */}
        {/* ============================================================ */}
        {gameState.phase === 'ready' && (
          <motion.div
            key="ready-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg bg-surface border border-border rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-6 my-auto"
          >
            <div className="inline-flex p-4 rounded-2xl bg-[#FFDE00]/10 border border-[#FFDE00]/20 text-[#FFDE00] mb-2">
              <Grid className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FFDE00]">
                Working Memory Arcade
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                Pattern Recall
              </h1>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                Watch the sequence of glowing tiles, then tap or press them in the exact order.
                Sequences grow longer with every round!
              </p>
            </div>

            {/* Controls Info Box */}
            <div className="grid grid-cols-2 gap-3 text-left p-4 rounded-2xl bg-elevated/60 border border-border text-xs">
              <div>
                <span className="text-text-secondary font-bold block mb-1">Controls</span>
                <span className="text-text-primary font-medium">Click / Tap tiles or Keys 1–9</span>
              </div>
              <div>
                <span className="text-text-secondary font-bold block mb-1">Target</span>
                <span className="text-text-primary font-medium">Clear up to {DEFAULT_MAX_ROUNDS} Rounds</span>
              </div>
            </div>

            {/* Quick Stats Banner */}
            {stats.gamesPlayed > 0 && (
              <div className="flex items-center justify-around py-3 px-4 rounded-2xl bg-surface border border-border text-xs">
                <div>
                  <span className="text-text-secondary block">Best Round</span>
                  <span className="text-text-primary font-extrabold text-sm">Round {stats.bestRound}</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <span className="text-text-secondary block">Longest Span</span>
                  <span className="text-text-primary font-extrabold text-sm">{stats.longestSequence} Tiles</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <span className="text-text-secondary block">Games</span>
                  <span className="text-text-primary font-extrabold text-sm">{stats.gamesPlayed}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleStartGame}
              className="w-full py-4 rounded-full bg-accent text-white font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-accent/25 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Game</span>
              <span className="text-xs text-white/70 font-normal hidden sm:inline">(or press Space)</span>
            </button>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* 2. ACTIVE GAMEPLAY (DEMONSTRATING / INPUT / ROUND SUCCESS)   */}
        {/* ============================================================ */}
        {(gameState.phase === 'demonstrating' ||
          gameState.phase === 'input' ||
          gameState.phase === 'round_success') && (
          <motion.div
            key="game-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg flex flex-col items-center space-y-6"
          >
            {/* Round & Score Telemetry Bar */}
            <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-surface border border-border text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Round</span>
                <span className="font-extrabold text-base text-text-primary">
                  {gameState.round}
                  <span className="text-text-secondary font-medium text-xs">/{gameState.maxRound}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated border border-border text-xs font-bold">
                <Zap className="w-3.5 h-3.5 text-[#FFDE00]" />
                <span>Sequence: {gameState.sequence.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Score</span>
                <span className="font-extrabold text-base text-accent">
                  {formatIndianNumber(gameState.score)}
                </span>
              </div>
            </div>

            {/* Turn Status Pill */}
            <div className="h-10 flex items-center justify-center">
              {isDemonstrating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFDE00]/15 border border-[#FFDE00]/30 text-[#FFDE00] text-xs font-bold uppercase tracking-wider"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FFDE00] animate-pulse" />
                  <span>Memorize the sequence...</span>
                </motion.div>
              )}

              {isInputPhase && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider"
                >
                  <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
                  <span>
                    Your turn! Step {gameState.currentStep + 1} of {gameState.sequence.length}
                  </span>
                </motion.div>
              )}

              {gameState.phase === 'round_success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-extrabold uppercase tracking-wider"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Round Complete! (+{gameState.round * 100} Bonus)</span>
                </motion.div>
              )}
            </div>

            {/* Sequence Progress Dots */}
            <div className="flex items-center gap-1.5">
              {gameState.sequence.map((_, idx) => {
                const isCompleted = isInputPhase && idx < gameState.currentStep;
                const isCurrent = isInputPhase && idx === gameState.currentStep;
                return (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isCompleted
                        ? 'w-6 bg-accent'
                        : isCurrent
                        ? 'w-6 bg-white animate-pulse'
                        : 'w-2 bg-border'
                    }`}
                  />
                );
              })}
            </div>

            {/* The 3x3 Tile Matrix */}
            <div className="w-full aspect-square max-w-[360px] sm:max-w-[400px] p-4 rounded-3xl bg-surface/90 border border-border shadow-2xl backdrop-blur-md grid grid-cols-3 gap-3 sm:gap-4 relative">
              {PATTERN_TILES.map((tile) => {
                const isIlluminated = activeTileId === tile.id;
                const isError = errorTileId === tile.id;

                return (
                  <motion.button
                    key={tile.id}
                    onClick={() => handleTileSelect(tile.id)}
                    disabled={isDemonstrating || gameState.phase === 'round_success'}
                    whileTap={isInputPhase ? { scale: 0.94 } : undefined}
                    whileHover={isInputPhase ? { scale: 1.02 } : undefined}
                    aria-label={`Tile ${tile.keyLabel} - ${tile.name}`}
                    style={{
                      backgroundColor: isIlluminated
                        ? tile.activeHex
                        : isError
                        ? '#EF4444'
                        : tile.bgHex,
                      boxShadow: isIlluminated
                        ? `0 0 25px ${tile.glowHex}, inset 0 0 15px ${tile.glowHex}`
                        : isError
                        ? '0 0 25px rgba(239, 68, 68, 0.8)'
                        : 'none',
                    }}
                    className={`relative rounded-2xl flex flex-col items-center justify-between p-2.5 transition-all duration-150 border focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent ${
                      isIlluminated
                        ? 'border-white brightness-125 z-10'
                        : isError
                        ? 'border-red-400 z-10'
                        : 'border-white/10 hover:border-white/30'
                    } ${isDemonstrating ? 'cursor-default' : 'cursor-pointer active:brightness-125'}`}
                  >
                    {/* Key number shortcut pill */}
                    <span
                      className={`self-start text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                        isIlluminated
                          ? 'bg-black/40 text-white'
                          : 'bg-black/30 text-text-secondary/70'
                      }`}
                    >
                      {tile.keyLabel}
                    </span>

                    {/* Tile center pulse dot */}
                    <div
                      className={`w-3 h-3 rounded-full transition-transform ${
                        isIlluminated
                          ? 'bg-white scale-150'
                          : 'bg-white/20'
                      }`}
                    />

                    <span className="text-[10px] uppercase font-bold tracking-widest text-transparent">
                      .
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Quick helper tip */}
            <p className="text-xs text-text-secondary/60 text-center">
              Use keyboard keys <span className="text-text-primary font-bold">1–9</span> or numpad to tap tiles directly.
            </p>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* 3. GAME OVER & VICTORY RECAP                                 */}
        {/* ============================================================ */}
        {(gameState.phase === 'game_over' || gameState.phase === 'victory') && (
          <motion.div
            key="game-over-screen"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6 my-auto"
          >
            {/* Header Icon */}
            <div className="inline-flex p-4 rounded-2xl bg-elevated border border-border">
              {gameState.phase === 'victory' ? (
                <Trophy className="w-12 h-12 text-[#FFDE00]" />
              ) : (
                <AlertTriangle className="w-12 h-12 text-rose-500" />
              )}
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                {gameState.phase === 'victory' ? 'Maximum Span Reached' : 'Sequence Broken'}
              </span>
              <h2 className="text-3xl font-extrabold text-text-primary tracking-tight">
                {gameState.phase === 'victory' ? 'Arcade Master!' : 'Game Over'}
              </h2>
            </div>

            {/* Big Score Card */}
            <div className="p-6 rounded-2xl bg-elevated border border-border space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Final Score
              </span>
              <div className="text-4xl sm:text-5xl font-black text-text-primary tracking-tight">
                {formatIndianNumber(gameState.score)}
              </div>
              {isNewHighScore && (
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#FFDE00]/20 border border-[#FFDE00]/30 text-[#FFDE00] text-xs font-extrabold uppercase tracking-widest">
                    🎉 New Personal Best!
                  </span>
                </div>
              )}
            </div>

            {/* Detailed Run Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-elevated/60 border border-border">
                <span className="text-text-secondary block mb-1">Round</span>
                <span className="text-text-primary font-black text-base">{gameState.round}</span>
              </div>
              <div className="p-3 rounded-xl bg-elevated/60 border border-border">
                <span className="text-text-secondary block mb-1">Sequence</span>
                <span className="text-text-primary font-black text-base">
                  {gameState.sequence.length} Tiles
                </span>
              </div>
              <div className="p-3 rounded-xl bg-elevated/60 border border-border">
                <span className="text-text-secondary block mb-1">Accuracy</span>
                <span className="text-text-primary font-black text-base">{accuracy}%</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleStartGame}
                className="w-full py-4 rounded-full bg-accent text-white font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-accent/25 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Play Again</span>
              </button>

              <Link
                href="/games"
                className="w-full py-3.5 rounded-full border border-border bg-surface hover:bg-elevated text-text-primary font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Back to Arcade</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
