/**
 * Tests d'intégration WebSocket pour synchronisation temps réel des questions
 * Story 2.2 - Intégration WebSocket
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCurrentQuestion } from '@/hooks/useCurrentQuestion';
import { Question } from '@/types/gamification';

// Mock de CorrelationManager
jest.mock('@/lib/logger/correlation', () => ({
  CorrelationManager: {
    getCurrentContext: jest.fn(() => ({ id: 'test-correlation-id' })),
    generateId: jest.fn(() => 'test-correlation-id'),
  },
}));

// Mock de fetch pour l'API
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    success: true,
    data: []
  })
});

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => null) | null = null;
  onerror: ((event: Event) => void) | null = null;

  send = jest.fn();
  close = jest.fn();

  constructor(public url: string) {
    // Simuler connexion immédiate
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }
}

(global as any).WebSocket = MockWebSocket as any;

describe('WebSocket Question Synchronization - Story 2.2', () => {
  const mockQuestion: Question = {
    id: '1',
    text: 'Quelle est la capitale de la France ?',
    answers: ['Paris', 'Lyon', 'Marseille'],
    difficulty: 'facile',
    points: 10,
    category: 'Géographie'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Événement question:new', () => {
    test('devrait recevoir et traiter l\'événement question:new via WebSocket', async () => {
      const { result: wsResult } = renderHook(() => useWebSocket());
      const { result: questionResult } = renderHook(() => useCurrentQuestion());

      await waitFor(() => {
        expect(wsResult.current.isConnected).toBe(true);
      });

      // Simuler réception d'un événement question:new
      const questionEvent = {
        type: 'question:new',
        payload: mockQuestion,
        timestamp: new Date().toISOString(),
        sessionId: 'test-session'
      };

      // Déclencher l'événement WebSocket
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(questionEvent)
      });

      // Simuler réception du message
      if (wsResult.current.socket) {
        (wsResult.current.socket as any).onmessage(messageEvent);
      }

      // Vérifier que la question a été mise à jour
      await waitFor(() => {
        expect(questionResult.current.currentQuestion).toEqual(mockQuestion);
      });
    });
  });

  describe('Synchronisation multi-clients', () => {
    test('devrait synchroniser l\'affichage entre tous les clients connectés', async () => {
      // Simuler plusieurs clients avec WebSocket connecté
      const { result: wsResult } = renderHook(() => useWebSocket());
      const client1 = renderHook(() => useCurrentQuestion());
      const client2 = renderHook(() => useCurrentQuestion());

      await waitFor(() => {
        expect(wsResult.current.isConnected).toBe(true);
      });

      // Simuler réception d'un événement question:new via WebSocket
      const questionEvent = {
        type: 'question:new',
        payload: mockQuestion,
        timestamp: new Date().toISOString(),
        sessionId: 'test-session'
      };

      // Émettre l'événement via window (comme le fait useWebSocket)
      window.dispatchEvent(new CustomEvent('websocket:message', { detail: questionEvent }));

      // Les deux clients devraient recevoir la même question
      await waitFor(() => {
        expect(client1.result.current.currentQuestion?.id).toBe(mockQuestion.id);
      });
      
      await waitFor(() => {
        expect(client2.result.current.currentQuestion?.id).toBe(mockQuestion.id);
      });
    });
  });

  describe('Reconnexion WebSocket', () => {
    test('devrait récupérer l\'état de la question courante après reconnexion', async () => {
      // Mock fetch pour retourner des questions
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockQuestion]
        })
      });

      const { result: wsResult } = renderHook(() => useWebSocket());
      const { result: questionResult } = renderHook(() => useCurrentQuestion());

      // Attendre que les questions soient chargées
      await waitFor(() => {
        expect(questionResult.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(wsResult.current.isConnected).toBe(true);
      });

      // Vérifier qu'une question est chargée
      expect(questionResult.current.currentQuestion).toBeTruthy();
      const initialQuestion = questionResult.current.currentQuestion;

      // Simuler déconnexion
      if (wsResult.current.socket) {
        (wsResult.current.socket as any).readyState = MockWebSocket.CLOSED;
        if ((wsResult.current.socket as any).onclose) {
          (wsResult.current.socket as any).onclose(new CloseEvent('close'));
        }
      }

      // Simuler reconnexion
      await waitFor(() => {
        expect(wsResult.current.isConnected).toBe(true);
      }, { timeout: 3000 });

      // Vérifier que la question courante est toujours disponible après reconnexion
      await waitFor(() => {
        expect(questionResult.current.currentQuestion).toBeTruthy();
      });
    });
  });
});
