/**
 * Leveling formula: Level = floor(sqrt(XP / 100)) + 1
 * 
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 400 XP
 * Level 4: 900 XP
 * Level 5: 1600 XP
 */

export function calculateLevel(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 100;
}

export function getLevelProgress(xp: number): { 
  level: number; 
  currentLevelXp: number; 
  nextLevelXp: number; 
  progressPercent: number 
} {
  const level = calculateLevel(xp);
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  
  const xpIntoCurrentLevel = xp - currentLevelXp;
  const xpRequiredForNext = nextLevelXp - currentLevelXp;
  
  const progressPercent = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpRequiredForNext) * 100));
  
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progressPercent
  };
}
