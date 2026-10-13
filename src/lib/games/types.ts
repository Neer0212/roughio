// src/lib/games/types.ts

export type GameId =
  | 'fermi'
  | 'color-recall'
  | 'sound-match'
  | 'pattern-recall'
  | 'rare-answer'
  | 'order-of-magnitude';

export type GameStatus = 'playable' | 'coming-soon';

export type GameCategory =
  | 'Estimation'
  | 'Perception & Memory'
  | 'Audio & Pitch'
  | 'Working Memory'
  | 'Trivia & Language'
  | 'Scale & Numbers';

export interface GameDefinition {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  category: GameCategory;
  route: string;
  status: GameStatus;
  badge: string;
  accentColor: string;
  themeClass: string;
  metrics: {
    duration: string;
    skills: string[];
    difficulty: 'Casual' | 'Adaptive' | 'Challenging';
  };
  features: string[];
}
