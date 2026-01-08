/**
 * Tests d'intégration pour CommentWebSocketIntegration
 * Story 2.4: Parsing des Commentaires du Chat
 *
 * Tests:
 * - Intégration TikTok connector → Parser → WebSocket
 * - Événement answer:received émis correctement
 * - Gestion question courante
 * - Gestion erreurs et cas limites
 */

// Mock des dépendances avant imports
jest.mock('../../../lib/logger/correlation', () => ({
  CorrelationManager: {
    generateId: () => 'mock-correlation-id',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runInContext: async (_ctx: any, fn: any) => fn(),
    getElapsedTime: () => 100
  }
}));

jest.mock('../../../lib/logger/metrics', () => ({
  MetricsCollector: {
    recordMetric: jest.fn(),
    recordError: jest.fn(),
    recordCommentReceived: jest.fn(),
    recordConnection: jest.fn(),
    getRecentMetrics: jest.fn(() => [])
  }
}));

import { CommentWebSocketIntegration, AnswerReceivedPayload, WebSocketEvent } from '../../../lib/tiktok/comment-websocket-integration';
import { TikTokEvent } from '../../../lib/tiktok/types';

// Mock du connector TikTok
class MockTikTokConnector {
  private listeners: Map<string, (event: TikTokEvent) => void> = new Map();

  onEvent(listener: (event: TikTokEvent) => void): string {
    const id = `listener-${Date.now()}-${Math.random()}`;
    this.listeners.set(id, listener);
    return id;
  }

  removeEventListener(listenerId: string): void {
    this.listeners.delete(listenerId);
  }

  // Méthode helper pour simuler un événement
  simulateEvent(event: TikTokEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  getListenerCount(): number {
    return this.listeners.size;
  }
}

describe('CommentWebSocketIntegration - Story 2.4', () => {
  let integration: CommentWebSocketIntegration;
  let mockConnector: MockTikTokConnector;
  let emittedEvents: WebSocketEvent[];
  let websocketEmitter: (event: WebSocketEvent) => void;

  beforeEach(() => {
    integration = new CommentWebSocketIntegration();
    mockConnector = new MockTikTokConnector();
    emittedEvents = [];

    // Mock de l'émetteur WebSocket
    websocketEmitter = (event: WebSocketEvent) => {
      emittedEvents.push(event);
    };

    // Initialiser l'intégration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    integration.initialize(mockConnector as any, websocketEmitter);
  });

  afterEach(() => {
    integration.cleanup();
  });

  describe('Intégration TikTok → Parser → WebSocket', () => {
    it('devrait émettre answer:received pour commentaire valide avec question active (format WebcastChatMessage)', () => {
      // Arrange: Définir question courante
      integration.setCurrentQuestion('question-123');

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { uniqueId: 'testuser', userId: '1', nickname: 'Test' },
          comment: 'Réponse A',
          timestamp: Date.now()
        },
        correlationId: 'test-correlation-id'
      };

      // Act: Simuler réception événement TikTok
      mockConnector.simulateEvent(commentEvent);

      // Assert: Événement answer:received émis
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].type).toBe('answer:received');
      expect(emittedEvents[0].payload).toMatchObject({
        username: 'testuser',
        cleanedText: 'reponse a',
        questionId: 'question-123'
      });
      expect(emittedEvents[0].payload.timestamp).toBeDefined();
      expect(emittedEvents[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    });

    it('devrait émettre answer:received pour TikTokComment (format interne standardisé)', () => {
      // Arrange: Format TikTokComment (format réel émis par connector)
      integration.setCurrentQuestion('question-456');

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          id: 'comment-123',
          userId: 'user-456',
          username: 'testuser',
          text: 'Réponse B',
          timestamp: new Date(1704067200000),
          sessionId: 'session-789'
        },
        correlationId: 'test-correlation-id'
      };

      // Act: Simuler réception événement TikTok
      mockConnector.simulateEvent(commentEvent);

      // Assert: Événement answer:received émis avec format TikTokComment
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].type).toBe('answer:received');
      expect(emittedEvents[0].payload).toMatchObject({
        username: 'testuser',
        cleanedText: 'reponse b',
        questionId: 'question-456'
      });
      expect(emittedEvents[0].payload.timestamp).toBe(1704067200000);
    });

    it('devrait nettoyer emojis et mentions avant broadcast', () => {
      // Arrange
      integration.setCurrentQuestion('question-456');

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { uniqueId: 'user1', userId: '1', nickname: 'User' },
          comment: '@streamer Réponse B 🎉😊',
          timestamp: Date.now()
        }
      };

      // Act
      mockConnector.simulateEvent(commentEvent);

      // Assert: Texte nettoyé (sans emojis, sans mentions, sans accents)
      expect(emittedEvents[0].payload.cleanedText).toBe('reponse b');
    });

    it('devrait inclure questionId dans payload', () => {
      // Arrange
      integration.setCurrentQuestion('question-789');

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { uniqueId: 'user2', userId: '2', nickname: 'User' },
          comment: 'Test',
          timestamp: Date.now()
        }
      };

      // Act
      mockConnector.simulateEvent(commentEvent);

      // Assert
      expect(emittedEvents[0].payload.questionId).toBe('question-789');
    });
  });

  describe('Gestion Question Courante', () => {
    it('ne devrait PAS émettre answer:received si aucune question active', () => {
      // Arrange: Pas de question définie (setCurrentQuestion non appelé)
      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { uniqueId: 'user3', userId: '3', nickname: 'User' },
          comment: 'Réponse sans question',
          timestamp: Date.now()
        }
      };

      // Act
      mockConnector.simulateEvent(commentEvent);

      // Assert: Aucun événement émis (ignoré silencieusement)
      expect(emittedEvents).toHaveLength(0);
    });

    it('devrait mettre à jour questionId lors de setCurrentQuestion', () => {
      // Arrange
      integration.setCurrentQuestion('question-1');
      expect(integration.getCurrentQuestionId()).toBe('question-1');

      // Act: Changer de question
      integration.setCurrentQuestion('question-2');

      // Assert
      expect(integration.getCurrentQuestionId()).toBe('question-2');
    });

    it('devrait accepter null pour désactiver question courante', () => {
      // Arrange
      integration.setCurrentQuestion('question-active');
      expect(integration.getCurrentQuestionId()).toBe('question-active');

      // Act: Désactiver question
      integration.setCurrentQuestion(null);

      // Assert
      expect(integration.getCurrentQuestionId()).toBeNull();
    });
  });

  describe('Gestion Événements Non-Commentaires', () => {
    it('devrait ignorer événements connect', () => {
      // Arrange
      integration.setCurrentQuestion('question-123');

      const connectEvent: TikTokEvent = {
        type: 'connect',
        timestamp: new Date(),
        data: {}
      };

      // Act
      mockConnector.simulateEvent(connectEvent);

      // Assert: Aucun événement WebSocket émis
      expect(emittedEvents).toHaveLength(0);
    });

    it('devrait ignorer événements disconnect', () => {
      // Arrange
      integration.setCurrentQuestion('question-123');

      const disconnectEvent: TikTokEvent = {
        type: 'disconnect',
        timestamp: new Date(),
        data: {}
      };

      // Act
      mockConnector.simulateEvent(disconnectEvent);

      // Assert
      expect(emittedEvents).toHaveLength(0);
    });

    it('devrait ignorer événements error', () => {
      // Arrange
      integration.setCurrentQuestion('question-123');

      const errorEvent: TikTokEvent = {
        type: 'error',
        timestamp: new Date(),
        data: { error: 'Test error' }
      };

      // Act
      mockConnector.simulateEvent(errorEvent);

      // Assert
      expect(emittedEvents).toHaveLength(0);
    });
  });

  describe('Gestion Commentaires Invalides', () => {
    it('ne devrait PAS émettre pour commentaire avec emojis seulement', () => {
      // Arrange
      integration.setCurrentQuestion('question-123');

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { uniqueId: 'user4', userId: '4', nickname: 'User' },
          comment: '🎉😊🔥', // Texte vide après nettoyage
          timestamp: Date.now()
        }
      };

      // Act
      mockConnector.simulateEvent(commentEvent);

      // Assert: Ignoré silencieusement (texte vide après nettoyage)
      expect(emittedEvents).toHaveLength(0);
    });

    it('ne devrait PAS émettre pour commentaire sans user.uniqueId', () => {
      // Arrange
      integration.setCurrentQuestion('question-123');

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { userId: '5', nickname: 'User' }, // Pas de uniqueId
          comment: 'Test',
          timestamp: Date.now()
        }
      };

      // Act
      mockConnector.simulateEvent(commentEvent);

      // Assert
      expect(emittedEvents).toHaveLength(0);
    });

    it('ne devrait PAS émettre pour commentaire sans texte', () => {
      // Arrange
      integration.setCurrentQuestion('question-123');

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { uniqueId: 'user6', userId: '6', nickname: 'User' },
          // Pas de comment
          timestamp: Date.now()
        }
      };

      // Act
      mockConnector.simulateEvent(commentEvent);

      // Assert
      expect(emittedEvents).toHaveLength(0);
    });
  });

  describe('Synchronisation Multi-Clients', () => {
    it('devrait émettre à tous les clients connectés pour chaque commentaire', () => {
      // Arrange
      integration.setCurrentQuestion('question-sync');

      const comments = [
        { username: 'user1', text: 'Réponse 1' },
        { username: 'user2', text: 'Réponse 2' },
        { username: 'user3', text: 'Réponse 3' }
      ];

      // Act: Simuler 3 commentaires
      comments.forEach((c, i) => {
        mockConnector.simulateEvent({
          type: 'comment',
          timestamp: new Date(),
          data: {
            user: { uniqueId: c.username, userId: `${i}`, nickname: c.username },
            comment: c.text,
            timestamp: Date.now()
          }
        });
      });

      // Assert: 3 événements answer:received émis
      expect(emittedEvents).toHaveLength(3);
      expect(emittedEvents[0].payload.username).toBe('user1');
      expect(emittedEvents[1].payload.username).toBe('user2');
      expect(emittedEvents[2].payload.username).toBe('user3');
    });
  });

  describe('Cleanup et Gestion Ressources', () => {
    it('devrait retirer listener lors cleanup', () => {
      // Arrange
      const initialListenerCount = mockConnector.getListenerCount();
      expect(initialListenerCount).toBe(1);

      // Act: Cleanup
      integration.cleanup();

      // Assert: Listener retiré
      expect(mockConnector.getListenerCount()).toBe(0);
    });

    it('ne devrait PAS émettre après cleanup', () => {
      // Arrange
      integration.setCurrentQuestion('question-123');
      integration.cleanup();

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { uniqueId: 'user7', userId: '7', nickname: 'User' },
          comment: 'Test après cleanup',
          timestamp: Date.now()
        }
      };

      // Act
      mockConnector.simulateEvent(commentEvent);

      // Assert: Aucun événement émis (listener retiré)
      expect(emittedEvents).toHaveLength(0);
    });
  });

  describe('Format Payload answer:received', () => {
    it('devrait avoir structure correcte', () => {
      // Arrange
      integration.setCurrentQuestion('question-format');

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { uniqueId: 'formatuser', userId: '99', nickname: 'Format' },
          comment: 'Test format',
          timestamp: 1704067200000
        }
      };

      // Act
      mockConnector.simulateEvent(commentEvent);

      // Assert: Vérifier structure payload
      const payload = emittedEvents[0].payload as AnswerReceivedPayload;
      expect(payload).toHaveProperty('username');
      expect(payload).toHaveProperty('cleanedText');
      expect(payload).toHaveProperty('questionId');
      expect(payload).toHaveProperty('timestamp');
      expect(typeof payload.username).toBe('string');
      expect(typeof payload.cleanedText).toBe('string');
      expect(typeof payload.questionId).toBe('string');
      expect(typeof payload.timestamp).toBe('number');
    });

    it('devrait avoir timestamp ISO 8601 dans événement', () => {
      // Arrange
      integration.setCurrentQuestion('question-timestamp');

      const commentEvent: TikTokEvent = {
        type: 'comment',
        timestamp: new Date(),
        data: {
          user: { uniqueId: 'timeuser', userId: '88', nickname: 'Time' },
          comment: 'Test',
          timestamp: Date.now()
        }
      };

      // Act
      mockConnector.simulateEvent(commentEvent);

      // Assert: Format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
      expect(emittedEvents[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
