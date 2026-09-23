import type { CategoryId, Difficulty } from "@/lib/types/game";

export interface LadderStage {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  difficulties: Difficulty[];
  categories: CategoryId[];
  icon: string;
}

export const LADDER_STAGES: LadderStage[] = [
  {
    id: "everyday",
    name: "Everyday Life",
    description: "Start here. Common quantities you encounter daily.",
    levelRequired: 1,
    difficulties: ["easy"],
    categories: ["everyday", "food", "sports"],
    icon: "☕",
  },
  {
    id: "people-places",
    name: "People & Places",
    description: "Populations, cities, and human geography.",
    levelRequired: 3,
    difficulties: ["easy", "medium"],
    categories: ["geography", "cities", "history", "infrastructure"],
    icon: "🏙️",
  },
  {
    id: "business-tech",
    name: "Business & Technology",
    description: "Companies, digital life, and global markets.",
    levelRequired: 5,
    difficulties: ["medium", "hard"],
    categories: ["business", "technology", "gaming"],
    icon: "💻",
  },
  {
    id: "science-systems",
    name: "Science & Systems",
    description: "Physics, biology, and natural ecosystems.",
    levelRequired: 7,
    difficulties: ["medium", "hard"],
    categories: ["science", "nature", "animals"],
    icon: "🔬",
  },
  {
    id: "global-scale",
    name: "Global Scale",
    description: "The biggest numbers. Astronomy and global totals.",
    levelRequired: 10,
    difficulties: ["hard"],
    categories: ["space", "geography", "history", "science"],
    icon: "🌍",
  },
  {
    id: "unhinged",
    name: "UNHINGED",
    description: "Absolute chaos. Ridiculous, entertaining estimates.",
    levelRequired: 15,
    difficulties: ["unhinged"],
    categories: ["absurd"],
    icon: "🌀",
  }
];
