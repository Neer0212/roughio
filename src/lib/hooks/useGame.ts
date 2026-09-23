// src/lib/hooks/useGame.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/lib/store/gameStore';
import { parseNumber } from '@/lib/utils/number-parser';
import { calculateFactor, classifyScore } from '@/lib/constants/scoring';
import type { Question, AttemptResult, ParsedInput } from '@/lib/types/game';

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
  const fetchQuestion = useCallback(async (options?: { category?: string; difficulty?: string; challengeId?: string }) => {
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
  const submitGuess = useCallback(async () => {
    if (!currentQuestion || !parsedGuess.value || isSubmitting) return;
    
    setSubmitting(true);
    
    try {
      const refAnswer = currentQuestion.referenceAnswer;
      const factor = calculateFactor(parsedGuess.value, refAnswer);
      const classification = classifyScore(factor);
      const difference = Math.abs(parsedGuess.value - refAnswer);
      const isOverestimate = parsedGuess.value > refAnswer;
      
      const attemptResult: AttemptResult = {
        guess: parsedGuess.value,
        referenceAnswer: refAnswer,
        factor,
        classification: classification.classification,
        difference,
        isOverestimate,
        explanation: currentQuestion.explanation,
        estimationApproach: currentQuestion.estimationApproach || currentQuestion.estimation_approach,
      };
      
      // Save to database if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_id: currentQuestion.id,
            guess: parsedGuess.value,
            factor,
            score_classification: classification,
            used_hint: false, // TODO: track hint usage
          }),
        });
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
    
    // Actions
    fetchQuestion,
    submitGuess,
    handleInputChange,
    nextQuestion,
  };
}