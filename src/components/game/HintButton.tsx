// src/components/game/HintButton.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/formatting';

interface HintButtonProps {
  questionId: string;
  onHintUsed: (hint: string) => void;
  disabled?: boolean;
}

export function HintButton({ questionId, onHintUsed, disabled }: HintButtonProps) {
  const [hint, setHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [used, setUsed] = useState(false);
  
  const handleClick = async () => {
    if (used || isLoading) return;
    
    setIsLoading(true);
    // In production, fetch hint from server
    await new Promise(r => setTimeout(r, 800));
    
    const hints = [
      "Think about the total population first, then estimate what fraction is relevant.",
      "Break it down: estimate the daily amount per person, then multiply by the relevant population.",
      "Consider the difference between total users and active users — not everyone participates daily.",
      "Start with a known reference point (e.g., a similar country or industry) and scale from there.",
      "Estimate the order of magnitude first. Is it thousands? Millions? Billions?",
      "Think about the lifecycle: production, usage, replacement rate. Which matters most?",
      "Consider geographic distribution — is this concentrated in certain regions?",
      "What's the time unit? Daily, yearly, per capita? Get the units right first.",
    ];
    
    const randomHint = hints[Math.floor(Math.random() * hints.length)];
    setHint(randomHint);
    setUsed(true);
    onHintUsed(randomHint);
    setIsLoading(false);
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
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white',
          used && 'bg-white/20 border-white/20 text-white'
        )}
      >
        <Lightbulb className="w-5 h-5" />
      </motion.button>
      
      <AnimatePresence mode="wait">
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-4 p-5 rounded-2xl bg-accent/10 border border-accent/20 text-base text-text-primary overflow-hidden"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
              <p className="font-medium">{hint}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
