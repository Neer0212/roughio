'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Volume2, VolumeX, Trophy, Flame } from 'lucide-react';
import { BackButton } from '@/components/layout/BackButton';

interface GameHeaderProps {
  title: string;
  category?: string;
  accentColor?: string;
  backFallback?: string;
  backLabel?: string;
  score?: number;
  streak?: number;
  highScore?: number;
  roundInfo?: string; // e.g. "Round 2 / 5"
  soundMuted?: boolean;
  onToggleSound?: () => void;
  rightActions?: React.ReactNode;
}

export function GameHeader({
  title,
  category,
  accentColor = '#CCFF00',
  backFallback = '/games',
  backLabel = 'Arcade',
  score,
  streak,
  highScore,
  roundInfo,
  soundMuted,
  onToggleSound,
  rightActions,
}: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3 w-full">
      {/* Left: Back button + Game Info */}
      <div className="flex items-center gap-3">
        <BackButton fallback={backFallback} label={backLabel} />

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="font-bold text-sm text-text-primary tracking-tight">
            {title}
          </span>
          {category && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
              {category}
            </span>
          )}
        </div>
      </div>

      {/* Right: Round, Score, Streak, Sound Toggle, Custom Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {roundInfo && (
          <span className="text-xs font-mono font-bold text-text-secondary px-3 py-1.5 rounded-xl bg-surface border border-border">
            {roundInfo}
          </span>
        )}

        {streak !== undefined && streak > 0 && (
          <span className="flex items-center gap-1 text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-warning/10 text-warning border border-warning/20">
            <Flame className="w-3.5 h-3.5" />
            <span>{streak}</span>
          </span>
        )}

        {score !== undefined && (
          <span className="text-xs font-mono font-black px-3 py-1.5 rounded-xl bg-surface border border-border text-white">
            <span className="text-text-muted mr-1">PTS</span>
            <span>{score.toLocaleString()}</span>
          </span>
        )}

        {highScore !== undefined && highScore > 0 && (
          <span className="hidden md:flex items-center gap-1 text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-surface border border-border text-text-secondary">
            <Trophy className="w-3 h-3 text-warning" />
            <span>PB {highScore.toLocaleString()}</span>
          </span>
        )}

        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl border border-border bg-surface hover:bg-elevated text-text-secondary hover:text-text-primary transition-colors"
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}

        {rightActions}
      </div>
    </div>
  );
}
