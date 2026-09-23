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
        'w-full sm:w-auto px-10 py-4 rounded-xl font-bold text-lg flex-1 justify-center flex',
        'bg-accent text-background hover:bg-accent-hover',
        'transition-colors duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
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
            <span>Submit Estimate</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </span>
    </motion.button>
  );
}
