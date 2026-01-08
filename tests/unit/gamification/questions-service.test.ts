/**
 * Tests unitaires pour le service de chargement des questions
 */

import { loadQuestionsFromFile, getQuestions, getQuestionsByDifficulty, clearCache } from '@/lib/gamification/questions';
import { Question } from '@/types/gamification';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
jest.mock('fs/promises');

describe('Questions Service', () => {
  const mockQuestionsPath = path.join(process.cwd(), 'data', 'questions.json');
  const mockValidQuestions: Question[] = [
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
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    clearCache(); // Clear cache before each test
    // Désactiver le fallback par défaut pour les tests (sauf tests spécifiques)
    process.env.QUESTIONS_FALLBACK_ENABLED = 'false';
  });

  describe('loadQuestionsFromFile', () => {
    it('should load questions from valid JSON file', async () => {
      const mockFileContent = JSON.stringify({ questions: mockValidQuestions });
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      const result = await loadQuestionsFromFile(mockQuestionsPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].id).toBe('q1');
      }
      expect(fs.readFile).toHaveBeenCalledWith(mockQuestionsPath, 'utf-8');
    });

    it('should return error when file does not exist', async () => {
      const error = new Error('ENOENT: no such file or directory');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      const result = await loadQuestionsFromFile(mockQuestionsPath);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('FILE_NOT_FOUND');
      }
    });

    it('should return error when JSON is invalid', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json{');

      const result = await loadQuestionsFromFile(mockQuestionsPath);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should return error when JSON structure is invalid', async () => {
      const invalidJson = JSON.stringify({ invalid: 'structure' });
      (fs.readFile as jest.Mock).mockResolvedValue(invalidJson);

      const result = await loadQuestionsFromFile(mockQuestionsPath);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should validate questions with Zod schema', async () => {
      const invalidQuestions = [
        {
          id: 'q1',
          text: '', // Invalid: empty text
          answers: ['Answer'],
          difficulty: 'facile',
          points: 10,
          category: 'test'
        }
      ];
      const mockFileContent = JSON.stringify({ questions: invalidQuestions });
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);
      process.env.QUESTIONS_FALLBACK_ENABLED = 'false'; // Désactiver fallback pour ce test

      const result = await loadQuestionsFromFile(mockQuestionsPath);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should use fallback questions when file is missing and fallback enabled', async () => {
      const error = new Error('ENOENT: no such file or directory');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      process.env.QUESTIONS_FALLBACK_ENABLED = 'true'; // Activer fallback

      const result = await loadQuestionsFromFile(mockQuestionsPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data!.length).toBeGreaterThan(0);
        // Vérifier que ce sont les questions par défaut
        expect(result.data![0].id).toMatch(/^default-/);
      }
    });

    it('should use fallback questions when JSON is invalid and fallback enabled', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json{');
      process.env.QUESTIONS_FALLBACK_ENABLED = 'true'; // Activer fallback

      const result = await loadQuestionsFromFile(mockQuestionsPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data!.length).toBeGreaterThan(0);
      }
    });

    it('should cache questions after first load', async () => {
      const mockFileContent = JSON.stringify({ questions: mockValidQuestions });
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      // First load
      const result1 = await loadQuestionsFromFile(mockQuestionsPath);
      expect(result1.success).toBe(true);
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Clear mock call count
      (fs.readFile as jest.Mock).mockClear();

      // Second load should use cache (no file read)
      const result2 = await loadQuestionsFromFile(mockQuestionsPath);
      expect(result2.success).toBe(true);
      // Should not read file again if cached
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should invalidate cache when file path changes', async () => {
      const mockFileContent = JSON.stringify({ questions: mockValidQuestions });
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      // First load with path1
      const path1 = '/path1/questions.json';
      await loadQuestionsFromFile(path1);
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Second load with different path should read file again
      (fs.readFile as jest.Mock).mockClear();
      const path2 = '/path2/questions.json';
      await loadQuestionsFromFile(path2);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('[P2] should invalidate cache when TTL expires (after 1 hour)', async () => {
      const mockFileContent = JSON.stringify({ questions: mockValidQuestions });
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      // GIVEN: Questions chargées et mises en cache
      const result1 = await loadQuestionsFromFile(mockQuestionsPath);
      expect(result1.success).toBe(true);
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // WHEN: Simulant le passage du temps (TTL = 3600 * 1000ms = 1 heure)
      // Mock Date.now pour simuler 1 heure + 1ms plus tard
      const originalNow = Date.now;
      const mockNow = jest.fn(() => originalNow() + 3600 * 1000 + 1);
      global.Date.now = mockNow;

      // Clear mock call count
      (fs.readFile as jest.Mock).mockClear();

      // THEN: Le cache est expiré, le fichier est relu
      const result2 = await loadQuestionsFromFile(mockQuestionsPath);
      expect(result2.success).toBe(true);
      expect(fs.readFile).toHaveBeenCalledTimes(1); // Fichier relu car cache expiré

      // Restore Date.now
      global.Date.now = originalNow;
    });

    it('should return error for invalid file path', async () => {
      process.env.QUESTIONS_FALLBACK_ENABLED = 'false';
      // Test avec un chemin explicitement invalide (null ou undefined via env)
      const result = await loadQuestionsFromFile('   '); // Chemin avec seulement espaces
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('INVALID_PATH');
      }
    });

    it('should handle pagination with offset greater than total', async () => {
      const mockFileContent = JSON.stringify({ questions: mockValidQuestions });
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      await loadQuestionsFromFile(mockQuestionsPath);
      const questions = getQuestions();
      
      // Test avec offset > total
      const filtered = questions.slice(100, 200);
      expect(filtered).toEqual([]);
    });
  });

  describe('getQuestions', () => {
    it('should return all loaded questions', async () => {
      const mockFileContent = JSON.stringify({ questions: mockValidQuestions });
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      await loadQuestionsFromFile(mockQuestionsPath);
      const questions = getQuestions();

      expect(questions).toHaveLength(2);
      expect(questions[0].id).toBe('q1');
    });

    it('should return empty array if no questions loaded', () => {
      const questions = getQuestions();
      expect(questions).toEqual([]);
    });
  });

  describe('getQuestionsByDifficulty', () => {
    it('should filter questions by difficulty', async () => {
      const mockFileContent = JSON.stringify({ questions: mockValidQuestions });
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      await loadQuestionsFromFile(mockQuestionsPath);
      const easyQuestions = getQuestionsByDifficulty('facile');

      expect(easyQuestions).toHaveLength(1);
      expect(easyQuestions[0].difficulty).toBe('facile');
    });

    it('should return empty array if no questions match difficulty', async () => {
      const mockFileContent = JSON.stringify({ questions: mockValidQuestions });
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      await loadQuestionsFromFile(mockQuestionsPath);
      const hardQuestions = getQuestionsByDifficulty('difficile');

      expect(hardQuestions).toEqual([]);
    });
  });
});
