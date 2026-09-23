import type { Difficulty, DifficultyConfig } from "@/lib/types/game";

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: "easy",
    name: "Easy",
    description: "Everyday experiences, simple assumptions",
    color: "#35D07F",
    bgColor: "rgba(53, 208, 127, 0.12)",
    xpMultiplier: 1.0,
  },
  medium: {
    id: "medium",
    name: "Medium",
    description: "A few reasonable assumptions required",
    color: "#60A5FA",
    bgColor: "rgba(96, 165, 250, 0.12)",
    xpMultiplier: 1.5,
  },
  hard: {
    id: "hard",
    name: "Hard",
    description: "Multiple variables, larger uncertainties",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.12)",
    xpMultiplier: 2.0,
  },
  unhinged: {
    id: "unhinged",
    name: "Unhinged",
    description: "Ridiculous, counterintuitive, and entertaining",
    color: "#EF5350",
    bgColor: "rgba(239, 83, 80, 0.12)",
    xpMultiplier: 3.0,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard", "unhinged"];

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTIES[difficulty];
}
