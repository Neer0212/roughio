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
      <div className="grid grid-cols-2 gap-4">
        {/* You Guessed */}
        <div className="bg-white/10 rounded-3xl p-6 border border-white/20 flex flex-col justify-center text-left">
          <span className="text-white/90 font-bold uppercase tracking-widest text-xs mb-2">You Guessed</span>
          <span className="text-3xl sm:text-4xl font-black text-white">{formatNumber(guess)}</span>
        </div>
        
        {/* Answer */}
        <div className="bg-white rounded-3xl p-6 border-[3px] border-warning shadow-[6px_6px_0_var(--warning)] flex flex-col justify-center text-left">
          <span className="text-text-secondary font-bold uppercase tracking-widest text-xs mb-2">Answer</span>
          <span className="text-3xl sm:text-4xl font-black text-text-primary">{formatNumber(referenceAnswer)}</span>
          <span className="text-text-secondary text-sm font-bold uppercase tracking-wider mt-1">{unit}</span>
        </div>
      </div>
      
      {/* Bottom Row: Score */}
      <div className="flex flex-col items-start text-left mt-2">
        <span className="text-white/90 font-bold uppercase tracking-widest text-xs mb-2">You Landed</span>
        
        <motion.div
          initial={animate ? { opacity: 0, x: -20 } : false}
          animate={animate ? { opacity: 1, x: 0 } : false}
          transition={{ delay: 0.2 }}
        >
          <div className="text-[4rem] sm:text-[5.5rem] font-black text-warning leading-none tracking-tighter">
            {formatFactor(factor)}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-warning mt-1">
            {isOverestimate ? 'Too High' : 'Too Low'}
          </div>
        </motion.div>
        
        <motion.div 
          initial={animate ? { opacity: 0 } : false}
          animate={animate ? { opacity: 1 } : false}
          transition={{ delay: 0.4 }}
          className="mt-6 text-white font-bold leading-snug max-w-xs"
        >
          {label} • Difference of {formatNumber(difference)}
        </motion.div>
      </div>
    </motion.div>
  );
}
