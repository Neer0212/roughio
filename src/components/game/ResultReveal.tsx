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
        <div className="text-center mb-10">
          <h2 className="text-[clamp(2.5rem,5vw,5rem)] leading-[1.05] font-extrabold text-balance text-white">
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
          className="bg-white rounded-[2rem] p-8 shadow-xl mt-8 max-w-2xl mx-auto text-left text-text-primary"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-error text-error flex items-center justify-center opacity-70 mt-1">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-medium leading-relaxed whitespace-pre-line text-text-primary/90">
                {question.estimationApproach}
              </p>
              {question.source && (
                <p className="mt-4 text-sm font-bold text-text-secondary uppercase tracking-widest">
                  Source: <a href={question.source || '#'} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline ml-1">{question.sourceName || 'Link'}</a>
                  {question.referencePeriod && <span className="ml-2">· {question.referencePeriod}</span>}
                </p>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
          <ShareButton questionId={question.id} result={result} />
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            onClick={onNext}
            className="w-full sm:w-auto px-10 py-4 bg-white text-info font-bold text-lg rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <span>Next Question</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
