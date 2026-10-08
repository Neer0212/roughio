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

  // AI Feedback generation
  useEffect(() => {
    if (hasRequestedFeedback.current || aiFeedback || isGeneratingFeedback || feedbackError) return;
    hasRequestedFeedback.current = true;

    const generateFeedback = async () => {
      setIsGeneratingFeedback(true);
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `You are the post-answer feedback system for Roughio, an estimation game.

The player has already submitted their estimate and the reference answer has already been revealed.

Your job is to give concise, useful feedback about the player's estimation.

Question:
${question.text}

Unit:
${question.unit}

Category:
${question.category}

Difficulty:
${question.difficulty}

Player estimate:
${result.guess}

Reference answer:
${result.referenceAnswer}

Score classification:
${result.classification}

Score factor:
${result.factor.toFixed(2)}x

Player reasoning:
No reasoning provided

Hint used:
${hintUsed ? 'yes' : 'no'}

Rules:
- The reference answer has already been revealed to the player.
- Do not change or recalculate the official score.
- Do not invent facts that are not supported by the information provided.
- Explain how close or far the estimate was in practical terms.
- If reasoning was provided, comment on whether the estimation approach was sensible.
- If the estimate was far from the reference, identify what kind of assumption may have caused the error when reasonably inferable.
- If the estimate was close, explain what was done well.
- Keep the feedback concise: approximately 2-4 sentences.
- Be constructive and factual.
- Do not use excessive praise or motivational language.
- Do not repeat the entire question.
- Do not expose internal implementation details.`
          })
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

    generateFeedback();
  }, [question.id, result.guess, hintUsed, aiFeedback, isGeneratingFeedback, feedbackError]);

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
            className="flex flex-wrap justify-center gap-3 mt-4"
          >
            {result.achievements.map((ach: string, i: number) => (
              <div key={i} className="px-4 py-2 rounded-full bg-warning text-accent font-black text-sm uppercase tracking-widest shadow-md transform rotate-1 hover:rotate-0 transition-transform">
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

        {/* AI Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="bg-white/10 rounded-[2rem] p-8 shadow-xl mt-8 max-w-2xl mx-auto text-left border border-white/20"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-accent text-accent flex items-center justify-center mt-1">
              <Brain className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-3">AI Feedback</h3>
              {isGeneratingFeedback ? (
                <div className="flex items-center gap-2 text-white/60">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating feedback...</span>
                </div>
              ) : feedbackError ? (
                <p className="text-white/60 text-sm">AI feedback is temporarily unavailable.</p>
              ) : (
                <p className="text-base font-medium leading-relaxed whitespace-pre-line text-white">
                  {aiFeedback}
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
