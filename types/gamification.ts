/**
 * Types TypeScript pour le système de gamification
 */

export type Difficulty = 'facile' | 'moyen' | 'difficile';

export interface Question {
  id: string;
  text: string;
  answers: string[];
  difficulty: Difficulty;
  points: number;
  category: string;
}

export interface QuestionsFile {
  questions: Question[];
}
