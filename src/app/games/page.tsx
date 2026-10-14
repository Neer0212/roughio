'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  ArrowRight,
  Clock,
  Layers,
  Eye,
  Volume2,
  Grid,
  HelpCircle,
  TrendingUp,
  Sparkles,
  Trophy,
  Flame,
} from 'lucide-react';
import { ARCADE_GAMES } from '@/lib/games/registry';
import { Navbar } from '@/components/layout/Navbar';

const ICONS_MAP: Record<string, any> = {
  fermi: TrendingUp,
  'color-recall': Eye,
  'sound-match': Volume2,
  'pattern-recall': Grid,
  'rare-answer': HelpCircle,
  'order-of-magnitude': Layers,
};

const STORAGE_KEYS: Record<string, string> = {
  'color-recall': 'roughio_color_recall_stats_v1',
  'sound-match': 'roughio_sound_match_stats_v1',
  'pattern-recall': 'roughio_pattern_recall_stats_v1',
  'rare-answer': 'roughio_rare_answer_stats_v1',
  'order-of-magnitude': 'roughio_order_of_magnitude_stats_v1',
};

export default function ArcadeHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [highScores, setHighScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scores: Record<string, number> = {};
    for (const [gameId, key] of Object.entries(STORAGE_KEYS)) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed.highScore === 'number') {
            scores[gameId] = parsed.highScore;
          }
        }
      } catch {}
    }
    setHighScores(scores);
  }, []);

  const categories = [
    { id: 'all', label: 'All Modes' },
    { id: 'Estimation', label: 'Estimation' },
    { id: 'Perception & Memory', label: 'Color Perception' },
    { id: 'Audio & Pitch', label: 'Pitch Matching' },
    { id: 'Working Memory', label: 'Working Memory' },
    { id: 'Trivia & Language', label: 'Rare Trivia' },
    { id: 'Scale & Numbers', label: 'Scale Duels' },
  ];

  const filteredGames = ARCADE_GAMES.filter((game) => {
    if (selectedCategory !== 'all' && game.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col selection:bg-accent selection:text-[#090A0F]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Arcade Lobby Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border text-accent font-mono font-bold text-xs uppercase tracking-widest mb-4 shadow-sm"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Multi-Game Cognitive Arcade</span>
          </motion.div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4">
            Arcade Floor
          </h1>
          <p className="text-base sm:text-lg text-text-secondary font-medium max-w-xl mx-auto">
            Choose an arena. Each game targets a distinct cognitive faculty—from Fermi scale intuition to microtonal pitch tuning.
          </p>

          {/* Quick Metrics Badge */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 text-xs font-mono font-bold">
            <span className="flex items-center gap-1.5 text-accent">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              6 Arenas Live
            </span>
            <span className="text-border">•</span>
            <span className="text-text-secondary">Instant Browser Play</span>
            <span className="text-border">•</span>
            <span className="text-text-secondary">Local &amp; Global Stats</span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 ${
                  isSelected
                    ? 'bg-accent text-[#090A0F] shadow-[0_0_15px_rgba(204,255,0,0.25)]'
                    : 'bg-surface hover:bg-elevated text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredGames.map((game, index) => {
              const Icon = ICONS_MAP[game.id] || Gamepad2;
              const personalBest = highScores[game.id];

              return (
                <motion.div
                  key={game.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="flex flex-col"
                >
                  <Link
                    href={game.route}
                    className="flex-1 flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-surface border border-border hover:border-border-hover hover:bg-elevated transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden shadow-lg"
                  >
                    {/* Top Game Accent Indicator */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: game.accentColor }}
                    />

                    <div>
                      {/* Card Top: Icon, Category & High Score */}
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: `${game.accentColor}18`,
                            color: game.accentColor,
                            border: `1px solid ${game.accentColor}35`,
                          }}
                        >
                          <Icon className="w-6 h-6" />
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-background border border-border text-text-secondary">
                            {game.category}
                          </span>
                          {personalBest !== undefined && personalBest > 0 && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20 flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              <span>PB: {personalBest}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Game Title & Tagline */}
                      <h2 className="text-2xl font-black text-text-primary group-hover:text-white transition-colors mb-2">
                        {game.name}
                      </h2>
                      <p className="text-sm text-text-secondary leading-relaxed mb-6 font-medium">
                        {game.description}
                      </p>

                      {/* Skill Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {game.metrics.skills.map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-background/80 text-text-secondary border border-border"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Metadata & Play Action */}
                    <div className="pt-4 border-t border-border flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{game.metrics.duration}</span>
                        </span>
                        <span>·</span>
                        <span>{game.metrics.difficulty}</span>
                      </div>

                      <span
                        className="text-xs font-mono font-black uppercase tracking-wider inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform"
                        style={{ color: game.accentColor }}
                      >
                        <span>Launch</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
