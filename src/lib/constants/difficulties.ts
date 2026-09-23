import type { Difficulty, DifficultyConfig } from "@/lib/types/game";

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: "easy",
    name: "Easy",
    description: "Everyday experiences, simple assumptions",
    color: "#8CE6B0",
    bgColor: "rgba(140, 230, 176, 0.12)",
    xpMultiplier: 1.0,
  },
  medium: {
    id: "medium",
    name: "Medium",
    description: "A few reasonable assumptions required",
    color: "#FFD166",
    bgColor: "rgba(255, 209, 102, 0.12)",
    xpMultiplier: 1.5,
  },
  hard: {
    id: "hard",
    name: "Hard",
    description: "Multiple variables, larger uncertainties",
    color: "#FF8585",
    bgColor: "rgba(255, 133, 133, 0.12)",
    xpMultiplier: 2.0,
  },
  unhinged: {
    id: "unhinged",
    name: "Unhinged",
    description: "Ridiculous, counterintuitive, and entertaining",
    color: "#B9A0FF",
    bgColor: "rgba(185, 160, 255, 0.12)",
    xpMultiplier: 3.0,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard", "unhinged"];

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTIES[difficulty];
}
