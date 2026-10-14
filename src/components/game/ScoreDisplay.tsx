// src/components/game/ScoreDisplay.tsx
'use client';

import { motion } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/formatting';
import { formatFactor, classifyScore, SCORE_LABELS, SCORE_COLORS } from '@/lib/constants/scoring';
import { formatLarge as formatNumber } from '@/lib/utils/number-parser';
import type { ScoreClassification } from '@/lib/types/game';

interface ScoreDisplayProps {
  factor: number;
  guess: number;
  referenceAnswer: number;
  unit: string;
  classification: ScoreClassification;
  isOverestimate: boolean;
  difference: number;
  animate?: boolean;
}

export function ScoreDisplay({ factor, guess, referenceAnswer, unit, classification, isOverestimate, difference, animate = true }: ScoreDisplayProps) {
  const color = SCORE_COLORS[classification];
  const label = SCORE_LABELS[classification];
  
  const icons = {
    perfect: Target,
    bullseye: Target,
    excellent: Target,
    close: TrendingUp,
    not_bad: TrendingUp,
    way_off: TrendingDown,
    chaos: Minus,
  };
  
  const Icon = icons[classification];
  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.95, y: 10 } : false}
      animate={animate ? { opacity: 1, scale: 1, y: 0 } : false}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-8 w-full mt-2"
    >
      {/* Top Row: Guess and Answer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* You Guessed */}
        <div className="bg-surface/80 rounded-2xl p-6 border border-border flex flex-col justify-center text-left">
          <span className="text-text-secondary font-mono font-bold uppercase tracking-widest text-xs mb-2">You Guessed</span>
          <span className="text-3xl sm:text-4xl font-mono font-black text-white">{formatNumber(guess)}</span>
          <span className="text-text-muted text-xs font-mono uppercase tracking-wider mt-1">{unit}</span>
        </div>
        
        {/* Answer */}
        <div className="bg-surface rounded-2xl p-6 border-2 border-accent/60 shadow-[0_0_20px_rgba(204,255,0,0.12)] flex flex-col justify-center text-left">
          <span className="text-accent font-mono font-bold uppercase tracking-widest text-xs mb-2">Actual Answer</span>
          <span className="text-3xl sm:text-4xl font-mono font-black text-white">{formatNumber(referenceAnswer)}</span>
          <span className="text-accent/80 text-xs font-mono uppercase tracking-wider mt-1">{unit}</span>
        </div>
      </div>
      
      {/* Bottom Row: Score */}
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left mt-2 p-6 rounded-2xl bg-surface/50 border border-border">
        <span className="text-text-secondary font-mono font-bold uppercase tracking-widest text-xs mb-2">Order of Magnitude Result</span>
        
        <motion.div
          initial={animate ? { opacity: 0, x: -20 } : false}
          animate={animate ? { opacity: 1, x: 0 } : false}
          transition={{ delay: 0.2 }}
        >
          <div className="text-5xl sm:text-7xl font-mono font-black text-accent leading-none tracking-tight">
            {formatFactor(factor)}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {isOverestimate ? 'Too High' : 'Too Low'}
          </div>
        </motion.div>
        
        <motion.div 
          initial={animate ? { opacity: 0 } : false}
          animate={animate ? { opacity: 1 } : false}
          transition={{ delay: 0.4 }}
          className="mt-4 text-sm font-mono text-text-secondary leading-snug"
        >
          <span className="text-accent font-bold">{label}</span> • Difference of {formatNumber(difference)} {unit}
        </motion.div>
      </div>
    </motion.div>
  );
}
