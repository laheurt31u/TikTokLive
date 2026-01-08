/**
 * Tests unitaires pour useCurrentQuestion hook selon Story 2.2
 * Phase RED : Tests qui échouent avant implémentation
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useCurrentQuestion } from '@/hooks/useCurrentQuestion';
import { Question } from '@/types/gamification';

// Mock de l'API questions
jest.mock('@/lib/gamification/questions', () => ({
  loadQuestionsFromFile: jest.fn(),
  getQuestions: jest.fn(),
}));

// Mock de CorrelationManager
jest.mock('@/lib/logger/correlation', () => ({
  CorrelationManager: {
    getCurrentContext: jest.fn(() => ({ id: 'test-correlation-id' })),
    generateId: jest.fn(() => 'test-correlation-id'),
  },
}));

// Mock de fetch pour l'API
global.fetch = jest.fn();

describe('useCurrentQuestion Hook - Story 2.2', () => {
  const mockQuestions: Question[] = [
    {
      id: '1',
      text: 'Quelle est la capitale de la France ?',
      answers: ['Paris', 'Lyon', 'Marseille'],
      difficulty: 'facile',
      points: 10,
      category: 'Géographie'
    },
    {
      id: '2',
      text: 'Quelle est la capitale de l\'Italie ?',
      answers: ['Rome', 'Milan', 'Naples'],
      difficulty: 'facile',
      points: 10,
      category: 'Géographie'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockQuestions
      })
    });
  });

  describe('Chargement initial', () => {
    test('devrait charger la première question disponible au démarrage', async () => {
      const { result } = renderHook(() => useCurrentQuestion());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentQuestion).toEqual(mockQuestions[0]);
      expect(result.current.error).toBeNull();
    });

    test('devrait afficher isLoading=true pendant le chargement', () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(() => {}) // Promise qui ne se résout jamais
      );

      const { result } = renderHook(() => useCurrentQuestion());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentQuestion).toBeNull();
    });
  });

  describe('Gestion des erreurs', () => {
    test('devrait gérer le cas où aucune question n\'est disponible', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      });

      const { result } = renderHook(() => useCurrentQuestion());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentQuestion).toBeNull();
      expect(result.current.error).toBeNull(); // Pas d'erreur, juste pas de question
    });

    test('devrait gérer les erreurs de chargement avec message gracieux', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCurrentQuestion());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.currentQuestion).toBeNull();
    });
  });

  describe('Navigation entre questions', () => {
    test('devrait passer à la question suivante avec nextQuestion()', async () => {
      const { result } = renderHook(() => useCurrentQuestion());

      await waitFor(() => {
        expect(result.current.currentQuestion).toEqual(mockQuestions[0]);
      });

      await act(() => {
        result.current.nextQuestion();
      });

      await waitFor(() => {
        expect(result.current.currentQuestion).toEqual(mockQuestions[1]);
      });
    });

    test('devrait revenir à la première question après la dernière', async () => {
      const { result } = renderHook(() => useCurrentQuestion());

      await waitFor(() => {
        expect(result.current.currentQuestion).toEqual(mockQuestions[0]);
      });

      // Aller à la dernière question
      await act(() => {
        result.current.nextQuestion();
      });
      await waitFor(() => {
        expect(result.current.currentQuestion).toEqual(mockQuestions[1]);
      });

      // Passer à la suivante (devrait revenir à la première)
      await act(() => {
        result.current.nextQuestion();
      });
      await waitFor(() => {
        expect(result.current.currentQuestion).toEqual(mockQuestions[0]);
      });
    });
  });

  describe('Rafraîchissement', () => {
    test('devrait recharger les questions avec refreshQuestion()', async () => {
      const { result } = renderHook(() => useCurrentQuestion());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialQuestion = result.current.currentQuestion;

      await act(async () => {
        result.current.refreshQuestion();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // La question devrait être rechargée (peut être la même ou différente selon l'ordre)
      expect(result.current.currentQuestion).toBeTruthy();
    });
  });
});
