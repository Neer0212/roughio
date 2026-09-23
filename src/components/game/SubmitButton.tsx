// src/components/game/SubmitButton.tsx
'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/formatting';

interface SubmitButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function SubmitButton({ onClick, disabled, isLoading, className }: SubmitButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'w-full sm:w-auto px-10 py-5 rounded-2xl font-extrabold text-xl flex-1 justify-center flex',
        'bg-accent text-background shadow-[0_4px_0_rgb(10,135,95)] active:shadow-[0_0px_0_rgb(10,135,95)] active:translate-y-1',
        'transition-all duration-100',
        'hover:brightness-110',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:shadow-none disabled:translate-y-0',
        className
      )}
    >
      <span className="flex items-center gap-2">
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Submitting...</span>
          </>
        ) : (
          <>
            <span>Submit Guess</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </span>
    </motion.button>
  );
}
