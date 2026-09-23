// src/app/(game)/play/game-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, HelpCircle, Settings, Target, Trophy } from 'lucide-react';
import { useGameStore } from '@/lib/store/gameStore';
import { useGame } from '@/lib/hooks/useGame';
import { NumericInput } from '@/components/game/NumericInput';
import { SubmitButton } from '@/components/game/SubmitButton';
import { ResultReveal } from '@/components/game/ResultReveal';
import { HintButton } from '@/components/game/HintButton';
import { CalculatorPanel } from '@/components/game/Calculator';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/lib/hooks/useAuth';
import { CATEGORY_MAP, DIFFICULTIES } from '@/lib/constants';
import { formatLarge as formatNumber } from '@/lib/utils/number-parser';
import { cn } from '@/lib/utils/formatting';
import { Calculator as CalcIcon } from 'lucide-react';

import { useSearchParams } from 'next/navigation';

export function GameClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challenge');
  const stageId = searchParams.get('stage');
  
  const {
    currentQuestion,
    userGuess,
    parsedGuess,
    isSubmitting,
    showResult,
    result,
    streak,
    questionsAnswered,
    isLoading,
    fetchQuestion,
    submitGuess,
    handleInputChange,
    nextQuestion,
    settings,
  } = useGame();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  
  // Auto-fetch question on mount
  useEffect(() => {
    if (!currentQuestion && !isLoading) {
      if (challengeId) {
        fetchQuestion({ challengeId });
      } else if (stageId) {
        fetchQuestion({ stageId });
      } else {
        fetchQuestion();
      }
    }
  }, [currentQuestion, isLoading, fetchQuestion, challengeId, stageId]);
  
  const handleSubmit = () => {
    if (parsedGuess.value && !isSubmitting) {
      submitGuess();
      setHintUsed(false);
    }
  };
  
  const handleHintUsed = (hint: string) => {
    setHintUsed(true);
    // Track hint usage for potential scoring adjustments
  };
  
  const handleReasoningSubmit = (reasoning: string) => {
    // In production, save to database
    console.log('Reasoning submitted:', reasoning);
  };
  
  if (isLoading && !currentQuestion) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[rgb(var(--primary))]" />
      </div>
    );
  }
  
  if (!currentQuestion) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Target className="w-16 h-16 mx-auto mb-4 text-[rgb(var(--primary))]" />
          <h2 className="text-2xl font-bold mb-2">No questions available</h2>
          <p className="text-[rgb(var(--muted-foreground))] mb-6">
            Check your connection or try a different category/difficulty.
          </p>
          <button onClick={() => fetchQuestion()} className="btn-primary">
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }
  
  const category = CATEGORY_MAP[currentQuestion.category];
  const difficulty = DIFFICULTIES[currentQuestion.difficulty];
  const stage = stageId ? require('@/lib/constants/ladder').LADDER_STAGES.find((s: any) => s.id === stageId) : null;
  
  return (
    <div className="flex-1 flex flex-col lg:flex-row justify-center w-full px-4 py-6 sm:py-12 gap-6 lg:gap-8 max-w-7xl mx-auto">
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto bg-surface border border-border/50 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-accent/5 blur-[100px] pointer-events-none rounded-t-[2.5rem]" />

        {/* Header Stats */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12 relative z-10"
        >
          <div className="flex items-center gap-4">
            {stage && (
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm bg-accent/20 text-accent flex items-center gap-1.5">
                <span>{stage.icon}</span> {stage.name}
              </span>
            )}
            {!stage && category && (
              <span
                className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest hidden sm:inline-block shadow-sm"
                style={{ backgroundColor: category.accentColor || (category.color + '20'), color: category.color }}
              >
                {category.name}
              </span>
            )}
            {!stage && (
              <span
                className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm"
                style={{ backgroundColor: difficulty.bgColor, color: difficulty.color }}
              >
                {difficulty.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 bg-elevated/50 p-1.5 rounded-2xl backdrop-blur-md border border-border/50 shadow-sm">
            {streak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/20 text-success text-sm font-bold"
              >
                <span className="relative">🔥</span>
                <span>{streak}</span>
              </motion.div>
            )}
            <span className="text-sm font-bold text-text-secondary hidden sm:inline-block px-3">
              Q{questionsAnswered + 1}
            </span>
            <button
              onClick={() => window.location.href = '/leaderboard'}
              className="p-2.5 rounded-xl hover:bg-surface hover:shadow-sm transition-all text-text-secondary hover:text-accent"
              title="Leaderboard"
            >
              <Trophy className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className={cn(
                "p-2.5 rounded-xl transition-all shadow-sm",
                showCalculator ? "bg-accent/20 text-accent" : "hover:bg-surface text-text-secondary hover:text-text-primary"
              )}
              title="Calculator"
            >
              <CalcIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl hover:bg-surface hover:shadow-sm transition-all text-text-secondary hover:text-text-primary"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            {user ? (
              <button
                onClick={() => window.location.href = '/profile'}
                className="px-4 py-2 bg-elevated text-text-primary font-bold rounded-xl hover:bg-border transition-colors text-sm shadow-sm"
              >
                Profile
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-accent text-background font-bold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </motion.div>
      
      {/* Question Card */}
      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key="question"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
            className="space-y-10 relative z-10 flex flex-col flex-1 justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center space-y-6 max-w-3xl mx-auto"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-balance text-text-primary drop-shadow-sm">
                {currentQuestion.text}
              </h1>
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-elevated border border-border shadow-inner">
                <span className="text-text-secondary text-sm font-bold uppercase tracking-widest">Unit</span>
                <span className="font-mono font-bold text-accent text-lg">{currentQuestion.unit}</span>
              </div>
            </motion.div>
            
            <NumericInput
              value={userGuess}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              disabled={isSubmitting}
              error={parsedGuess.error}
              autoFocus={!showResult}
            />
            
            <div className="flex flex-col sm:flex-row gap-3">
              <SubmitButton onClick={handleSubmit} isLoading={isSubmitting} disabled={!parsedGuess.value || isSubmitting} />
              <HintButton questionId={currentQuestion.id} onHintUsed={handleHintUsed} disabled={isSubmitting || showResult} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ResultReveal
              question={currentQuestion}
              result={result!}
              onNext={() => {
                nextQuestion();
                if (stageId) fetchQuestion({ stageId });
                else if (challengeId) fetchQuestion({ challengeId });
                else fetchQuestion();
              }}
              onReasoningSubmit={handleReasoningSubmit}
              isGuest={!user}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Side / Bottom Panel for Calculator */}
      <AnimatePresence>
        {showCalculator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full lg:w-auto flex-shrink-0 lg:pt-[88px]"
          >
            <CalculatorPanel onUseResult={(val) => {
              handleInputChange(val);
              // Optionally close on mobile after use to save space
              if (window.innerWidth < 1024) setShowCalculator(false);
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}