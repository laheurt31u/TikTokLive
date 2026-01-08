/**
 * Factory pour créer des commentaires TikTok de test
 * Utilise faker pour générer des données réalistes et éviter les collisions
 */

import { faker } from '@faker-js/faker';
import type { TikTokComment } from '../../../tiktoklive/lib/tiktok/types';

/**
 * Crée un commentaire TikTok de test
 */
export const createTikTokComment = (overrides: Partial<TikTokComment> = {}): TikTokComment => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  username: faker.internet.username(),
  text: faker.lorem.sentence(),
  timestamp: new Date(),
  sessionId: 'test-session-123',
  ...overrides,
});

/**
 * Crée plusieurs commentaires TikTok
 */
export const createTikTokComments = (count: number): TikTokComment[] =>
  Array.from({ length: count }, () => createTikTokComment());

/**
 * Crée un commentaire avec réponse correcte pour les tests de quiz
 */
export const createCorrectAnswerComment = (correctAnswer: string, overrides: Partial<TikTokComment> = {}): TikTokComment =>
  createTikTokComment({
    text: correctAnswer,
    username: faker.internet.username(),
    ...overrides,
  });

/**
 * Crée un commentaire avec réponse incorrecte
 */
export const createWrongAnswerComment = (wrongAnswer: string, overrides: Partial<TikTokComment> = {}): TikTokComment =>
  createTikTokComment({
    text: wrongAnswer,
    username: faker.internet.username(),
    ...overrides,
  });

/**
 * Crée des commentaires de test pour un quiz avec mélange de bonnes et mauvaises réponses
 */
export const createQuizComments = (
  correctAnswer: string,
  totalComments: number = 10,
  correctPercentage: number = 0.3
): TikTokComment[] => {
  const correctCount = Math.floor(totalComments * correctPercentage);
  const wrongCount = totalComments - correctCount;

  const comments: TikTokComment[] = [];

  // Ajouter les bonnes réponses
  for (let i = 0; i < correctCount; i++) {
    comments.push(createCorrectAnswerComment(correctAnswer, {
      timestamp: new Date(Date.now() - faker.number.int({ min: 1000, max: 30000 })) // Entre 1-30 secondes
    }));
  }

  // Ajouter les mauvaises réponses
  for (let i = 0; i < wrongCount; i++) {
    comments.push(createWrongAnswerComment(faker.lorem.word(), {
      timestamp: new Date(Date.now() - faker.number.int({ min: 1000, max: 30000 }))
    }));
  }

  // Trier par timestamp pour simuler l'ordre d'arrivée
  return comments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

/**
 * Crée un commentaire spécial avec mentions ou emojis
 */
export const createSpecialComment = (type: 'mention' | 'emoji' | 'long' | 'empty', overrides: Partial<TikTokComment> = {}): TikTokComment => {
  let text: string;

  switch (type) {
    case 'mention':
      text = `@${faker.internet.username()} ${faker.lorem.sentence()}`;
      break;
    case 'emoji':
      text = `😀 ${faker.lorem.sentence()}`;
      break;
    case 'long':
      text = faker.lorem.paragraph(5); // Texte très long
      break;
    case 'empty':
      text = '   '; // Espaces seulement
      break;
    default:
      text = faker.lorem.sentence();
  }

  return createTikTokComment({
    text,
    ...overrides,
  });
};