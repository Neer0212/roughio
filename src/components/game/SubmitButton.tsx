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
        'w-full sm:w-auto px-8 py-3.5 rounded-xl font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2',
        'bg-accent text-[#090A0F] hover:bg-accent-hover shadow-[0_0_20px_rgba(204,255,0,0.25)]',
        'transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-accent',
        className
      )}
    >
      <span className="flex items-center gap-2">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Locking...</span>
          </>
        ) : (
          <>
            <span>Lock It In</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </span>
    </motion.button>
  );
}
