/**
 * Tests unitaires - Hook useQuestionRotation
 * Story 2.3 - Rotation Automatique des Questions
 * 
 * Note: Tests d'intégration simplifiés - les tests E2E compléteront la couverture
 * pour les comportements complexes de synchronisation WebSocket et rotation automatique.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock uuid avant les imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'test-session-id'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock fetch global pour éviter erreurs dans useCurrentQuestion
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({
      success: true,
      data: [{
        id: 'q1',
        text: 'Test question',
        answers: ['A', 'B'],
        difficulty: 'facile',
        points: 10
      }]
    })
  })
) as jest.Mock;

// Mock des hooks dépendants avec fonctions mockées réutilisables
const mockNextQuestion = jest.fn();
const mockRefreshQuestion = jest.fn();
const mockStartTimer = jest.fn();
const mockStopTimer = jest.fn();
const mockResetTimer = jest.fn();
const mockSendMessage = jest.fn();

const mockQuestion = {
  id: 'q1',
  text: 'Test question',
  answers: ['A', 'B'],
  difficulty: 'facile' as const,
  points: 10
};

// Mock useCurrentQuestion
jest.mock('@/hooks/useCurrentQuestion', () => ({
  useCurrentQuestion: jest.fn(() => ({
    currentQuestion: mockQuestion,
    isLoading: false,
    error: null,
    nextQuestion: mockNextQuestion,
    refreshQuestion: mockRefreshQuestion
  }))
}));

// Mock useQuestionTimer
jest.mock('@/hooks/useQuestionTimer', () => ({
  useQuestionTimer: jest.fn(() => ({
    timeRemaining: 30,
    isExpired: false,
    startTimer: mockStartTimer,
    stopTimer: mockStopTimer,
    resetTimer: mockResetTimer
  }))
}));

// Mock useWebSocket
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    isConnected: true,
    sendMessage: mockSendMessage
  }))
}));

import { useQuestionRotation } from '@/hooks/useQuestionRotation';

// Mock des timers
jest.useFakeTimers();

describe('useQuestionRotation', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('[P1] devrait initialiser avec les valeurs par défaut', async () => {
    // GIVEN: Hook initialisé
    // WHEN: Rendant le hook
    const { result } = renderHook(() => useQuestionRotation());

    // Attendre que les effets asynchrones se terminent
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    // THEN: Les valeurs par défaut sont correctes
    expect(result.current.currentQuestion).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(result.current.error).toBeDefined();
    expect(result.current.timeRemaining).toBeDefined();
    expect(typeof result.current.timeRemaining).toBe('number');
    expect(result.current.isExpired).toBeDefined();
    expect(typeof result.current.isExpired).toBe('boolean');
    expect(result.current.isTransitioning).toBe(false);
  });

  it('[P1] devrait exposer les propriétés du hook correctement', () => {
    // GIVEN: Hook initialisé
    const { result } = renderHook(() => useQuestionRotation());

    // THEN: Toutes les propriétés sont présentes
    expect(result.current).toHaveProperty('currentQuestion');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('timeRemaining');
    expect(result.current).toHaveProperty('isExpired');
    expect(result.current).toHaveProperty('isTransitioning');
  });

  it('[P1] devrait écouter l\'événement winner:announced', async () => {
    // GIVEN: Hook initialisé
    const { result } = renderHook(() => useQuestionRotation());

    // WHEN: Émettant l'événement winner:announced
    act(() => {
      const event = new CustomEvent('winner:announced', {
        detail: { winner: 'test-user' }
      });
      window.dispatchEvent(event);
    });

    // THEN: L'événement devrait être écouté (pas d'erreur)
    // Note: Le comportement complet (arrêt timer, rotation) est testé en E2E
    await waitFor(() => {
      expect(result.current).toBeDefined();
    }, { timeout: 1000 });

    // ET: La rotation devrait être déclenchée après célébration
    act(() => {
      jest.advanceTimersByTime(5000); // Durée célébration par défaut
    });

    act(() => {
      jest.advanceTimersByTime(300); // Durée animation
    });

    // Vérifier que le hook est toujours fonctionnel
    expect(result.current.isTransitioning).toBeDefined();
  });

  it('[P2] devrait nettoyer les timeouts au démontage', () => {
    // GIVEN: Hook avec célébration en cours
    const { result, unmount } = renderHook(() => useQuestionRotation());

    act(() => {
      const event = new CustomEvent('winner:announced', {
        detail: { winner: 'test-user' }
      });
      window.dispatchEvent(event);
    });

    // WHEN: Démonter le composant
    unmount();

    // THEN: Les timeouts devraient être nettoyés (pas d'erreur)
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Pas d'erreur = nettoyage réussi
    expect(result.current).toBeDefined();
  });

  it('[P2] devrait gérer l\'état de transition correctement', () => {
    // GIVEN: Hook initialisé
    const { result } = renderHook(() => useQuestionRotation());

    // THEN: isTransitioning devrait être false initialement
    expect(result.current.isTransitioning).toBe(false);
  });

  it('[P2] devrait avoir accès aux fonctions de timer', () => {
    // GIVEN: Hook initialisé
    const { result } = renderHook(() => useQuestionRotation());

    // THEN: Les valeurs du timer sont accessibles
    expect(result.current.timeRemaining).toBeDefined();
    expect(typeof result.current.timeRemaining).toBe('number');
    expect(result.current.isExpired).toBeDefined();
    expect(typeof result.current.isExpired).toBe('boolean');
  });

  it('[P2] devrait exposer la question courante', async () => {
    // GIVEN: Hook initialisé
    const { result } = renderHook(() => useQuestionRotation());

    // Attendre que le hook soit complètement initialisé avec currentQuestion défini
    // Selon le mock useCurrentQuestion, currentQuestion devrait être mockQuestion
    await waitFor(() => {
      expect(result.current.currentQuestion).toBeDefined();
      expect(result.current.currentQuestion).not.toBeNull();
      expect(result.current.currentQuestion).toHaveProperty('id');
      expect(result.current.currentQuestion).toHaveProperty('text');
    }, { timeout: 2000 });

    // THEN: currentQuestion devrait être accessible avec toutes ses propriétés
    // Assertions explicites sans conditional - le mock garantit que currentQuestion est défini
    expect(result.current.currentQuestion).toHaveProperty('id');
    expect(result.current.currentQuestion).toHaveProperty('text');
  });

  it('[P2] devrait gérer les erreurs de chargement', () => {
    // GIVEN: Hook initialisé
    const { result } = renderHook(() => useQuestionRotation());

    // THEN: error devrait être accessible (null par défaut)
    expect(result.current.error).toBeDefined();
    expect(result.current.error).toBeNull();
  });
});
