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
          message: `You are the hint system for Roughio, an estimation game.

Question:
${question.text}

Unit:
${question.unit}

Category:
${question.category}

Difficulty:
${question.difficulty}

Give the player one short, useful hint.

Rules:
- Do NOT give the answer.
- Do NOT reveal the reference value.
- Do NOT calculate the final value.
- Help the player identify what they should estimate or consider.
- Keep it to 1-2 sentences.
- Do not say 'the answer is'.`
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
    } catch (error) {
      console.error('Failed to generate AI hint:', error);

      // Fallback if APInex fails
      const fallbackHint =
        'Break the problem into smaller quantities that are easier to estimate, then combine them.';

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
          'flex items-center justify-center w-14 h-14 rounded-full font-bold text-lg',
          'bg-transparent border-2 border-white/50 text-white hover:bg-white hover:text-accent',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'disabled:hover:bg-transparent disabled:hover:text-white',
          used && 'bg-white/20 border-white/20 text-white'
        )}
        title={used ? 'Hint used' : 'Get AI hint'}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
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
            className="mt-4 p-5 rounded-2xl bg-white/10 border border-white/20 text-base text-white overflow-hidden"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />

              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-white/60 mb-1">
                  AI Hint
                </p>

                <p className="font-medium leading-relaxed">
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