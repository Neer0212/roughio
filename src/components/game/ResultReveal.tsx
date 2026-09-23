// src/components/game/ResultReveal.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Brain, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils/formatting';
import { ScoreDisplay } from './ScoreDisplay';
import { ReasoningInput } from './ReasoningInput';
import { ShareButton } from './ShareButton';
import type { AttemptResult, Question } from '@/lib/types/game';

interface ResultRevealProps {
  question: Question;
  result: AttemptResult;
  onNext: () => void;
  onReasoningSubmit: (reasoning: string) => void;
  showReasoning?: boolean;
  isGuest?: boolean;
}

export function ResultReveal({ question, result, onNext, onReasoningSubmit, showReasoning = true, isGuest = false }: ResultRevealProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 w-full max-w-3xl mx-auto"
      >
        {/* Question Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-balance text-[rgb(var(--foreground))]">
            {question.text}
          </h2>
        </div>
        
        {/* Score Display */}
        <ScoreDisplay
          factor={result.factor}
          guess={result.guess}
          referenceAnswer={result.referenceAnswer}
          unit={question.unit}
          classification={result.classification}
          isOverestimate={result.isOverestimate}
          difference={result.difference}
          animate={true}
        />
        
        {/* Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[rgb(var(--primary))/0.15] flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">How we estimated it</h3>
              <p className="text-[rgb(var(--muted-foreground))] leading-relaxed whitespace-pre-line">
                {question.estimationApproach}
              </p>
              {question.source && (
                <p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">
                  Source: <a href={question.source || '#'} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--primary))] hover:underline ml-1">{question.sourceName || 'Link'}</a>
                  {question.referencePeriod && <span className="ml-2">· {question.referencePeriod}</span>}
                </p>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* User Reasoning */}
        {showReasoning && (
          <ReasoningInput
            question={question}
            onSubmit={onReasoningSubmit}
            isGuest={isGuest}
          />
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-2 pt-4">
          <ShareButton questionId={question.id} result={result} />
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            onClick={onNext}
            className="flex-1 btn-primary py-4 text-lg"
          >
            <span className="flex items-center justify-center gap-2">
              Next Question
              <ArrowRight className="w-5 h-5" />
            </span>
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
