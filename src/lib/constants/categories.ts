import type { Category, CategoryId } from "@/types/game";

export const CATEGORIES: Record<CategoryId, Category> = {
  technology: {
    id: "technology",
    name: "Technology",
    description: "Software, hardware, internet, and digital life",
    icon: "💻",
    color: "#B9A0FF",
    accentColor: "rgba(185, 160, 255, 0.15)",
  },
  science: {
    id: "science",
    name: "Science",
    description: "Physics, chemistry, biology, and research",
    icon: "🔬",
    color: "#82C8FF",
    accentColor: "rgba(130, 200, 255, 0.15)",
  },
  geography: {
    id: "geography",
    name: "Geography",
    description: "Countries, landmasses, distances, and natural features",
    icon: "🌍",
    color: "#8CE6B0",
    accentColor: "rgba(140, 230, 176, 0.15)",
  },
  cities: {
    id: "cities",
    name: "Cities",
    description: "Urban life, populations, and metropolitan areas",
    icon: "🏙️",
    color: "#FFD166",
    accentColor: "rgba(255, 209, 102, 0.15)",
  },
  business: {
    id: "business",
    name: "Business",
    description: "Companies, revenue, markets, and economics",
    icon: "📊",
    color: "#FF8585",
    accentColor: "rgba(255, 133, 133, 0.15)",
  },
  sports: {
    id: "sports",
    name: "Sports",
    description: "Athletics, records, equipment, and fandom",
    icon: "⚽",
    color: "#FFB347",
    accentColor: "rgba(255, 179, 71, 0.15)",
  },
  gaming: {
    id: "gaming",
    name: "Gaming",
    description: "Video games, players, and virtual worlds",
    icon: "🎮",
    color: "#B9A0FF",
    accentColor: "rgba(185, 160, 255, 0.15)",
  },
  history: {
    id: "history",
    name: "History",
    description: "Historical quantities, timelines, and events",
    icon: "📜",
    color: "#C4A882",
    accentColor: "rgba(196, 168, 130, 0.15)",
  },
  nature: {
    id: "nature",
    name: "Nature",
    description: "Ecosystems, weather, geology, and the natural world",
    icon: "🌿",
    color: "#8CE6B0",
    accentColor: "rgba(140, 230, 176, 0.15)",
  },
  space: {
    id: "space",
    name: "Space",
    description: "Astronomy, distances, planets, and the universe",
    icon: "🚀",
    color: "#82C8FF",
    accentColor: "rgba(130, 200, 255, 0.15)",
  },
  everyday: {
    id: "everyday",
    name: "Everyday Life",
    description: "Common quantities encountered in daily life",
    icon: "☕",
    color: "#FFD166",
    accentColor: "rgba(255, 209, 102, 0.15)",
  },
  food: {
    id: "food",
    name: "Food",
    description: "Consumption, production, and culinary quantities",
    icon: "🍕",
    color: "#FF8585",
    accentColor: "rgba(255, 133, 133, 0.15)",
  },
  animals: {
    id: "animals",
    name: "Animals",
    description: "Wildlife, domesticated animals, and populations",
    icon: "🐋",
    color: "#8CE6B0",
    accentColor: "rgba(140, 230, 176, 0.15)",
  },
  infrastructure: {
    id: "infrastructure",
    name: "Infrastructure",
    description: "Roads, buildings, utilities, and civil engineering",
    icon: "🏗️",
    color: "#9696A5",
    accentColor: "rgba(150, 150, 165, 0.15)",
  },
  absurd: {
    id: "absurd",
    name: "Absurd",
    description: "Ridiculous, counterintuitive, and gloriously unhinged",
    icon: "🌀",
    color: "#FF8585",
    accentColor: "rgba(255, 133, 133, 0.15)",
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);
export const CATEGORY_MAP = CATEGORIES;

export function getCategoryById(id: CategoryId): Category {
  return CATEGORIES[id];
}