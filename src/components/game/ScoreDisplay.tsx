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
      initial={animate ? { opacity: 0, scale: 0.9, y: 20 } : false}
      animate={animate ? { opacity: 1, scale: 1, y: 0 } : false}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Main Factor Score */}
      <motion.div
        initial={animate ? { opacity: 0, scale: 0.5 } : false}
        animate={animate ? { opacity: 1, scale: 1 } : false}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl" style={{ backgroundColor: `${color}1A`, borderColor: `${color}40` }}>
          <Icon className="w-8 h-8" style={{ color }} />
          <motion.span
            initial={animate ? { opacity: 0 } : false}
            animate={animate ? { opacity: 1 } : false}
            transition={{ delay: 0.3 }}
            className="text-6xl sm:text-8xl font-mono font-bold tabular-nums tracking-tighter"
            style={{ color }}
          >
            {formatFactor(factor)}
          </motion.span>
        </div>
        
        <motion.p
          initial={animate ? { opacity: 0, y: 10 } : false}
          animate={animate ? { opacity: 1, y: 0 } : false}
          transition={{ delay: 0.4 }}
          className="mt-3 text-lg font-medium uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </motion.p>
      </motion.div>
      
      {/* Comparison */}
      <motion.div
        initial={animate ? { opacity: 0, y: 20 } : false}
        animate={animate ? { opacity: 1, y: 0 } : false}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-col gap-4 max-w-md mx-auto mt-8 bg-elevated rounded-2xl p-6 border border-border"
      >
        <div className="flex justify-between items-center pb-4 border-b border-border/50">
          <span className="text-text-secondary font-medium">Your estimate</span>
          <span className="text-2xl font-mono font-bold text-text-primary">
            {formatNumber(guess)} <span className="text-sm font-normal text-text-secondary">{unit}</span>
          </span>
        </div>
        <div className="flex justify-between items-center pb-4 border-b border-border/50">
          <span className="text-text-secondary font-medium">Actual answer</span>
          <span className="text-2xl font-mono font-bold text-text-primary">
            {formatNumber(referenceAnswer)} <span className="text-sm font-normal text-text-secondary">{unit}</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary font-medium">Difference</span>
          <span className={cn("text-2xl font-mono font-bold", isOverestimate ? 'text-error' : 'text-success')}>
            {isOverestimate ? '+' : '-'}{formatNumber(difference)} <span className="text-sm font-normal text-text-secondary opacity-70">{unit}</span>
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
