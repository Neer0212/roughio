// src/components/game/ReasoningInput.tsx
'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils/formatting';
import type { Question } from '@/lib/types/game';

interface ReasoningInputProps {
  question: Question;
  onSubmit: (reasoning: string) => void;
  isGuest?: boolean;
}

export function ReasoningInput({ question, onSubmit, isGuest = false }: ReasoningInputProps) {
  const [reasoning, setReasoning] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasoning.trim()) return;
    
    onSubmit(reasoning.trim());
    setSubmitted(true);
    
    // Simulate AI feedback generation
    if (!isGuest) {
      setIsGenerating(true);
      // In production, call AI feedback API
      setTimeout(() => {
        setFeedback(generateMockFeedback(question, reasoning));
        setShowFeedback(true);
        setIsGenerating(false);
      }, 1500);
    }
  };
  
  if (submitted && !showFeedback && !isGenerating) return null;
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="space-y-4"
      >
        {!submitted ? (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <label className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--muted-foreground))]">
              <Brain className="w-5 h-5 text-[rgb(var(--primary))]" />
              How did you arrive at your estimate?
            </label>
            
            <textarea
              ref={textareaRef}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="I assumed X people, each doing Y per day, so..."
              rows={3}
              className="w-full px-4 py-3 bg-[rgb(var(--background))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--foreground))] placeholder-[rgb(var(--muted-foreground))] focus:outline-none focus:border-[rgb(var(--primary))] resize-none transition-colors"
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!reasoning.trim()}
                className="flex-1 btn-primary"
              >
                <Send className="w-4 h-4 mr-1" />
                Submit Reasoning
              </button>
              <button
                type="button"
                onClick={() => { onSubmit(''); setSubmitted(true); }}
                className="btn-secondary"
              >
                Skip
              </button>
            </div>
          </motion.form>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-2xl p-6"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[rgb(var(--primary))/0.15] flex items-center justify-center">
                  <Brain className="w-5 h-5 text-[rgb(var(--primary))]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Your reasoning</h3>
                  <p className="text-[rgb(var(--muted-foreground))] leading-relaxed whitespace-pre-line">{reasoning}</p>
                </div>
              </div>
            </motion.div>
            
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[rgb(var(--primary))/0.1] border border-[rgb(var(--primary))/0.3] rounded-2xl p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[rgb(var(--primary))/0.2] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[rgb(var(--primary))]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-[rgb(var(--primary))]">AI Feedback</h3>
                    <p className="text-[rgb(var(--foreground))] leading-relaxed whitespace-pre-line">{feedback}</p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-3 py-4 text-[rgb(var(--muted-foreground))]"
              >
                <div className="w-6 h-6 border-2 border-[rgb(var(--primary))] border-t-transparent rounded-full animate-spin" />
                <span>Analyzing your reasoning...</span>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function generateMockFeedback(question: Question, userReasoning: string): string {
  // In production, this would call the AI feedback API
  const feedbacks = [
    "Good breakdown! You identified the key variables. Consider refining your assumption about the average usage per person — it might be higher/lower than you estimated.",
    "Solid Fermi approach! You decomposed the problem well. One thing to watch: when multiplying many estimates together, errors compound. Try to anchor at least one variable to known data.",
    "Nice reasoning! You're thinking in the right direction. For future estimates, try to find a known reference point (like a similar country or time period) to calibrate your assumptions.",
    "Great step-by-step thinking! You caught the main factors. Consider whether there are seasonal variations or regional differences that could significantly affect the answer.",
  ];
  return feedbacks[Math.floor(Math.random() * feedbacks.length)];
}
