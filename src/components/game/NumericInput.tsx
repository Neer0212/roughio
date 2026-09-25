// src/components/game/NumericInput.tsx
'use client';

import { useEffect, useRef, useState, ForwardRefExoticComponent, RefAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/formatting';
import { Calculator, X } from 'lucide-react';

interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  error?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
}

export const NumericInput = Object.assign(
  function NumericInput({ value, onChange, onSubmit, disabled, error, placeholder = 'Estimate...', autoFocus = true }: NumericInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [scratchpadText, setScratchpadText] = useState('');
    
    useEffect(() => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus();
      }
    }, [autoFocus]);
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }
      if (e.key === 'Escape') {
        (e.target as HTMLInputElement).blur();
      }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      const rawVal = val.replace(/,/g, '');
      
      // Auto-add commas if they are typing a pure integer
      if (/^[0-9]+$/.test(rawVal)) {
        val = Number(rawVal).toLocaleString('en-US');
      }
      
      onChange(val);
    };
    
    const handleClear = () => {
      onChange('');
      inputRef.current?.focus();
    };
    
    return (
      <div className="relative w-full max-w-2xl mx-auto mt-8">
        <motion.div
          initial={false}
          className="relative"
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              'w-full max-w-full overflow-hidden text-ellipsis px-2 py-4 sm:py-5 text-left text-4xl sm:text-5xl lg:text-6xl font-mono font-bold bg-transparent border-b-2 border-white/50 rounded-none',
              'text-white placeholder-white/30',
              'transition-all duration-200',
              'focus:outline-none focus:border-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-error focus:border-error'
            )}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <AnimatePresence mode="wait">
              {value && !disabled && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                  onClick={handleClear}
                  className="p-2 text-text-secondary hover:text-error transition-colors rounded-xl hover:bg-surface"
                  aria-label="Clear input"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-3 text-center text-sm font-bold text-error flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  },
  { displayName: 'NumericInput' }
) as ForwardRefExoticComponent<NumericInputProps & RefAttributes<HTMLInputElement>>;
