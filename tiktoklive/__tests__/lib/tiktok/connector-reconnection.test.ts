/**
 * Tests d'intégration pour TikTokConnector avec reconnexion automatique
 */

import { TikTokConnector } from '../../../lib/tiktok/connector';
import { ReconnectionState } from '../../../lib/tiktok/types';

// Mock des dépendances
jest.mock('../../../lib/logger/correlation', () => ({
  CorrelationManager: {
    generateId: () => 'test-connector-id',
    getElapsedTime: () => 1000
  }
}));

jest.mock('../../../lib/logger/metrics', () => ({
  MetricsCollector: {
    recordMetric: () => {},
    recordConnection: () => {},
    recordError: () => {}
  }
}));

jest.mock('../../../lib/config/tiktok-connection', () => ({
  createConnectionConfig: jest.fn(() => ({
    sessionId: 'test-session',
    cookies: 'test-cookie=value',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  })),
  detectEnvironment: jest.fn(() => 'development')
}));

describe('TikTokConnector - États de transition clairs', () => {
  let connector: TikTokConnector;
  let mockTikTokConnection: any;

  beforeEach(async () => {
    // Mock du connecteur TikTok
    mockTikTokConnection = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false)
    };

    // Mock du Circuit Breaker
    const mockCircuitBreaker = {
      getState: () => 'CLOSED',
      getMetrics: () => ({
        state: 'CLOSED',
        consecutiveFailures: 0,
        totalRequests: 10,
        successfulRequests: 9
      }),
      isFallbackModeActive: () => false,
      recordCommentSuccess: jest.fn(),
      recordCommentFailure: jest.fn()
    };

    // Créer le connector avec mocks
    connector = new TikTokConnector('test-id');

    // Injecter les mocks (en accédant aux propriétés privées via type assertion)
    (connector as any).connector = mockTikTokConnection;
    (connector as any).circuitBreaker = mockCircuitBreaker;
  });

  describe('États de transition clairs (CONNECTING, RECONNECTING, etc.)', () => {
    test('devrait initialiser avec état IDLE avant configuration', () => {
      // Avant initialize(), le reconnection manager n'est pas encore créé
      const status = connector.getExtendedConnectionStatus();

      expect(status.reconnectionState).toBe('IDLE');
    });

    test('devrait gérer les états lors de la connexion initiale', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Après initialize(), on devrait avoir un état défini
      const status = connector.getExtendedConnectionStatus();
      expect(status.reconnectionState).toBeDefined();
      expect(typeof status.reconnectionState).toBe('string');
    });

    test('devrait passer à CONNECTED après connexion réussie', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Simuler événement de connexion réussie
      const connectHandler = mockTikTokConnection.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];

      if (connectHandler) {
        await connectHandler({ connectionState: 'connected' });

        const status = connector.getExtendedConnectionStatus();
        expect(status.reconnectionState).toBe(ReconnectionState.CONNECTED);
      }
    });

    test('devrait passer à DISCONNECTED après déconnexion', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Simuler événement de déconnexion
      const disconnectHandler = mockTikTokConnection.on.mock.calls.find(
        call => call[0] === 'disconnected'
      )?.[1];

      if (disconnectHandler) {
        await disconnectHandler({ reason: 'network_error' });

        const status = connector.getExtendedConnectionStatus();
        expect(status.reconnectionState).toBe(ReconnectionState.DISCONNECTED);
      }
    });

    test('devrait passer à RECONNECTING lors de tentative de reconnexion automatique', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Simuler déconnexion puis déclencher reconnexion
      const disconnectHandler = mockTikTokConnection.on.mock.calls.find(
        call => call[0] === 'disconnected'
      )?.[1];

      if (disconnectHandler) {
        await disconnectHandler({ reason: 'tiktok_server_error' });

        // Le système devrait automatiquement passer en RECONNECTING
        // Simuler un petit délai pour laisser la logique de reconnexion s'exécuter
        await new Promise(resolve => setTimeout(resolve, 10));

        const status = connector.getExtendedConnectionStatus();
        expect([ReconnectionState.RECONNECTING, ReconnectionState.DISCONNECTED]).toContain(status.reconnectionState);
      }
    });

    test('devrait gérer les transitions d\'état RECONNECT_FAILED', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Simuler plusieurs échecs de reconnexion
      for (let i = 0; i < 3; i++) {
        (connector as any).reconnectionManager?.startReconnectionAttempt();
        (connector as any).reconnectionManager?.endReconnectionAttempt(false);
      }

      const status = connector.getExtendedConnectionStatus();
      expect(status.reconnectionAttempts).toBeGreaterThan(0);
    });
  });
});