// src/lib/hooks/useGame.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/lib/store/gameStore';
import { parseNumber } from '@/lib/utils/number-parser';
import { calculateFactor, classifyScore } from '@/lib/constants/scoring';
import type { Question, AttemptResult, ParseResult } from '@/lib/types/game';

export function useGame() {
  const {
    currentQuestion,
    userGuess,
    parsedGuess,
    isSubmitting,
    showResult,
    result,
    streak,
    questionsAnswered,
    setCurrentQuestion,
    setUserGuess,
    setParsedGuess,
    setSubmitting,
    setResult,
    nextQuestion,
    settings,
  } = useGameStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  
  // Fetch a new question
  const fetchQuestion = useCallback(async (options?: { category?: string; difficulty?: string; challengeId?: string; stageId?: string }) => {
    setIsLoading(true);
    try {
      if (options?.challengeId) {
        const response = await fetch(`/api/questions/${options.challengeId}`);
        if (!response.ok) throw new Error('Failed to fetch challenge question');
        const question = await response.json();
        setCurrentQuestion(question);
        return;
      }

      const params = new URLSearchParams();
      if (options?.category) params.set('category', options.category);
      if (options?.difficulty) params.set('difficulty', options.difficulty);
      if (options?.stageId) params.set('stage', options.stageId);
      
      if (settings.avoidRepeats) {
        const { previousQuestions } = useGameStore.getState();
        if (previousQuestions.length > 0) {
          params.set('exclude', previousQuestions.map(q => q.id).join(','));
        }
      }
      
      const response = await fetch(`/api/questions/random?${params}`);
      if (!response.ok) throw new Error('Failed to fetch question');
      
      const question = await response.json();
      setCurrentQuestion(question);
    } catch (error) {
      console.error('Failed to fetch question:', error);
    } finally {
      setIsLoading(false);
    }
  }, [settings.avoidRepeats, setCurrentQuestion]);
  
  // Submit guess
  const submitGuess = useCallback(async (hintUsed: boolean = false) => {
    if (!currentQuestion || !parsedGuess.value || isSubmitting) return;
    
    setSubmitting(true);
    
    try {
      // 1. Calculate everything locally first for instant UI response and Guest users
      const { buildScoreResult } = await import('@/lib/constants/scoring');
      const { DIFFICULTIES } = await import('@/lib/constants/difficulties');
      
      const diffMultiplier = DIFFICULTIES[currentQuestion.difficulty as keyof typeof DIFFICULTIES]?.xpMultiplier || 1.0;
      const refAnswer = currentQuestion.referenceAnswer;
      const secureScore = buildScoreResult(parsedGuess.value, refAnswer, diffMultiplier, hintUsed);
      
      const isOverestimate = parsedGuess.value > refAnswer;
      const difference = Math.abs(parsedGuess.value - refAnswer);
      
      const achievements: string[] = [];
      if (secureScore.factor <= 1.1 && !hintUsed) achievements.push("🎯 The Sniper");
      if (secureScore.factor >= 1000) achievements.push("🚀 Astronomical");
      if (difference === 0) achievements.push("🤯 Bullseye");
      if (isOverestimate && secureScore.factor > 10) achievements.push("📈 Too Optimistic");
      
      const attemptResult: any = {
        guess: parsedGuess.value,
        referenceAnswer: refAnswer,
        factor: secureScore.factor,
        classification: secureScore.classification,
        difference,
        isOverestimate,
        explanation: currentQuestion.explanation,
        estimationApproach: currentQuestion.estimationApproach,
        achievements
      };

      // 2. Save to database if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const response = await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempts: [{
              questionId: currentQuestion.id,
              userGuess: parsedGuess.value,
              usedHint: hintUsed
            }]
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          // The API doesn't currently return the exact attempt_id in the array.
          // Wait, the API returns { success: true, processed: N }
          // Let's modify the API to return the ids.
          // For now we will just proceed.
        } else {
          console.error('Failed to save attempt to server');
        }
      }
      
      setResult(attemptResult);
    } catch (error) {
      console.error('Failed to submit guess:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentQuestion, parsedGuess, isSubmitting, setSubmitting, setResult, supabase]);
  
  // Handle input change with parsing
  const handleInputChange = useCallback((value: string) => {
    const parsed = parseNumber(value);
    setUserGuess(value);
    setParsedGuess(parsed);
  }, [setUserGuess, setParsedGuess]);
  
  // Load initial question on mount
  useEffect(() => {
    if (!currentQuestion && !isLoading) {
      fetchQuestion();
    }
  }, [currentQuestion, isLoading, fetchQuestion]);
  
  return {
    // State
    currentQuestion,
    userGuess,
    parsedGuess,
    isSubmitting,
    showResult,
    result,
    streak,
    questionsAnswered,
    isLoading,
    settings,
    
    // Actions
    fetchQuestion,
    submitGuess,
    handleInputChange,
    nextQuestion,
  };
}
