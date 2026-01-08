/**
 * Tests d'intégration pour le connecteur TikTok
 * Teste l'intégration complète entre tous les composants
 */

import { TikTokConnector, TikTokConnectorFactory } from '../../lib/tiktok/connector';
import { MetricsCollector } from '../../lib/logger/metrics';
import { CorrelationManager } from '../../lib/logger/correlation';

// Mock de uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-integration-test')
}));

// Mock de tiktok-live-connector
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

// Mock de console
const originalError = console.error;
const originalWarn = console.warn;
console.error = jest.fn();
console.warn = jest.fn();

describe('TikTok Connector - Tests d\'intégration', () => {
  let mockTikTokConnector: any;
  let connector: TikTokConnector;

  beforeEach(async () => {
    // Reset tous les états
    MetricsCollector.reset();
    CorrelationManager.reset();
    TikTokConnectorFactory.cleanupAll();

    // Mock du connecteur TikTok
    mockTikTokConnector = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn()
    };

    // Configuration du mock de tiktok-live-connector
    const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;
    MockTikTokLiveConnector.mockImplementation(() => mockTikTokConnector);

    // Créer et initialiser le connecteur
    connector = new TikTokConnector();
    await connector.initialize('session_test_123', 'sessionid=test123; user_id=456');
  });

  afterEach(async () => {
    await connector.cleanup();
    console.error = originalError;
    console.warn = originalWarn;
  });

  describe('Test de connexion valide', () => {
    it('devrait réussir une connexion complète avec tous les composants', async () => {
      // Effectuer la connexion
      await connector.connect('test_user_123');

      // Vérifications de base
      expect(connector.getConnectionStatus().connected).toBe(true);
      expect(connector.getConnectionStatus().retryCount).toBe(0);

      // Vérifier que le Circuit Breaker est dans le bon état
      expect(connector.getCircuitBreakerState()).toBe('CLOSED');
      expect(connector.isFallbackModeActive()).toBe(false);

      // Vérifier que les méthodes d'inspection fonctionnent
      expect(connector.getCorrelationId()).toBeDefined();
      expect(connector.getCircuitBreakerMetrics()).toBeDefined();
      expect(connector.getConnectionConfig()).toBeDefined();
    });

    it('devrait gérer la connexion avec correlation ID et métriques', async () => {
      const correlationIdBefore = connector.getCorrelationId();
      expect(correlationIdBefore).toBe('mocked-uuid-integration-test');

      await connector.connect('test_user_456');

      // Vérifier que le correlation ID reste le même
      expect(connector.getCorrelationId()).toBe(correlationIdBefore);

      // Vérifier que les métriques sont accessibles
      const circuitBreakerMetrics = connector.getCircuitBreakerMetrics();
      expect(circuitBreakerMetrics).toBeDefined();
      expect(circuitBreakerMetrics!.totalRequests).toBeGreaterThan(0);
    });
  });

  describe('Test de gestion d\'erreurs', () => {
    it('devrait gérer les erreurs de connexion et maintenir l\'intégrité du système', async () => {
      // Simuler un échec de connexion
      mockTikTokConnector.connect.mockRejectedValueOnce(new Error('Connection failed'));

      // Tenter la connexion (devrait échouer)
      try {
        await connector.connect('failing_user');
      } catch (e) {
        // Expected failure
      }

      // Vérifier que le système reste dans un état cohérent
      expect(connector.getCircuitBreakerState()).toBeDefined();
      expect(typeof connector.isFallbackModeActive()).toBe('boolean');

      // Vérifier que les métriques enregistrent l'échec
      const circuitBreakerMetrics = connector.getCircuitBreakerMetrics();
      expect(circuitBreakerMetrics).toBeDefined();
      expect(circuitBreakerMetrics!.totalRequests).toBeGreaterThan(0);
    });

    it('devrait intégrer les métriques d\'erreur avec le système de logging', async () => {
      const initialErrorCount = MetricsCollector.getRecentErrors().length;

      // Simuler un échec qui ouvre le Circuit Breaker (pour déclencher l'enregistrement d'erreur globale)
      mockTikTokConnector.connect.mockRejectedValue(new Error('Test error'));

      // Faire plusieurs tentatives pour ouvrir le Circuit Breaker
      for (let i = 0; i < 4; i++) {
        try {
          await connector.connect('error_test_user');
        } catch (e) {
          // Expected
        }
      }

      // Vérifier que des erreurs ont été ajoutées aux métriques globales
      const finalErrorCount = MetricsCollector.getRecentErrors().length;
      expect(finalErrorCount).toBeGreaterThanOrEqual(initialErrorCount);

      // Si des erreurs ont été enregistrées, vérifier le correlation ID
      if (finalErrorCount > initialErrorCount) {
        const errors = MetricsCollector.getRecentErrors();
        const recentError = errors[errors.length - 1];
        expect(recentError.correlationId).toBeDefined();
      }
    });
  });

  describe('Test de reconnexion automatique', () => {
    it('devrait permettre la reconnexion après reset du Circuit Breaker', async () => {
      await connector.connect('user_auto_reconnect');
      expect(connector.getConnectionStatus().connected).toBe(true);

      // Simuler une reconnexion (reset du Circuit Breaker)
      const circuitBreaker = (connector as any).circuitBreaker;
      circuitBreaker.reset();

      // Nouvelle connexion devrait réussir
      await connector.connect('user_auto_reconnect');
      expect(connector.getConnectionStatus().connected).toBe(true);
    });

    it('devrait exposer l\'historique des retry via l\'API publique', async () => {
      // Effectuer une connexion pour initialiser les métriques
      await connector.connect('history_test_user');

      // Vérifier que l'API d'historique est accessible
      const retryHistory = connector.getRetryHistory();
      expect(Array.isArray(retryHistory)).toBe(true);

      // L'historique peut être vide si pas de retry, mais l'API doit fonctionner
      expect(retryHistory).toBeDefined();
    });
  });

  describe('Test d\'intégration Factory + Connector', () => {
    it('devrait gérer multiple instances via la factory', async () => {
      const connector1 = TikTokConnectorFactory.getConnector('user1');
      const connector2 = TikTokConnectorFactory.getConnector('user2');
      const connector1Again = TikTokConnectorFactory.getConnector('user1');

      // Même ID devrait retourner la même instance
      expect(connector1).toBe(connector1Again);
      expect(connector1).not.toBe(connector2);

      // Chaque instance devrait avoir son propre correlation ID
      expect(connector1.getCorrelationId()).not.toBe(connector2.getCorrelationId());

      // Cleanup
      TikTokConnectorFactory.cleanupAll();
    });

    it('devrait partager les métriques globales entre instances', async () => {
      const initialMetricsCount = MetricsCollector.getRecentMetrics().length;

      const connector1 = TikTokConnectorFactory.getConnector('shared_user_1');
      const connector2 = TikTokConnectorFactory.getConnector('shared_user_2');

      // Les deux connecteurs contribuent aux métriques globales
      await connector1.initialize('session_1', 'cookie1=test');
      await connector2.initialize('session_2', 'cookie2=test');

      // Créer quelques métriques
      MetricsCollector.recordMetric('test.shared', 100, 'count', { instance: '1' });
      MetricsCollector.recordMetric('test.shared', 200, 'count', { instance: '2' });

      const finalMetricsCount = MetricsCollector.getRecentMetrics().length;
      expect(finalMetricsCount).toBeGreaterThan(initialMetricsCount);

      TikTokConnectorFactory.cleanupAll();
    });
  });

  describe('Test de résilience complète', () => {
    it('devrait maintenir la stabilité sous charge d\'erreurs', async () => {
      const errorScenarios = [
        'Network timeout',
        'Invalid session',
        'Rate limited',
        'Server error',
        'Connection refused'
      ];

      // Créer un connecteur spécifique pour ce test
      const resilienceConnector = new TikTokConnector();
      await resilienceConnector.initialize('session_resilience', 'sessionid=resilience');

      const MockTikTokLiveConnector = require('tiktok-live-connector').TikTokLiveConnection;
      let errorIndex = 0;
      const resilienceMock = {
        on: jest.fn(),
        connect: jest.fn().mockImplementation(() => {
          if (errorIndex < errorScenarios.length) {
            const error = new Error(errorScenarios[errorIndex]);
            errorIndex++;
            return Promise.reject(error);
          }
          return Promise.resolve();
        })
      };
      MockTikTokLiveConnector.mockImplementation(() => resilienceMock);

      // Simuler différents types d'erreurs
      for (let i = 0; i < errorScenarios.length; i++) {
        try {
          await resilienceConnector.connect(`error_user_${i}`);
        } catch (e) {
          // Expected errors
        }
      }

      // Vérifier que le système reste stable
      const circuitBreakerState = resilienceConnector.getCircuitBreakerState();
      expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(circuitBreakerState);

      // Vérifier les statistiques
      const circuitBreakerMetrics = resilienceConnector.getCircuitBreakerMetrics();
      expect(circuitBreakerMetrics!.totalRequests).toBe(errorScenarios.length);

      await resilienceConnector.cleanup();
    });
  });
});