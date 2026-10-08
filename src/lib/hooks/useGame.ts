// src/lib/hooks/useGame.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameStore } from "@/lib/store/gameStore";
import { parseNumber } from "@/lib/utils/number-parser";
import { calculateFactor, classifyScore } from "@/lib/constants/scoring";
import type { Question, AttemptResult, ParseResult } from "@/lib/types/game";

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
  const fetchQuestion = useCallback(
    async (options?: {
      category?: string;
      difficulty?: string;
      challengeId?: string;
      stageId?: string;
    }) => {
      setIsLoading(true);

      try {
        // Challenge question
        if (options?.challengeId) {
          const response = await fetch(`/api/questions/${options.challengeId}`);

          const responseText = await response.text();

          if (!response.ok) {
            console.error("Challenge question API failed:", {
              status: response.status,
              statusText: response.statusText,
              response: responseText,
            });

            throw new Error(
              `Failed to fetch challenge question (${response.status}): ${responseText}`,
            );
          }

          let question;

          try {
            question = JSON.parse(responseText);
          } catch {
            console.error(
              "Challenge question API returned invalid JSON:",
              responseText,
            );

            throw new Error("Challenge question API returned invalid JSON");
          }

          setCurrentQuestion(question);
          return;
        }

        // Build query parameters BEFORE making the request
        const params = new URLSearchParams();

        if (options?.category) {
          params.set("category", options.category);
        }

        if (options?.difficulty) {
          params.set("difficulty", options.difficulty);
        }

        if (options?.stageId) {
          params.set("stage", options.stageId);
        }

        // Avoid previously seen questions
        if (settings.avoidRepeats) {
          const { previousQuestions } = useGameStore.getState();

          if (previousQuestions.length > 0) {
            params.set("exclude", previousQuestions.map((q) => q.id).join(","));
          }
        }

        // Fetch random question
        const url = `/api/questions/random?${params.toString()}`;

        console.log("Fetching question:", url);

        const response = await fetch(url);

        const responseText = await response.text();

        if (!response.ok) {
          console.error("Question API failed:", {
            status: response.status,
            statusText: response.statusText,
            url,
            response: responseText,
          });

          throw new Error(
            `Failed to fetch question (${response.status}): ${responseText}`,
          );
        }

        let question;

        try {
          question = JSON.parse(responseText);
        } catch {
          console.error("Question API returned invalid JSON:", responseText);

          throw new Error("Question API returned invalid JSON");
        }

        setCurrentQuestion(question);
      } catch (error) {
        console.error("Failed to fetch question:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [settings.avoidRepeats, setCurrentQuestion],
  );

  // Submit guess
  const submitGuess = useCallback(
    async (hintUsed: boolean = false) => {
      if (!currentQuestion || !parsedGuess.value || isSubmitting) return;

      setSubmitting(true);

      try {
        // 1. Calculate securely on the server (handles both guests and users)
        const scoreRes = await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: currentQuestion.id, guess: parsedGuess.value, hintUsed }),
        });
        
        const scoreData = await scoreRes.json();
        if (!scoreData.success) throw new Error(scoreData.error || 'Scoring failed');
        
        const attemptResult = scoreData.result;

        // 2. Save to database if authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const response = await fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attempts: [
                {
                  questionId: currentQuestion.id,
                  userGuess: parsedGuess.value,
                  usedHint: hintUsed,
                },
              ],
            }),
          });

          if (response.ok) {
            const data = await response.json();

            console.log("Attempt saved successfully:", data);
          } else {
            const errorText = await response.text();

            console.error("Attempt API failed:", {
              status: response.status,
              statusText: response.statusText,
              response: errorText,
            });
          }
        }

        setResult(attemptResult);
      } catch (error) {
        console.error("Failed to submit guess:", error);
      } finally {
        setSubmitting(false);
      }
    },
    [
      currentQuestion,
      parsedGuess,
      isSubmitting,
      setSubmitting,
      setResult,
      supabase,
    ],
  );

  // Handle input change with parsing
  const handleInputChange = useCallback(
    (value: string) => {
      const parsed = parseNumber(value);
      setUserGuess(value);
      setParsedGuess(parsed);
    },
    [setUserGuess, setParsedGuess],
  );

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
