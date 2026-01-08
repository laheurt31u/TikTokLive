/**
 * Factory pour créer des questions de test avec données dynamiques
 * Utilise faker pour éviter les collisions et générer des données réalistes
 */

import { faker } from '@faker-js/faker';
import type { Question } from '@/types/gamification';

/**
 * Crée une question de test avec des valeurs par défaut réalistes
 */
export const createQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: faker.string.uuid(),
  text: faker.lorem.sentence() + '?',
  answers: [faker.lorem.word()],
  difficulty: faker.helpers.arrayElement(['facile', 'moyen', 'difficile'] as const),
  points: faker.helpers.arrayElement([10, 20, 30]),
  category: faker.helpers.arrayElement(['culture', 'sport', 'histoire', 'science', 'geographie']),
  ...overrides,
});

/**
 * Crée plusieurs questions de test
 */
export const createQuestions = (count: number): Question[] =>
  Array.from({ length: count }, () => createQuestion());

/**
 * Crée une question facile
 */
export const createEasyQuestion = (overrides: Partial<Question> = {}): Question =>
  createQuestion({
    difficulty: 'facile',
    points: 10,
    ...overrides,
  });

/**
 * Crée une question moyenne
 */
export const createMediumQuestion = (overrides: Partial<Question> = {}): Question =>
  createQuestion({
    difficulty: 'moyen',
    points: 20,
    ...overrides,
  });

/**
 * Crée une question difficile
 */
export const createHardQuestion = (overrides: Partial<Question> = {}): Question =>
  createQuestion({
    difficulty: 'difficile',
    points: 30,
    ...overrides,
  });
