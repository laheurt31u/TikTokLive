/**
 * Tests pour la fonctionnalité de commentaires temps réel du connecteur TikTok
 */

import { TikTokConnector } from '../connector';
import { TikTokComment } from '../types';
import { ControlEvent, WebcastEvent } from 'tiktok-live-connector';

// Mock uuid pour éviter les problèmes ES modules avec Jest
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

// Mock tiktok-live-connector
const mockEventHandlers: Map<string | symbol, Function> = new Map();

const mockOn = jest.fn((event: string | symbol, callback: Function) => {
  mockEventHandlers.set(event, callback);
});

const mockEmit = jest.fn((event: string, data: any) => {
  console.log('EMIT called:', event, data);
  const handler = mockEventHandlers.get(event);
  console.log('Handler found:', !!handler);
  if (handler) {
    handler(data);
  }
});

const mockTikTokConnection = {
  connect: jest.fn().mockResolvedValue(undefined),
  on: mockOn,
  emit: mockEmit
};

// Mock the constructor
jest.mock('tiktok-live-connector', () => ({
  TikTokLiveConnection: jest.fn().mockImplementation(() => mockTikTokConnection),
  ControlEvent: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    WEBSOCKET_CONNECTED: 'websocketConnected',
    WEBSOCKET_DATA: 'websocketData',
    RAW_DATA: 'rawData',
    DECODED_DATA: 'decodedData',
    ENTER_ROOM: 'enterRoom'
  },
  WebcastEvent: {
    CHAT: 'chat',
    MEMBER: 'member',
    GIFT: 'gift',
    ROOM_USER: 'roomUser',
    SOCIAL: 'social',
    LIKE: 'like',
    QUESTION_NEW: 'questionNew',
    LINK_MIC_BATTLE: 'linkMicBattle',
    LINK_MIC_ARMIES: 'linkMicArmies',
    LIVE_INTRO: 'liveIntro',
    EMOTE: 'emote',
    ENVELOPE: 'envelope',
    FOLLOW: 'follow',
    SHARE: 'share',
    STREAM_END: 'streamEnd',
    CONTROL_MESSAGE: 'controlMessage',
    BARRAGE: 'barrage',
    HOURLY_RANK: 'hourlyRank',
    GOAL_UPDATE: 'goalUpdate',
    ROOM_MESSAGE: 'roomMessage',
    CAPTION_MESSAGE: 'captionMessage',
    IM_DELETE: 'imDelete',
    IN_ROOM_BANNER: 'inRoomBanner',
    RANK_UPDATE: 'rankUpdate',
    POLL_MESSAGE: 'pollMessage',
    RANK_TEXT: 'rankText'
  }
}));

describe('TikTokConnector - Commentaires Temps Réel', () => {
  let connector: TikTokConnector;
  let mockTikTokConnection: any;

  beforeEach(() => {
    // Mock de la connexion TikTok
    mockTikTokConnection = {
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      emit: jest.fn()
    };

    // Créer un connecteur avec un ID unique pour les tests
    connector = new TikTokConnector('test-connector');
  });

  afterEach(async () => {
    await connector.cleanup();
  });

  describe('Réception et traitement des commentaires', () => {
    it('devrait émettre un événement comment quand un commentaire TikTok est reçu', async () => {
      // Given: Configuration et connexion établie
      const sessionId = 'test-session-123';
      const cookies = 'session=test-cookie';

      await connector.initialize(sessionId, cookies);
      await connector.connect('test-live-id');

      // When: Un commentaire est reçu du connecteur TikTok
      const mockCommentData = {
        commentId: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Hello from TikTok!',
        timestamp: new Date()
      };

      // Then: L'événement devrait être émis avec les bonnes données
      const eventPromise = new Promise<TikTokComment>((resolve) => {
        connector.onEvent((event) => {
          if (event.type === 'comment') {
            resolve(event.data as TikTokComment);
          }
        });
      });

      // Simuler l'événement du connecteur TikTok en appelant directement le handler
      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        chatHandler(mockCommentData);
      } else {
        console.log('No chat handler found');
      }

      const receivedComment = await eventPromise;

      expect(receivedComment).toEqual({
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Hello from TikTok!',
        timestamp: expect.any(Date),
        sessionId: 'test-session-123'
      });
    });

    it('devrait valider et nettoyer les données de commentaire', async () => {
      // Given: Configuration établie
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: Un commentaire avec données invalides est reçu
      const invalidCommentData = {
        commentId: '', // ID vide invalide
        userId: 'user-456',
        username: 'testuser',
        text: '   ', // Texte vide invalide
        timestamp: 'invalid-date' // Timestamp invalide
      };

      // Then: Un événement d'erreur devrait être émis pour les données invalides
      const eventPromise = new Promise<any>((resolve) => {
        connector.onEvent((event) => {
          if (event.type === 'error') {
            resolve(event);
          }
        });
      });

      // Simuler l'événement du connecteur TikTok
      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        chatHandler(invalidCommentData);
      }

      const errorEvent = await eventPromise;

      // Then: Un événement d'erreur devrait être émis
      expect(errorEvent.type).toBe('error');
      expect(errorEvent.data.error).toBe('Comment parsing failed');
      expect(errorEvent.correlationId).toBeDefined();
    });

    it('devrait inclure le correlation ID dans les événements commentaires', async () => {
      // Given: Configuration établie
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: Un commentaire est reçu
      const mockCommentData = {
        commentId: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Hello from TikTok!',
        timestamp: new Date()
      };

      const eventPromise = new Promise<any>((resolve) => {
        connector.onEvent((event) => {
          if (event.type === 'comment') {
            resolve(event);
          }
        });
      });

      // Simuler l'événement du connecteur TikTok
      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        chatHandler(mockCommentData);
      }

      const event = await eventPromise;

      // Then: L'événement devrait inclure le correlation ID
      expect(event.correlationId).toBeDefined();
      expect(typeof event.correlationId).toBe('string');
      expect(event.correlationId).toBe(connector.getCorrelationId());
    });

    it('devrait mesurer la latence de réception des commentaires', async () => {
      // Given: Configuration établie
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: Un commentaire est reçu
      const startTime = Date.now();

      const mockCommentData = {
        commentId: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Hello from TikTok!',
        timestamp: new Date()
      };

      const eventPromise = new Promise<any>((resolve) => {
        connector.onEvent((event) => {
          if (event.type === 'comment') {
            resolve(event);
          }
        });
      });

      // Simuler l'événement du connecteur TikTok
      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        chatHandler(mockCommentData);
      }

      const event = await eventPromise;
      const endTime = Date.now();

      // Then: La latence devrait être mesurée et incluse
      expect(event.latency).toBeDefined();
      expect(typeof event.latency).toBe('number');
      expect(event.latency).toBeGreaterThanOrEqual(0);
      expect(event.latency).toBeLessThanOrEqual(endTime - startTime);
    });
  });

  describe('Optimisations Performance Temps Réel', () => {
    it('devrait utiliser le cache pour métadonnées fréquentes', async () => {
      // Given: Configuration établie
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: Métadonnées stockées en cache
      const testData = { userInfo: 'test', preferences: { theme: 'dark' } };
      connector.setCachedMetadata('user-session-123', testData);

      // Then: Métadonnées récupérables depuis le cache
      const cachedData = connector.getCachedMetadata('user-session-123');
      expect(cachedData).toEqual(testData);
    });

    it('devrait mesurer les métriques de performance temps réel', async () => {
      // Given: Configuration établie et commentaires traités
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: Métriques de performance demandées
      const metrics = connector.getPerformanceMetrics();

      // Then: Métriques incluent les indicateurs critiques
      expect(metrics).toHaveProperty('avgCommentLatency');
      expect(metrics).toHaveProperty('batchEfficiency');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('connectionHealth');

      expect(typeof metrics.avgCommentLatency).toBe('number');
      expect(typeof metrics.batchEfficiency).toBe('number');
      expect(typeof metrics.cacheHitRate).toBe('number');
      expect(typeof metrics.connectionHealth).toBe('number');
    });

    it('devrait respecter les contraintes NFR de latence < 2s', async () => {
      // Given: Configuration établie
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: Commentaire traité
      const mockCommentData = {
        commentId: 'comment-fast',
        userId: 'user-fast',
        username: 'fastuser',
        text: 'Testing latency!',
        timestamp: new Date()
      };

      const startTime = Date.now();
      const eventPromise = new Promise<any>((resolve) => {
        connector.onEvent((event) => {
          if (event.type === 'comment') {
            resolve(event);
          }
        });
      });

      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        chatHandler(mockCommentData);
      }

      // Force flush pour mesurer immédiatement
      connector.flushCommentBatch();

      const event = await eventPromise;
      const totalTime = Date.now() - startTime;

      // Then: Latence respecte NFR (< 2s = 2000ms)
      expect(event.latency).toBeLessThan(2000);
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('Gestion Erreurs et Reconnexions Étendue', () => {
    it('devrait activer le mode polling fallback après 5 échecs consécutifs', async () => {
      // Given: Configuration établie
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: 5 échecs consécutifs de commentaires
      for (let i = 0; i < 5; i++) {
        const invalidCommentData = {
          commentId: '', // Données invalides
          userId: 'user-456',
          username: 'testuser',
          text: '   ',
          timestamp: 'invalid-date'
        };

        const chatHandler = mockEventHandlers.get('chat');
        if (chatHandler) {
          chatHandler(invalidCommentData);
        }
      }

      // Then: Mode polling fallback activé
      await new Promise(resolve => setTimeout(resolve, 10)); // Petite attente pour le traitement
      expect(connector.isPollingFallbackActive()).toBe(true);
    });

    it('devrait désactiver le mode polling fallback après un commentaire réussi', async () => {
      // Given: Mode polling fallback actif (simulé)
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // Activer manuellement le fallback pour le test
      connector.forceDeactivatePollingFallback(); // Reset d'abord

      // Simuler des échecs pour activer le fallback
      for (let i = 0; i < 5; i++) {
        const invalidCommentData = {
          commentId: '',
          userId: 'user-456',
          username: 'testuser',
          text: '   ',
          timestamp: 'invalid-date'
        };
        const chatHandler = mockEventHandlers.get('chat');
        if (chatHandler) {
          chatHandler(invalidCommentData);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(connector.isPollingFallbackActive()).toBe(true);

      // When: Un commentaire valide est reçu
      const validCommentData = {
        commentId: 'comment-valid',
        userId: 'user-valid',
        username: 'validuser',
        text: 'This is valid!',
        timestamp: new Date()
      };

      const eventPromise = new Promise<any>((resolve) => {
        connector.onEvent((event) => {
          if (event.type === 'comment') {
            resolve(event);
          }
        });
      });

      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        chatHandler(validCommentData);
      }

      await eventPromise;

      // Then: Mode polling fallback désactivé
      expect(connector.isPollingFallbackActive()).toBe(false);
    });

    it('devrait calculer correctement le taux de succès des commentaires', async () => {
      // Given: Configuration établie
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: Mélange de commentaires valides et invalides
      const testData = [
        { commentId: 'valid-1', userId: 'user-1', username: 'user1', text: 'Valid 1', timestamp: new Date() },
        { commentId: '', userId: 'user-2', username: 'user2', text: '   ', timestamp: 'invalid' }, // Invalid
        { commentId: 'valid-2', userId: 'user-3', username: 'user3', text: 'Valid 2', timestamp: new Date() },
        { commentId: 'valid-3', userId: 'user-4', username: 'user4', text: 'Valid 3', timestamp: new Date() },
        { commentId: '', userId: 'user-5', username: 'user5', text: '', timestamp: 'invalid' } // Invalid
      ];

      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        testData.forEach(data => chatHandler(data));
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      // Then: Taux de succès = 3 valides / 5 total = 0.6
      const successRate = connector.getCommentSuccessRate();
      expect(successRate).toBe(0.6);
    });
  });

  describe('Tests d\'Intégration Temps Réel', () => {
    it('devrait gérer un flux de commentaires haute fréquence avec batching', async () => {
      // Given: Configuration établie
      await connector.initialize('session-high-freq', 'cookies=test');
      await connector.connect('test-live-high-freq');

      const receivedComments: any[] = [];
      const eventPromise = new Promise<void>((resolve) => {
        let commentCount = 0;
        connector.onEvent((event) => {
          if (event.type === 'comment') {
            receivedComments.push(event);
            commentCount++;
            if (commentCount >= 10) { // Attendre 10 commentaires
              resolve();
            }
          }
        });
      });

      // When: 10 commentaires reçus en rafale
      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        for (let i = 0; i < 10; i++) {
          const commentData = {
            commentId: `comment-${i}`,
            userId: `user-${i}`,
            username: `user${i}`,
            text: `Comment number ${i} from TikTok live!`,
            timestamp: new Date()
          };
          chatHandler(commentData);

          // Petite pause pour simuler la fréquence réelle
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Force flush du batch pour traitement immédiat
      connector.flushCommentBatch();

      await eventPromise;

      // Then: Tous les commentaires reçus et traités
      expect(receivedComments).toHaveLength(10);
      receivedComments.forEach((event, index) => {
        expect(event.type).toBe('comment');
        expect(event.data.id).toBe(`comment-${index}`);
        expect(event.data.username).toBe(`user${index}`);
        expect(event.latency).toBeGreaterThanOrEqual(0);
        expect(event.correlationId).toBeDefined();
      });
    });

    it('devrait maintenir les performances sous charge avec métriques temps réel', async () => {
      // Given: Configuration établie
      await connector.initialize('session-perf', 'cookies=test');
      await connector.connect('test-live-perf');

      const startTime = Date.now();

      // When: Charge de commentaires simulée
      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        // Simuler 20 commentaires en 1 seconde
        for (let i = 0; i < 20; i++) {
          const commentData = {
            commentId: `perf-comment-${i}`,
            userId: `perf-user-${i}`,
            username: `perfuser${i}`,
            text: `Performance test comment ${i}`,
            timestamp: new Date()
          };
          chatHandler(commentData);

          if (i % 5 === 0) { // Petite pause toutes les 5 itérations
            await new Promise(resolve => setTimeout(resolve, 5));
          }
        }
      }

      // Force flush et attendre traitement
      connector.flushCommentBatch();
      await new Promise(resolve => setTimeout(resolve, 50));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Then: Performances dans les limites NFR
      const metrics = connector.getPerformanceMetrics();

      expect(totalTime).toBeLessThan(2000); // Moins de 2 secondes total
      expect(metrics.avgCommentLatency).toBeLessThan(2000); // Latence moyenne < 2s
      expect(metrics.batchEfficiency).toBeGreaterThan(1); // Batching efficace
    });

    it('devrait gérer les erreurs réseau et reconnexions automatiquement', async () => {
      // Given: Configuration établie
      await connector.initialize('session-network', 'cookies=test');
      await connector.connect('test-live-network');

      // When: Simulation d'erreurs réseau (commentaires invalides + reconnexion)
      const chatHandler = mockEventHandlers.get('chat');
      let errorCount = 0;
      let successCount = 0;

      const networkTestPromise = new Promise<void>((resolve) => {
        connector.onEvent((event) => {
          if (event.type === 'error') {
            errorCount++;
          } else if (event.type === 'comment') {
            successCount++;
          }

          // Après 15 événements (erreurs + succès), terminer
          if (errorCount + successCount >= 15) {
            resolve();
          }
        });
      });

      if (chatHandler) {
        // 10 commentaires invalides (simulant coupure réseau)
        for (let i = 0; i < 10; i++) {
          chatHandler({
            commentId: '',
            userId: 'user-error',
            username: 'erroruser',
            text: '',
            timestamp: 'invalid'
          });
        }

        // 5 commentaires valides (simulant reconnexion)
        for (let i = 0; i < 5; i++) {
          chatHandler({
            commentId: `recovery-comment-${i}`,
            userId: `recovery-user-${i}`,
            username: `recoveryuser${i}`,
            text: `Recovery comment ${i}`,
            timestamp: new Date()
          });
        }
      }

      connector.flushCommentBatch();
      await networkTestPromise;

      // Then: Système résilient aux erreurs réseau
      expect(errorCount).toBe(10); // 10 erreurs détectées
      expect(successCount).toBe(5);  // 5 succès après reconnexion simulée

      // Vérifier que le mode fallback s'active puis se désactive
      expect(connector.isPollingFallbackActive()).toBe(false); // Désactivé après succès
      expect(connector.getCommentSuccessRate()).toBe(5/15); // 5 succès sur 15 tentatives
    });
  });

  describe('Gestion des erreurs commentaires', () => {
    beforeEach(() => {
      jest.setTimeout(15000); // Timeout plus long pour les tests de performance
    });

    it.skip('devrait gérer un flux de commentaires haute fréquence avec 10 commentaires simultanés', async function() {

      // Given: Configuration établie
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: 10 commentaires arrivent simultanément (simulation charge modérée)
      const commentPromises: Promise<any>[] = [];
      const expectedComments: TikTokComment[] = [];

      for (let i = 0; i < 10; i++) {
        const mockCommentData = {
          commentId: `comment-${i}`,
          userId: `user-${i}`,
          username: `user${i}`,
          text: `Comment numéro ${i} pour test de charge`,
          timestamp: new Date()
        };

        expectedComments.push({
          id: `comment-${i}`,
          userId: `user-${i}`,
          username: `user${i}`,
          text: `Comment numéro ${i} pour test de charge`,
          timestamp: expect.any(Date),
          sessionId: 'session-123'
        });

        // Simuler l'arrivée simultanée des commentaires
        commentPromises.push(new Promise<void>((resolve) => {
          setTimeout(() => {
            const chatHandler = mockEventHandlers.get('chat');
            if (chatHandler) {
              chatHandler(mockCommentData);
            }
            resolve();
          }, Math.random() * 10); // Délai aléatoire pour simuler l'arrivée réelle
        }));
      }

      // Attendre que tous les commentaires soient traités
      await Promise.all(commentPromises);

      // Forcer le flush des batches pour mesurer les résultats
      connector.flushCommentBatch();

      // Collecter tous les événements émis
      const receivedEvents: TikTokComment[] = [];
      const eventCollectionPromise = new Promise<void>((resolve) => {
        let eventCount = 0;
        connector.onEvent((event) => {
          if (event.type === 'comment') {
            receivedEvents.push(event.data as TikTokComment);
            eventCount++;
            if (eventCount >= 10) {
              resolve();
            }
          }
        });
      });

      // Attendre que tous les événements soient collectés
      await eventCollectionPromise;

      // Then: Tous les commentaires doivent être traités correctement
      expect(receivedEvents).toHaveLength(10);

      // Vérifier que tous les commentaires ont été reçus (peu importe l'ordre)
      expectedComments.forEach(expected => {
        expect(receivedEvents).toContainEqual(expected);
      });

      // Vérifier les métriques de performance
      const performanceMetrics = connector.getPerformanceMetrics();
      expect(performanceMetrics.avgCommentLatency).toBeLessThan(2000); // < 2s NFR
      expect(performanceMetrics.batchEfficiency).toBeGreaterThan(1); // Batching actif
    });

    it('devrait gérer les erreurs de parsing des commentaires', async () => {
      // Given: Configuration établie
      await connector.initialize('session-123', 'cookies=test');
      await connector.connect('test-live-id');

      // When: Un événement de commentaire malformé est reçu
      const malformedCommentData = null; // Données complètement malformées

      const errorEventPromise = new Promise<any>((resolve) => {
        connector.onEvent((event) => {
          if (event.type === 'error') {
            resolve(event);
          }
        });
      });

      // Simuler l'événement du connecteur TikTok
      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        chatHandler(malformedCommentData);
      }

      const errorEvent = await errorEventPromise;

      expect(errorEvent.type).toBe('error');
      expect(errorEvent.data).toBeDefined();
      expect(errorEvent.correlationId).toBeDefined();
    });

    it('devrait gérer les timeouts de commentaires', async () => {
      // Given: Configuration avec timeout valide
      await connector.initialize('session-123', 'cookies=test', {
        timeout: 5000 // 5 secondes timeout (minimum valide)
      });
      await connector.connect('test-live-id');

      // When: Un commentaire valide est traité (pas de timeout attendu)
      const mockCommentData = {
        commentId: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Hello from TikTok!',
        timestamp: new Date()
      };

      const eventPromise = new Promise<any>((resolve) => {
        connector.onEvent((event) => {
          if (event.type === 'comment') {
            resolve(event);
          }
        });
      });

      // Simuler l'événement du connecteur TikTok
      const chatHandler = mockEventHandlers.get('chat');
      if (chatHandler) {
        chatHandler(mockCommentData);
      }

      const event = await eventPromise;

      // Then: L'événement devrait être traité normalement (pas de timeout)
      expect(event.type).toBe('comment');
      expect(event.data).toBeDefined();
      expect(event.latency).toBeLessThan(5000); // Moins que le timeout
    });
  });
});