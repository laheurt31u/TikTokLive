/**
 * Tests unitaires pour la validation des schémas de questions avec Zod
 */

import { QuestionSchema, QuestionsFileSchema } from '@/lib/gamification/schemas';
import { z } from 'zod';

describe('Question Schema Validation', () => {
  describe('QuestionSchema', () => {
    it('should validate a valid question', () => {
      const validQuestion = {
        id: 'q1',
        text: 'Quelle est la capitale de la France ?',
        answers: ['Paris', 'paris', 'PARIS'],
        difficulty: 'facile',
        points: 10,
        category: 'géographie'
      };

      const result = QuestionSchema.safeParse(validQuestion);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validQuestion);
      }
    });

    it('should reject question with empty text', () => {
      const invalidQuestion = {
        id: 'q1',
        text: '',
        answers: ['Paris'],
        difficulty: 'facile',
        points: 10,
        category: 'géographie'
      };

      const result = QuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('text');
      }
    });

    it('should reject question with text exceeding max length', () => {
      const invalidQuestion = {
        id: 'q1',
        text: 'a'.repeat(501), // Max 500 caractères
        answers: ['Paris'],
        difficulty: 'facile',
        points: 10,
        category: 'géographie'
      };

      const result = QuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });

    it('should reject question with empty answers array', () => {
      const invalidQuestion = {
        id: 'q1',
        text: 'Question test',
        answers: [],
        difficulty: 'facile',
        points: 10,
        category: 'géographie'
      };

      const result = QuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('answers');
      }
    });

    it('should reject invalid difficulty value', () => {
      const invalidQuestion = {
        id: 'q1',
        text: 'Question test',
        answers: ['Paris'],
        difficulty: 'très facile', // Invalid
        points: 10,
        category: 'géographie'
      };

      const result = QuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('difficulty');
      }
    });

    it('should accept valid difficulty values: facile, moyen, difficile', () => {
      const difficulties = ['facile', 'moyen', 'difficile'];
      
      difficulties.forEach(difficulty => {
        const question = {
          id: 'q1',
          text: 'Question test',
          answers: ['Paris'],
          difficulty,
          points: 10,
          category: 'géographie'
        };

        const result = QuestionSchema.safeParse(question);
        expect(result.success).toBe(true);
      });
    });

    it('should require all mandatory fields', () => {
      const incompleteQuestion = {
        id: 'q1',
        text: 'Question test'
        // Missing answers, difficulty, etc.
      };

      const result = QuestionSchema.safeParse(incompleteQuestion);
      expect(result.success).toBe(false);
    });
  });

  describe('QuestionsFileSchema', () => {
    it('should validate a valid questions file', () => {
      const validFile = {
        questions: [
          {
            id: 'q1',
            text: 'Question 1',
            answers: ['Answer 1'],
            difficulty: 'facile',
            points: 10,
            category: 'test'
          },
          {
            id: 'q2',
            text: 'Question 2',
            answers: ['Answer 2'],
            difficulty: 'moyen',
            points: 20,
            category: 'test'
          }
        ]
      };

      const result = QuestionsFileSchema.safeParse(validFile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questions).toHaveLength(2);
      }
    });

    it('should reject file with empty questions array', () => {
      const invalidFile = {
        questions: []
      };

      const result = QuestionsFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it('should reject file with invalid question in array', () => {
      const invalidFile = {
        questions: [
          {
            id: 'q1',
            text: 'Valid question',
            answers: ['Answer'],
            difficulty: 'facile',
            points: 10,
            category: 'test'
          },
          {
            id: 'q2',
            text: '', // Invalid: empty text
            answers: ['Answer'],
            difficulty: 'facile',
            points: 10,
            category: 'test'
          }
        ]
      };

      const result = QuestionsFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it('should reject file without questions property', () => {
      const invalidFile = {
        // Missing questions property
      };

      const result = QuestionsFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });
  });
});
