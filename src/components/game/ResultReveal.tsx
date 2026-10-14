// src/components/game/ResultReveal.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Brain, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils/formatting';
import { ScoreDisplay } from './ScoreDisplay';
import { ShareButton } from './ShareButton';
import type { AttemptResult, Question } from '@/lib/types/game';

interface ResultRevealProps {
  question: Question;
  result: AttemptResult;
  onNext: () => void;
  isGuest?: boolean;
  hintUsed?: boolean;
}

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export function ResultReveal({ question, result, onNext, isGuest = false, hintUsed = false }: ResultRevealProps) {
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const hasRequestedFeedback = useRef(false);

  // Reset feedback state when question changes
  useEffect(() => {
    setAiFeedback(null);
    setIsGeneratingFeedback(false);
    setFeedbackError(false);
  }, [question.id]);

  // Normal result sound
  useEffect(() => {
    import('@/lib/utils/audio').then(({ audio }) => {
      if (result.factor <= 1.5) {
        audio.playSuccessSound();
      } else if (result.factor >= 10) {
        audio.playFailSound();
      } else {
        audio.playNeutralSound();
      }
    });
  }, [result.factor]);

  // Optional on-demand AI Feedback generation
  const handleRequestFeedback = async () => {
    if (isGeneratingFeedback || aiFeedback) return;
    setIsGeneratingFeedback(true);
    setFeedbackError(false);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'feedback',
          questionId: question.id,
          questionText: question.text,
          unit: question.unit,
          category: question.category,
          difficulty: question.difficulty,
          guess: result.guess,
          referenceAnswer: result.referenceAnswer,
          factor: result.factor,
          classification: result.classification,
          hintUsed,
        }),
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      if (data.reply) {
        setAiFeedback(data.reply);
      } else {
        setFeedbackError(true);
      }
    } catch (err) {
      console.error('Failed to generate post-answer feedback:', err);
      setFeedbackError(true);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

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
        
        {/* Dynamic Achievements */}
        {result.achievements && result.achievements.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="flex flex-wrap justify-center gap-2 mt-4"
          >
            {result.achievements.map((ach: string, i: number) => (
              <div key={i} className="px-3.5 py-1.5 rounded-xl bg-warning/15 border border-warning/30 text-warning font-mono font-bold text-xs uppercase tracking-wider shadow-sm">
                {ach}
              </div>
            ))}
          </motion.div>
        )}
        
        {/* Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="bg-surface rounded-2xl p-6 sm:p-7 border border-border mt-6 max-w-2xl mx-auto text-left text-text-primary shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl border border-warning/40 text-warning bg-warning/10 flex items-center justify-center mt-1">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-warning block mb-2">
                Estimation Reasoning &amp; Steps
              </span>
              <p className="text-base font-medium leading-relaxed whitespace-pre-line text-text-primary/90">
                {question.estimationApproach}
              </p>
              {question.source && (
                <p className="mt-4 text-xs font-mono font-bold text-text-secondary uppercase tracking-widest">
                  Source: <a href={question.source || '#'} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline ml-1">{question.sourceName || 'Link'}</a>
                  {question.referencePeriod && <span className="ml-2">· {question.referencePeriod}</span>}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* AI Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="bg-surface rounded-2xl p-6 sm:p-7 border border-accent/25 mt-6 max-w-2xl mx-auto text-left shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl border border-accent/40 text-accent bg-accent/10 flex items-center justify-center mt-1">
              <Brain className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent">
                  AI Feedback &amp; Calibration
                </span>
                {!aiFeedback && !isGeneratingFeedback && (
                  <button
                    onClick={handleRequestFeedback}
                    className="text-xs font-mono font-bold text-[#090A0F] bg-accent hover:bg-accent-hover px-3 py-1 rounded-lg transition-colors shadow-sm"
                  >
                    Analyze Guess
                  </button>
                )}
              </div>
              {isGeneratingFeedback ? (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm font-mono">Analyzing estimate...</span>
                </div>
              ) : feedbackError ? (
                <div className="flex items-center justify-between">
                  <p className="text-text-secondary text-sm">AI feedback is temporarily unavailable.</p>
                  <button
                    onClick={handleRequestFeedback}
                    className="text-xs text-accent hover:underline ml-2"
                  >
                    Retry
                  </button>
                </div>
              ) : aiFeedback ? (
                <p className="text-sm font-medium leading-relaxed whitespace-pre-line text-text-primary">
                  {aiFeedback}
                </p>
              ) : (
                <p className="text-xs text-text-secondary font-mono">
                  Want an AI breakdown of your order of magnitude? Click &quot;Analyze Guess&quot; above.
                </p>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <ShareButton questionId={question.id} result={result} />
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            onClick={onNext}
            className="w-full sm:w-auto px-8 py-3.5 bg-accent text-[#090A0F] hover:bg-accent-hover font-mono font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(204,255,0,0.25)] flex items-center justify-center gap-2"
          >
            <span>Next Question</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
