/**
 * Schémas Zod pour la validation des questions
 */

import { z } from 'zod';
import { Question, QuestionsFile } from '@/types/gamification';

// Schéma de validation pour la difficulté
const DifficultySchema = z.enum(['facile', 'moyen', 'difficile']);

// Schéma de validation pour une question
export const QuestionSchema: z.ZodType<Question> = z.object({
  id: z.string().min(1, 'ID requis'),
  text: z.string().min(1, 'Texte requis').max(500, 'Texte trop long (max 500 caractères)'),
  answers: z.array(z.string().min(1, 'Réponse non vide')).min(1, 'Au moins une réponse requise'),
  difficulty: DifficultySchema,
  points: z.number().int().positive('Points doivent être positifs'),
  category: z.string().min(1, 'Catégorie requise')
});

// Schéma de validation pour le fichier JSON complet
export const QuestionsFileSchema: z.ZodType<QuestionsFile> = z.object({
  questions: z.array(QuestionSchema).min(1, 'Au moins une question requise')
});
