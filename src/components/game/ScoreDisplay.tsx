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
            className="text-4xl sm:text-5xl font-mono font-bold tabular-nums"
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Your Guess"
          value={formatNumber(guess)}
          unit={unit}
          animate={animate}
          delay={0.2}
        />
        <StatCard
          label="Actual"
          value={formatNumber(referenceAnswer)}
          unit={unit}
          animate={animate}
          delay={0.3}
        />
        <StatCard
          label={isOverestimate ? 'Over by' : 'Under by'}
          value={formatNumber(difference)}
          unit={unit}
          animate={animate}
          delay={0.4}
          variant={isOverestimate ? 'over' : 'under'}
        />
        <StatCard
          label="Ratio"
          value={isOverestimate ? (guess / referenceAnswer).toFixed(2) + '×' : (referenceAnswer / guess).toFixed(2) + '×'}
          animate={animate}
          delay={0.5}
          variant="ratio"
        />
      </div>
    </motion.div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  animate?: boolean;
  delay?: number;
  variant?: 'default' | 'over' | 'under' | 'ratio';
}

function StatCard({ label, value, unit, animate = true, delay = 0, variant = 'default' }: StatCardProps) {
  const variantColors = {
    default: 'text-[rgb(var(--foreground))]',
    over: 'text-[rgb(var(--destructive))]',
    under: 'text-[rgb(var(--success))]',
    ratio: 'text-[rgb(var(--primary))]',
  };
  
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ delay: 0.2 + delay, duration: 0.4 }}
      className="text-center p-4 rounded-xl bg-[rgb(var(--secondary))] border border-[rgb(var(--border))]"
    >
      <p className="text-xs font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-2xl sm:text-3xl font-mono font-bold tabular-nums', variantColors[variant])}>
        {value}
        {unit && <span className="text-lg font-normal text-[rgb(var(--muted-foreground))] ml-1">{unit}</span>}
      </p>
    </motion.div>
  );
}
