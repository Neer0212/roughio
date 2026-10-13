// src/app/games/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  CheckCircle2,
  Lock,
  Eye,
  Volume2,
  Grid,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { ARCADE_GAMES, getPlayableGames, getComingSoonGames } from '@/lib/games/registry';
import { GameCategory } from '@/lib/games/types';
import { BackButton } from '@/components/layout/BackButton';

const ICONS_MAP: Record<string, any> = {
  fermi: TrendingUp,
  'color-recall': Eye,
  'sound-match': Volume2,
  'pattern-recall': Grid,
  'rare-answer': HelpCircle,
  'order-of-magnitude': Layers,
};

export default function ArcadeHubPage() {
  const [filter, setFilter] = useState<'all' | 'playable' | 'coming-soon'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories: string[] = ['all', 'Estimation', 'Perception & Memory', 'Audio & Pitch', 'Working Memory', 'Trivia & Language', 'Scale & Numbers'];

  const filteredGames = ARCADE_GAMES.filter((game) => {
    if (filter === 'playable' && game.status !== 'playable') return false;
    if (filter === 'coming-soon' && game.status !== 'coming-soon') return false;
    if (selectedCategory !== 'all' && game.category !== selectedCategory) return false;
    return true;
  });

  const playableCount = getPlayableGames().length;
  const plannedCount = getComingSoonGames().length;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-8">
        <BackButton fallback="/" />
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary px-4 py-2 rounded-full border border-border bg-surface hover:bg-elevated transition-colors"
        >
          roughio.gg
        </Link>
      </div>

      {/* Hero Header */}
      <div className="text-center mb-12 sm:mb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-bold text-xs uppercase tracking-widest mb-4"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Multi-Game Arcade</span>
        </motion.div>
        
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4">
          The Roughio Arcade
        </h1>
        <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto font-medium">
          Fast-paced daily games to test gut intuition, sensory memory, and mental scale.
        </p>

        {/* Quick Stats Banner */}
        <div className="flex items-center justify-center gap-6 mt-6 text-sm font-bold">
          <span className="flex items-center gap-2 text-success">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            {playableCount} Playable Now
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-2 text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-warning" />
            {plannedCount} In Development
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Status Filters */}
        <div className="flex items-center p-1.5 rounded-2xl bg-surface border border-border shadow-sm">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              filter === 'all'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Modes ({ARCADE_GAMES.length})
          </button>
          <button
            onClick={() => setFilter('playable')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              filter === 'playable'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Playable ({playableCount})
          </button>
          <button
            onClick={() => setFilter('coming-soon')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              filter === 'coming-soon'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Planned ({plannedCount})
          </button>
        </div>

        {/* Category Pill Select on Mobile / Desktop */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-text-primary text-background border-text-primary'
                  : 'bg-surface text-text-secondary border-border hover:border-text-secondary'
              }`}
            >
              {cat === 'all' ? 'All Skills' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <AnimatePresence>
          {filteredGames.map((game) => {
            const Icon = ICONS_MAP[game.id] || Gamepad2;
            const isPlayable = game.status === 'playable';

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={game.id}
                className={`flex flex-col justify-between rounded-[2.5rem] p-7 sm:p-8 border-2 transition-all duration-300 relative overflow-hidden group ${
                  isPlayable
                    ? 'bg-surface border-border hover:border-accent hover:shadow-2xl'
                    : 'bg-surface/60 border-border/70 opacity-80 hover:opacity-100 hover:border-border'
                }`}
              >
                {/* Background Glow for Playable */}
                {isPlayable && (
                  <div
                    className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
                    style={{ backgroundColor: game.accentColor }}
                  />
                )}

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-md transform group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: game.accentColor }}
                    >
                      <Icon className="w-7 h-7" />
                    </div>

                    <div className="flex items-center gap-2">
                      {isPlayable ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-success/15 text-success border border-success/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {game.badge}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-surface text-text-secondary border border-border">
                          <Lock className="w-3.5 h-3.5" />
                          {game.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight text-text-primary">
                    {game.name}
                  </h2>
                  <p className="text-sm font-bold text-accent mb-4">
                    {game.tagline}
                  </p>
                  <p className="text-text-secondary text-sm leading-relaxed mb-6 font-medium">
                    {game.description}
                  </p>

                  {/* Skills / Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {game.metrics.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-elevated border border-border text-text-secondary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer & Action */}
                <div className="pt-6 border-t border-border flex items-center justify-between gap-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{game.metrics.duration}</span>
                  </div>

                  {isPlayable ? (
                    <Link
                      href={game.route}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm bg-accent text-white hover:bg-accent/90 shadow-md hover:shadow-lg transition-all transform active:scale-95"
                    >
                      <span>Play Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs bg-elevated text-text-secondary border border-border cursor-not-allowed opacity-75"
                    >
                      <span>In Development</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
