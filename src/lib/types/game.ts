// ============================================================
// CORE GAME TYPES
// ============================================================

export type Difficulty = "easy" | "medium" | "hard" | "unhinged";

export type CategoryId =
  | "technology"
  | "science"
  | "geography"
  | "cities"
  | "business"
  | "sports"
  | "gaming"
  | "history"
  | "nature"
  | "space"
  | "everyday"
  | "food"
  | "animals"
  | "infrastructure"
  | "absurd";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: string;
  color: string;
  accentColor: string;
}

export interface DifficultyConfig {
  id: Difficulty;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  xpMultiplier: number;
}

export interface Question {
  id: string;
  text: string;
  referenceAnswer: number;
  unit: string;
  unitPlural?: string;
  category: CategoryId;
  difficulty: Difficulty;
  explanation: string;
  estimationApproach: string;
  hint?: string;
  source?: string;
  sourceName?: string;
  referencePeriod?: string;
  uncertaintyLow?: number;
  uncertaintyHigh?: number;
  tags: string[];
  status: "active" | "draft" | "review" | "retired";
  createdAt?: string;
  isAiGenerated?: boolean;
  isCommunity?: boolean;
}

// ============================================================
// SCORING TYPES
// ============================================================

export type ScoreClassification =
  | "perfect"
  | "bullseye"
  | "excellent"
  | "close"
  | "not_bad"
  | "way_off"
  | "chaos";

export interface ScoreResult {
  factor: number;
  classification: ScoreClassification;
  label: string;
  description: string;
  isOverEstimate: boolean;
  logDistance: number;
  xpEarned: number;
}

export interface AttemptResult {
  guess: number;
  referenceAnswer: number;
  factor: number;
  classification: ScoreClassification;
  difference: number;
  isOverestimate: boolean;
  explanation: string;
  estimationApproach: string;
  achievements?: string[];
}

// ============================================================
// GAME STATE TYPES
// ============================================================

export type GamePhase =
  | "idle"
  | "question"
  | "submitted"
  | "revealed"
  | "reasoning";

export interface GameSettings {
  avoidRepeats: boolean;
  showHints: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

export interface GameFilters {
  category: CategoryId | "all";
  difficulty: Difficulty | "all";
}

export interface Attempt {
  id: string;
  questionId: string;
  question: Question;
  userGuess: number;
  userGuessRaw: string;
  scoreResult: ScoreResult;
  usedHint: boolean;
  userReasoning?: string;
  timestamp: Date;
}

export interface GameSession {
  id: string;
  attempts: Attempt[];
  currentQuestion: Question | null;
  phase: GamePhase;
  filters: GameFilters;
  questionIndex: number;
  startedAt: Date;
}

// ============================================================
// USER STATS TYPES
// ============================================================

export interface CategoryStats {
  categoryId: CategoryId;
  questionsAnswered: number;
  averageLogScore: number;
  bestFactor: number;
  perfectCount: number;
  bullseyeCount: number;
}

export interface UserStats {
  totalQuestions: number;
  averageLogScore: number;
  medianFactor: number;
  bestFactor: number;
  worstFactor: number;
  pctUnder2x: number;
  pctUnder5x: number;
  currentStreak: number;
  longestStreak: number;
  categoryStats: CategoryStats[];
  xp: number;
  level: number;
}

// ============================================================
// ACHIEVEMENT TYPES
// ============================================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (attempt: Attempt, stats: UserStats) => boolean;
  xpReward: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: Date;
}

// ============================================================
// NUMBER PARSING TYPES
// ============================================================

export interface ParseResult {
  value: number | null;
  error: string | null;
  normalized: string | null;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface QuestionsResponse {
  questions: Question[];
  total: number;
}
