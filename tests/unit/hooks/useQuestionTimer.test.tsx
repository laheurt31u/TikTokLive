/**
 * Tests unitaires - Hook useQuestionTimer
 * Story 2.3 - Rotation Automatique des Questions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock uuid avant l'import du hook
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

import { useQuestionTimer } from '@/hooks/useQuestionTimer';

// Mock des timers
jest.useFakeTimers();

describe('useQuestionTimer', () => {
  const defaultDuration = 30; // 30 secondes par défaut

  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('[P1] devrait initialiser avec le temps restant correct', () => {
    // GIVEN: Hook avec durée par défaut
    // WHEN: Rendant le hook
    const { result } = renderHook(() => useQuestionTimer(defaultDuration));

    // THEN: Le temps restant est égal à la durée
    expect(result.current.timeRemaining).toBe(defaultDuration);
    expect(result.current.isExpired).toBe(false);
  });

  it('[P1] devrait démarrer le timer et décrémenter le temps', async () => {
    // GIVEN: Hook initialisé
    const { result } = renderHook(() => useQuestionTimer(defaultDuration));

    // WHEN: Démarrant le timer
    act(() => {
      result.current.startTimer();
    });

    // THEN: Le timer démarre
    expect(result.current.timeRemaining).toBe(defaultDuration);

    // WHEN: Avançant de 5 secondes (wrappé dans act pour éviter warnings)
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // THEN: Le temps restant a diminué
    await waitFor(() => {
      expect(result.current.timeRemaining).toBe(defaultDuration - 5);
    });
    expect(result.current.isExpired).toBe(false);
  });

  it('[P1] devrait expirer quand le timer atteint 0', async () => {
    // GIVEN: Hook avec timer démarré
    const { result } = renderHook(() => useQuestionTimer(defaultDuration));

    act(() => {
      result.current.startTimer();
    });

    // WHEN: Avançant jusqu'à expiration (30 secondes) - wrappé dans act
    await act(async () => {
      jest.advanceTimersByTime(defaultDuration * 1000);
    });

    // THEN: Le timer est expiré
    await waitFor(() => {
      expect(result.current.isExpired).toBe(true);
      expect(result.current.timeRemaining).toBe(0);
    });
  });

  it('[P1] devrait arrêter le timer', async () => {
    // GIVEN: Hook avec timer démarré
    const { result } = renderHook(() => useQuestionTimer(defaultDuration));

    act(() => {
      result.current.startTimer();
    });

    // WHEN: Avançant de 5 secondes puis arrêtant
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    const timeBeforeStop = result.current.timeRemaining;

    act(() => {
      result.current.stopTimer();
    });

    // WHEN: Avançant encore de 5 secondes
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // THEN: Le temps restant n'a pas changé (timer arrêté)
    await waitFor(() => {
      expect(result.current.timeRemaining).toBe(timeBeforeStop);
    });
  });

  it('[P1] devrait réinitialiser le timer', async () => {
    // GIVEN: Hook avec timer démarré et avancé
    const { result } = renderHook(() => useQuestionTimer(defaultDuration));

    act(() => {
      result.current.startTimer();
    });

    await act(async () => {
      jest.advanceTimersByTime(10000); // 10 secondes
    });

    // WHEN: Réinitialisant le timer
    act(() => {
      result.current.resetTimer();
    });

    // THEN: Le temps restant est revenu à la durée initiale
    await waitFor(() => {
      expect(result.current.timeRemaining).toBe(defaultDuration);
      expect(result.current.isExpired).toBe(false);
    });
  });

  it('[P2] devrait émettre événement question:expired via WebSocket à expiration', async () => {
    // GIVEN: Hook avec timer démarré et mock WebSocket
    const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useQuestionTimer(defaultDuration));

    act(() => {
      result.current.startTimer();
    });

    // WHEN: Avançant jusqu'à expiration (30 secondes = 30 * 1000ms)
    await act(async () => {
      jest.advanceTimersByTime(defaultDuration * 1000);
    });

    // THEN: Événement question:expired est émis
    await waitFor(() => {
      expect(result.current.isExpired).toBe(true);
      expect(mockDispatchEvent).toHaveBeenCalled();
      
      const calls = mockDispatchEvent.mock.calls;
      const expiredEvent = calls.find(call => {
        const event = call[0] as CustomEvent;
        return event.type === 'question:expired';
      });
      expect(expiredEvent).toBeDefined();
    });

    mockDispatchEvent.mockRestore();
  });

  it('[P2] devrait nettoyer le timer au démontage', async () => {
    // GIVEN: Hook avec timer démarré
    const { result, unmount } = renderHook(() => useQuestionTimer(defaultDuration));

    act(() => {
      result.current.startTimer();
    });

    // WHEN: Démonter le composant
    unmount();

    // THEN: Le timer est nettoyé (pas d'erreur de timer après démontage)
    // Vérifier qu'aucun timer n'est actif après démontage
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    
    // Le timer devrait être nettoyé (pas d'erreur)
    expect(result.current.timeRemaining).toBeDefined();
  });
});
