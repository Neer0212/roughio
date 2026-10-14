// src/components/game/HintButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/formatting';

interface HintButtonProps {
  question: {
    id: string;
    text: string;
    unit: string;
    category: string;
    difficulty: string;
  };
  onHintUsed: (hint: string) => void;
  disabled?: boolean;
}

function getQuestionSpecificFallbackHint(question: HintButtonProps['question']): string {
  const unitStr = question.unit ? ` (${question.unit})` : '';
  const categoryStr = question.category ? ` for this ${question.category} problem` : '';
  return `To estimate this${categoryStr}, try breaking it down into a familiar baseline number and scaling by the relevant rate, population, or dimensions${unitStr ? ` to reach ${question.unit}` : ''}.`;
}

export function HintButton({
  question,
  onHintUsed,
  disabled,
}: HintButtonProps) {
  const [hint, setHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [used, setUsed] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setHint(null);
    setUsed(false);
  }, [question.id]);

  const handleClick = async () => {
    if (used || isLoading || disabled) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: 'hint',
          questionId: question.id,
          questionText: question.text,
          unit: question.unit,
          category: question.category,
          difficulty: question.difficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.details?.error?.message ||
            data?.error ||
            'Failed to generate hint'
        );
      }

      if (!data.reply) {
        throw new Error('AI returned an empty hint');
      }

      setHint(data.reply);
      setUsed(true);

      onHintUsed(data.reply);
    } catch (error: any) {
      console.error('Failed to generate AI hint:', error);

      // Question-specific fallback if network or provider fails
      const fallbackHint = getQuestionSpecificFallbackHint(question);

      setHint(fallbackHint);

      // We only count the hint as used if the AI actually responded.
      // This means a failed AI request does not penalize the player.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        onClick={handleClick}
        disabled={used || isLoading || disabled}
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-xl font-bold',
          'bg-surface border border-border text-text-secondary hover:text-warning hover:border-warning/40 hover:bg-elevated',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          used && 'bg-warning/10 border-warning/30 text-warning'
        )}
        title={used ? 'Hint used' : 'Get AI hint'}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-warning" />
        ) : (
          <Lightbulb className="w-5 h-5" />
        )}
      </motion.button>

      <AnimatePresence mode="wait">
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-4 p-4 rounded-2xl bg-surface border border-warning/30 text-sm text-text-primary overflow-hidden shadow-lg"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />

              <div>
                <p className="text-[10px] uppercase font-mono tracking-widest font-bold text-warning mb-1">
                  AI Estimation Strategy
                </p>

                <p className="font-medium text-text-secondary leading-relaxed">
                  {hint}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}