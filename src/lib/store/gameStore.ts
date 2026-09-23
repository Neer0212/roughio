// src/lib/store/gameStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Question, AttemptResult, GameSettings, ParsedInput } from '@/lib/types/game';

interface GameStore {
  // State
  currentQuestion: Question | null;
  previousQuestions: Question[];
  userGuess: string;
  parsedGuess: ParsedInput;
  isSubmitting: boolean;
  showResult: boolean;
  result: AttemptResult | null;
  streak: number;
  questionsAnswered: number;
  sessionBest: number | null;
  sessionWorst: number | null;
  settings: GameSettings;
  guestAttempts: AttemptResult[];
  
  // Actions
  setCurrentQuestion: (question: Question) => void;
  setUserGuess: (guess: string) => void;
  setParsedGuess: (parsed: ParsedInput) => void;
  setSubmitting: (submitting: boolean) => void;
  setResult: (result: AttemptResult) => void;
  nextQuestion: () => void;
  resetGame: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  addGuestAttempt: (attempt: AttemptResult) => void;
  clearGuestAttempts: () => void;
}

const defaultSettings: GameSettings = {
  avoidRepeats: true,
  showHints: true,
  soundEnabled: false,
  animationsEnabled: true,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      currentQuestion: null,
      previousQuestions: [],
      userGuess: '',
      parsedGuess: { value: null, error: null, originalInput: '' },
      isSubmitting: false,
      showResult: false,
      result: null,
      streak: 0,
      questionsAnswered: 0,
      sessionBest: null,
      sessionWorst: null,
      settings: defaultSettings,
      guestAttempts: [],
      
      setCurrentQuestion: (question) => set({ currentQuestion: question, showResult: false, result: null, userGuess: '', parsedGuess: { value: null, error: null, originalInput: '' } }),
      
      setUserGuess: (guess) => set({ userGuess: guess }),
      
      setParsedGuess: (parsed) => set({ parsedGuess: parsed }),
      
      setSubmitting: (submitting) => set({ isSubmitting: submitting }),
      
      setResult: (result) => {
        const { streak, questionsAnswered, sessionBest, sessionWorst, guestAttempts } = get();
        const newStreak = result.factor < 2 ? streak + 1 : 0;
        const newBest = sessionBest === null || result.factor < sessionBest ? result.factor : sessionBest;
        const newWorst = sessionWorst === null || result.factor > sessionWorst ? result.factor : sessionWorst;
        
        set({
          showResult: true,
          result,
          streak: newStreak,
          questionsAnswered: questionsAnswered + 1,
          sessionBest: newBest,
          sessionWorst: newWorst,
          guestAttempts: [...guestAttempts, result],
        });
      },
      
      nextQuestion: () => {
        const { currentQuestion, previousQuestions } = get();
        set({
          previousQuestions: currentQuestion ? [...previousQuestions, currentQuestion] : previousQuestions,
          currentQuestion: null,
          showResult: false,
          result: null,
          userGuess: '',
          parsedGuess: { value: null, error: null, originalInput: '' },
        });
      },
      
      resetGame: () => set({
        currentQuestion: null,
        previousQuestions: [],
        userGuess: '',
        parsedGuess: { value: null, error: null, originalInput: '' },
        isSubmitting: false,
        showResult: false,
        result: null,
        streak: 0,
        questionsAnswered: 0,
        sessionBest: null,
        sessionWorst: null,
      }),
      
      updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      
      addGuestAttempt: (attempt) => set((state) => ({ guestAttempts: [...state.guestAttempts, attempt] })),
      
      clearGuestAttempts: () => set({ guestAttempts: [] }),
    }),
    {
      name: 'roughio-game',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        guestAttempts: state.guestAttempts,
        streak: state.streak,
        questionsAnswered: state.questionsAnswered,
        sessionBest: state.sessionBest,
        sessionWorst: state.sessionWorst,
      }),
    }
  )
);