/**
 * Questions par défaut pour le mode fallback
 * Utilisées lorsque le fichier JSON est manquant ou invalide
 */

import { Question } from '@/types/gamification';

export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'default-1',
    text: 'Quelle est la capitale de la France ?',
    answers: ['Paris', 'paris', 'PARIS'],
    difficulty: 'facile',
    points: 10,
    category: 'géographie'
  },
  {
    id: 'default-2',
    text: 'Combien de continents y a-t-il sur Terre ?',
    answers: ['7', 'sept', 'SEPT'],
    difficulty: 'facile',
    points: 10,
    category: 'géographie'
  },
  {
    id: 'default-3',
    text: 'Qui a peint la Joconde ?',
    answers: ['Léonard de Vinci', 'Leonard de Vinci', 'De Vinci', 'Léonard De Vinci'],
    difficulty: 'moyen',
    points: 20,
    category: 'art'
  },
  {
    id: 'default-4',
    text: 'Quelle est la formule chimique de l\'eau ?',
    answers: ['H2O', 'h2o', 'H₂O'],
    difficulty: 'moyen',
    points: 20,
    category: 'sciences'
  },
  {
    id: 'default-5',
    text: 'Quel est le théorème de Pythagore ?',
    answers: ['a² + b² = c²', 'a^2 + b^2 = c^2', 'a au carré plus b au carré égale c au carré'],
    difficulty: 'difficile',
    points: 30,
    category: 'mathématiques'
  },
  {
    id: 'default-6',
    text: 'En quelle année a eu lieu la Révolution française ?',
    answers: ['1789', 'mille sept cent quatre-vingt-neuf'],
    difficulty: 'difficile',
    points: 30,
    category: 'histoire'
  }
];
