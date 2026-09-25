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
import { BackButton } from '@/components/layout/BackButton';

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
      import('@/lib/utils/audio').then(({ audio }) => audio.playLockSound());
      submitGuess(hintUsed);
    }
  };
  
  const handleHintUsed = (hint: string) => {
    setHintUsed(true);
    // Track hint usage for potential scoring adjustments
  };
  
  const handleReasoningSubmit = async (reasoning: string) => {
    if (!reasoning || !user) return;
    const { lastAttemptId } = useGameStore.getState();
    if (!lastAttemptId) return;

    try {
      await fetch('/api/attempts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: lastAttemptId, reasoning }),
      });
    } catch (e) {
      console.error('Failed to save reasoning', e);
    }
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
    <div className="flex-1 min-h-[100dvh] flex flex-col lg:flex-row justify-center items-center w-full px-4 py-4 sm:p-6 lg:p-8 gap-6 max-w-7xl mx-auto">
      <div className={cn("flex flex-col w-full max-w-[900px] text-white rounded-[2.5rem] p-6 sm:p-8 md:p-12 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-colors duration-500", showResult ? "bg-info" : "bg-accent")}>

        {/* Header Stats */}
        <BackButton fallback="/" />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 sm:mb-12 relative z-10"
        >
          <div className="flex items-center flex-wrap gap-2 sm:gap-4">
            {stage && (
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white/20 text-white border border-white/30 flex items-center gap-1.5">
                <span>{stage.icon}</span> {stage.name}
              </span>
            )}
            {!stage && category && (
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest hidden sm:inline-block bg-white/20 text-white border border-white/30">
                {category.name}
              </span>
            )}
            {!stage && (
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white/20 text-white border border-white/30">
                {difficulty.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {streak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 text-white text-sm font-bold border border-white/30"
              >
                <span className="relative">🔥</span>
                <span>{streak}</span>
              </motion.div>
            )}
            <span className="text-sm font-bold text-white/80 hidden sm:inline-block px-3">
              Q{questionsAnswered + 1}
            </span>
            <button
              onClick={() => window.location.href = '/leaderboard'}
              className="p-2.5 rounded-xl hover:bg-white/20 transition-all text-white/80 hover:text-white"
              title="Leaderboard"
            >
              <Trophy className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                showCalculator ? "bg-white/30 text-white" : "hover:bg-white/20 text-white/80 hover:text-white"
              )}
              title="Calculator"
            >
              <CalcIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl hover:bg-white/20 transition-all text-white/80 hover:text-white"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            {user ? (
              <button
                onClick={() => window.location.href = '/profile'}
                className="px-5 py-2.5 bg-white text-accent font-bold rounded-full hover:bg-gray-100 transition-colors text-sm shadow-sm ml-2"
              >
                Profile
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-5 py-2.5 bg-white text-accent font-bold rounded-full hover:bg-gray-100 transition-colors text-sm shadow-sm ml-2"
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
            className="space-y-6 relative z-10 flex flex-col flex-1 justify-center py-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center space-y-6 max-w-3xl mx-auto"
            >
              <h1 className="text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[1.05] font-extrabold text-balance text-white mb-4">
                {currentQuestion.text}
              </h1>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20">
                <span className="text-white/80 text-sm font-bold uppercase tracking-widest">Unit</span>
                <span className="font-mono font-bold text-white text-lg">{currentQuestion.unit}</span>
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
            
            <div className="flex items-center justify-between w-full mt-4">
              <HintButton questionId={currentQuestion.id} onHintUsed={handleHintUsed} disabled={isSubmitting || showResult} />
              <SubmitButton onClick={handleSubmit} isLoading={isSubmitting} disabled={!parsedGuess.value || isSubmitting} />
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
