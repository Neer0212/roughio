'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator as CalcIcon, X, Delete } from 'lucide-react';
import { cn } from '@/lib/utils/formatting';

interface CalculatorProps {
  onUseResult?: (result: string) => void;
}

export function CalculatorPanel({ onUseResult }: CalculatorProps) {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handlePress = (val: string) => {
    if (result !== null && !['+', '-', '*', '/'].includes(val)) {
      setExpression(val);
      setResult(null);
    } else if (result !== null) {
      setExpression(result + val);
      setResult(null);
    } else {
      setExpression(prev => prev + val);
    }
  };

  const handleCalculate = () => {
    if (!expression) return;
    try {
      // Safe eval of basic math
      const sanitized = expression.replace(/[^0-9+\-*/.]/g, '');
      const evaluated = new Function(`return (${sanitized})`)();
      if (typeof evaluated === 'number' && !isNaN(evaluated)) {
        setResult(evaluated.toString());
      } else {
        setResult('Error');
      }
    } catch {
      setResult('Error');
    }
  };

  const handleClear = () => {
    setExpression('');
    setResult(null);
  };

  const handleDelete = () => {
    if (result !== null) {
      setResult(null);
      setExpression('');
    } else {
      setExpression(prev => prev.slice(0, -1));
    }
  };

  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+'
  ];

  return (
    <div className="bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-2xl p-5 shadow-xl w-72 flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-[rgb(var(--muted-foreground))]">
        <CalcIcon className="w-4 h-4" />
        <span className="text-sm font-medium uppercase tracking-wider">Calculator</span>
      </div>

      <div className="bg-[rgb(var(--background))] border border-[rgb(var(--border))] rounded-xl p-3 mb-4 h-20 flex flex-col justify-end items-end overflow-hidden">
        <div className="text-sm text-[rgb(var(--muted-foreground))] tracking-wider truncate w-full text-right h-5">
          {expression || ' '}
        </div>
        <div className={cn(
          "text-2xl font-mono font-bold truncate w-full text-right",
          result === 'Error' ? "text-[rgb(var(--destructive))]" : "text-[rgb(var(--foreground))]"
        )}>
          {result !== null ? result : (expression || '0')}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <button onClick={handleClear} className="col-span-2 py-3 rounded-xl bg-[rgb(var(--destructive))/0.1] text-[rgb(var(--destructive))] font-medium hover:bg-[rgb(var(--destructive))/0.2] transition-colors">
          Clear
        </button>
        <button onClick={handleDelete} className="col-span-2 py-3 rounded-xl bg-[rgb(var(--muted))] text-[rgb(var(--foreground))] font-medium flex justify-center items-center hover:bg-[rgb(var(--muted))/80] transition-colors">
          <Delete className="w-5 h-5" />
        </button>
        
        {buttons.map((btn) => (
          <button
            key={btn}
            onClick={() => btn === '=' ? handleCalculate() : handlePress(btn)}
            className={cn(
              "py-3 rounded-xl font-mono text-lg font-medium transition-colors active:scale-95",
              ['/', '*', '-', '+', '='].includes(btn) 
                ? "bg-[rgb(var(--primary))/0.15] text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))/0.25]" 
                : "bg-[rgb(var(--muted))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border))]"
            )}
          >
            {btn}
          </button>
        ))}
      </div>

      {onUseResult && (
        <button
          onClick={() => {
            if (result && result !== 'Error') onUseResult(result);
            else if (expression) onUseResult(expression);
          }}
          className="w-full py-3 rounded-xl bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] font-medium hover:opacity-90 transition-opacity active:scale-95"
        >
          Use in Estimate
        </button>
      )}
    </div>
  );
}
