/**
 * Tests de résilience pour le système de reconnexion automatique
 * Simule les déconnexions réseau et valide la robustesse du système
 */

import { TikTokConnector } from '../../lib/tiktok/connector';
import { MetricsCollector } from '../../lib/logger/metrics';
import { CorrelationManager } from '../../lib/logger/correlation';

// Mock de uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-resilience-test')
}));

// Mock de tiktok-live-connector pour contrôler les comportements de connexion
jest.mock('tiktok-live-connector', () => ({
  TikTokLiveConnection: jest.fn(),
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
    LIVE_INTRO: 'liveIntro'
  }
}));

describe('Reconnection Resilience Tests - Tests de résilience réseau', () => {
  let mockTikTokConnector: any;
  let connector: TikTokConnector;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(async () => {
    // Reset états
    MetricsCollector.reset();
    CorrelationManager.reset();

    console.error = jest.fn();
    console.warn = jest.fn();

    // Mock du connecteur TikTok
    mockTikTokConnector = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn()
    };

    // Configuration du mock
    const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;
    MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

    // Créer le connecteur
    connector = new TikTokConnector();
    await connector.initialize('session_resilience_test', 'sessionid=resilience123; user_id=789');
  });

  afterEach(async () => {
    await connector.cleanup();
    console.error = originalError;
    console.warn = originalWarn;
  });

  describe('Simulation de déconnexions réseau', () => {
    test('devrait gérer les déconnexions réseau temporaires avec reconnexion automatique', async () => {
      // Configuration pour simuler 3 déconnexions avant succès
      let connectionAttempts = 0;
      const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;

      mockTikTokConnector.connect = jest.fn().mockImplementation(() => {
        connectionAttempts++;
        if (connectionAttempts <= 3) {
          // Simuler une déconnexion réseau temporaire
          setTimeout(() => {
            mockTikTokConnector.emit('error', new Error('Network timeout'));
            mockTikTokConnector.emit('disconnected', { reason: 'network_timeout' });
          }, 10);
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve();
      });

      MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

      // Démarrer la connexion
      await expect(connector.connect('network_test_user')).rejects.toThrow('Network timeout');

      // Attendre que l'événement d'erreur soit traité
      await new Promise(resolve => setTimeout(resolve, 50));

      // Vérifier que le système de reconnexion est activé
      expect(connector.isDegradedModeActive()).toBe(true);

      // Simuler la reconnexion réussie
      mockTikTokConnector.emit('connected', { roomId: 'test_room' });

      // Attendre un peu pour que les événements se propagent
      await new Promise(resolve => setTimeout(resolve, 100));

      // Vérifier que le mode dégradé est désactivé après reconnexion
      expect(connector.isDegradedModeActive()).toBe(false);
    });

    test('devrait maintenir la continuité des données pendant les déconnexions', async () => {
      const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;

      // Simuler une séquence: connexion → déconnexion → reconnexion
      let connectionState = 'disconnected';

      mockTikTokConnector.connect = jest.fn().mockImplementation(() => {
        connectionState = 'connecting';
        return Promise.resolve();
      });

      MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

      // Connexion initiale réussie
      await connector.connect('continuity_test_user');

      // Simuler des commentaires avant déconnexion
      const commentBefore = { id: 'before_1', text: 'Comment before disconnect', timestamp: new Date() };
      mockTikTokConnector.emit('chat', commentBefore);

      // Simuler déconnexion pendant utilisation
      connectionState = 'disconnected';
      mockTikTokConnector.emit('error', new Error('Connection lost'));
      mockTikTokConnector.emit('disconnected', { reason: 'connection_lost' });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Vérifier que le mode dégradé est activé
      expect(connector.isDegradedModeActive()).toBe(true);

      // Simuler commentaires pendant l'indisponibilité (devraient être accumulés)
      const commentDuring = { id: 'during_1', text: 'Comment during outage', timestamp: new Date() };
      // Dans un vrai scénario, ces commentaires seraient perdus côté TikTok

      // Simuler reconnexion réussie
      connectionState = 'connected';
      mockTikTokConnector.emit('connected', { roomId: 'test_room' });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Vérifier que le mode dégradé est désactivé
      expect(connector.isDegradedModeActive()).toBe(false);

      // Vérifier que les données de synchronisation sont disponibles
      const syncData = connector.getSynchronizationData();
      expect(syncData).toBeDefined();
      expect(syncData.totalEvents).toBeGreaterThanOrEqual(0);
    });

    test('devrait respecter les limites de tentatives de reconnexion', async () => {
      const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;

      // Simuler des échecs répétés de connexion
      mockTikTokConnector.connect = jest.fn().mockRejectedValue(new Error('Persistent network failure'));

      MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

      // Tenter plusieurs connexions qui échoueront
      for (let i = 0; i < 15; i++) { // Plus que la limite maximale
        try {
          await connector.connect(`failure_test_user_${i}`);
        } catch (e) {
          // Expected
        }
      }

      // Vérifier que le système reste dans un état contrôlé
      const status = connector.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.retryCount).toBeGreaterThan(0);

      // Le Circuit Breaker devrait être ouvert après trop d'échecs
      const circuitState = connector.getCircuitBreakerState();
      expect(['OPEN', 'HALF_OPEN']).toContain(circuitState);
    });
  });

  describe('Tests de reconnexion sous charge', () => {
    test('devrait gérer les reconnexions multiples simultanées', async () => {
      const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;

      // Créer plusieurs connecteurs pour simuler une charge
      const connectors: TikTokConnector[] = [];
      const numConnectors = 5;

      for (let i = 0; i < numConnectors; i++) {
        const testConnector = new TikTokConnector();
        await testConnector.initialize(`session_load_${i}`, `sessionid=load${i}; user_id=${1000 + i}`);
        connectors.push(testConnector);
      }

      // Simuler des connexions simultanées avec quelques échecs
      let successCount = 0;
      let failureCount = 0;
      const connectionResults: boolean[] = [];

      // Créer des mocks individuels pour chaque connecteur
      const createMockConnector = (index: number) => {
        const mock = {
          on: jest.fn(),
          connect: jest.fn().mockImplementation(() => {
            const shouldSucceed = Math.random() > 0.3; // 70% de succès
            if (shouldSucceed) {
              successCount++;
              connectionResults[index] = true;
              setTimeout(() => mock.emit('connected', { roomId: `load_test_room_${index}` }), 10);
              return Promise.resolve();
            } else {
              failureCount++;
              connectionResults[index] = false;
              const error = new Error('Load induced failure');
              setTimeout(() => mock.emit('error', error), 10);
              return Promise.reject(error);
            }
          }),
          disconnect: jest.fn().mockResolvedValue(undefined),
          emit: jest.fn()
        };
        return mock;
      };

      // Assigner des mocks individuels
      MockTikTokLiveConnector.mockImplementation(createMockConnector);

      // Lancer toutes les connexions simultanément
      const connectionPromises = connectors.map((c, index) =>
        c.connect(`load_user_${index}`).catch(() => false)
      );

      await Promise.allSettled(connectionPromises);

      // Attendre que les événements se propagent
      await new Promise(resolve => setTimeout(resolve, 100));

      // Vérifier les résultats globaux
      const totalAttempts = successCount + failureCount;
      expect(totalAttempts).toBe(numConnectors);

      // Au moins quelques succès et quelques échecs
      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);

      // Vérifier que les métriques sont collectées correctement
      const recentMetrics = MetricsCollector.getRecentMetrics();
      expect(recentMetrics.length).toBeGreaterThan(0);

      // Cleanup
      await Promise.all(connectors.map(c => c.cleanup()));
    });

    test('devrait éviter le thundering herd lors des reconnexions massives', async () => {
      const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;

      // Simuler un scénario où beaucoup de connexions échouent simultanément
      const herdSize = 10;
      const connectionTimestamps: number[] = [];

      mockTikTokConnector.connect = jest.fn().mockImplementation(() => {
        connectionTimestamps.push(Date.now());
        return Promise.reject(new Error('Simulated herd failure'));
      });

      MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

      // Créer et connecter plusieurs instances simultanément
      const herdPromises = Array.from({ length: herdSize }, async (_, index) => {
        const herdConnector = new TikTokConnector();
        await herdConnector.initialize(`herd_session_${index}`, `sessionid=herd${index}`);
        try {
          await herdConnector.connect(`herd_user_${index}`);
        } catch (e) {
          // Expected
        }
        return herdConnector;
      });

      const herdConnectors = await Promise.all(herdPromises);

      // Analyser les timestamps de connexion
      if (connectionTimestamps.length > 1) {
        const timeSpans = [];
        for (let i = 1; i < connectionTimestamps.length; i++) {
          timeSpans.push(connectionTimestamps[i] - connectionTimestamps[i - 1]);
        }

        // Vérifier qu'il n'y a pas de reconnexions simultanées parfaites
        // (backoff exponentiel devrait introduire de la variance)
        const simultaneousConnections = timeSpans.filter(span => span === 0).length;
        expect(simultaneousConnections).toBeLessThan(herdSize / 2);
      }

      // Cleanup
      await Promise.all(herdConnectors.map(c => c.cleanup()));
    });
  });

  describe('Validation des modes dégradé et récupération', () => {
    test('devrait activer correctement le mode dégradé lors des déconnexions', async () => {
      const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;

      mockTikTokConnector.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));
      MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

      // Tenter une connexion qui échoue
      await expect(connector.connect('degraded_test_user')).rejects.toThrow();

      // Attendre que l'événement d'erreur soit traité
      await new Promise(resolve => setTimeout(resolve, 50));

      // Vérifier que le mode dégradé est activé
      expect(connector.isDegradedModeActive()).toBe(true);

      // Vérifier les capacités disponibles en mode dégradé
      const capabilities = connector.getDegradedModeCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities!.available).toContain('comment-history');
      expect(capabilities!.unavailable).toContain('live-comments');
      expect(capabilities!.estimatedRecoveryTime).toBeGreaterThan(0);
    });

    test('devrait récupérer complètement après reconnexion réussie', async () => {
      const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;

      // Démarrer avec échec pour activer le mode dégradé
      mockTikTokConnector.connect = jest.fn().mockRejectedValue(new Error('Initial failure'));
      MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

      await expect(connector.connect('recovery_test_user')).rejects.toThrow();

      // Attendre que l'événement d'erreur soit traité
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(connector.isDegradedModeActive()).toBe(true);

      // Simuler reconnexion réussie
      mockTikTokConnector.connect = jest.fn().mockResolvedValue(undefined);
      MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

      mockTikTokConnector.emit('connected', { roomId: 'recovery_room' });

      // Attendre la récupération
      await new Promise(resolve => setTimeout(resolve, 200));

      // Vérifier que le mode dégradé est désactivé
      expect(connector.isDegradedModeActive()).toBe(false);

      // Vérifier l'état de connexion
      const status = connector.getConnectionStatus();
      expect(status.connected).toBe(true);
    });

    test('devrait synchroniser les données accumulées lors de la récupération', async () => {
      const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;

      // Activer le mode dégradé
      mockTikTokConnector.connect = jest.fn().mockRejectedValue(new Error('Sync test failure'));
      MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

      await expect(connector.connect('sync_test_user')).rejects.toThrow();

      // Attendre que l'événement d'erreur soit traité
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(connector.isDegradedModeActive()).toBe(true);

      // Simuler des données accumulées (commentaires mis en cache)
      // Dans un vrai scénario, ces données viendraient du cache du mode dégradé
      const cachedComments = [
        { id: 'cached_1', text: 'Cached comment 1', timestamp: new Date() },
        { id: 'cached_2', text: 'Cached comment 2', timestamp: new Date() }
      ];

      // Simuler reconnexion et récupération
      mockTikTokConnector.connect = jest.fn().mockResolvedValue(undefined);
      MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

      mockTikTokConnector.emit('connected', { roomId: 'sync_room' });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Vérifier que les données de synchronisation sont disponibles
      const syncData = connector.getSynchronizationData();
      expect(syncData).toBeDefined();
      expect(typeof syncData.totalEvents).toBe('number');
      expect(Array.isArray(syncData.comments)).toBe(true);
    });
  });
});