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
        'w-full sm:w-auto px-10 py-4 rounded-full font-bold text-lg flex-1 sm:flex-none justify-center flex',
        'bg-transparent border-2 border-white/50 text-white hover:bg-white hover:text-accent',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white',
        className
      )}
    >
      <span className="flex items-center gap-2 tracking-widest uppercase text-sm">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Locking...</span>
          </>
        ) : (
          <>
            <span>Lock it in</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </span>
    </motion.button>
  );
}
