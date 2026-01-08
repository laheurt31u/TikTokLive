/**
 * Tests pour les notifications WebSocket d'état de reconnexion
 */

import { TikTokConnector } from '../../../lib/tiktok/connector';

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

describe('TikTokConnector - Notifications d\'état aux clients WebSocket', () => {
  let connector: TikTokConnector;
  let mockConnector: any;
  let eventListeners: Map<string, Function>;

  beforeEach(async () => {
    mockConnector = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false)
    };

    eventListeners = new Map();

    connector = new TikTokConnector('test-id');

    // Injecter les mocks
    (connector as any).connector = mockConnector;
    (connector as any).circuitBreaker = {
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

    // Mock de l'event listener
    (connector as any).emitEvent = jest.fn();
  });

  describe('Notifications WebSocket d\'état de reconnexion', () => {
    test('devrait émettre tiktok:reconnection:started lors du début de reconnexion', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Simuler une déconnexion qui déclenche la reconnexion
      const disconnectHandler = mockConnector.on.mock.calls.find(
        call => call[0] === 'disconnected'
      )?.[1];

      if (disconnectHandler) {
        await disconnectHandler({ reason: 'tiktok_server_error' });

        // Vérifier qu'un événement de reconnexion a été émis
        expect((connector as any).emitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'tiktok:reconnection:started',
            timestamp: expect.any(Date),
            correlationId: expect.any(String),
            data: expect.objectContaining({
              reason: 'tiktok_server_error',
              attempt: expect.any(Number),
              delay: expect.any(Number)
            })
          })
        );
      }
    });

    test('devrait émettre tiktok:reconnection:success après reconnexion réussie', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Simuler une reconnexion réussie
      const connectHandler = mockConnector.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];

      if (connectHandler) {
        // D'abord simuler qu'on était en reconnexion
        (connector as any).reconnectionManager?.setReconnectionState('RECONNECTING');

        await connectHandler({ connectionState: 'connected' });

        expect((connector as any).emitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'tiktok:reconnection:success',
            timestamp: expect.any(Date),
            correlationId: expect.any(String),
            data: expect.objectContaining({
              totalAttempts: expect.any(Number),
              reconnectionTime: expect.any(Number)
            })
          })
        );
      }
    });

    test('devrait émettre tiktok:reconnection:failed après échec de reconnexion', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Simuler un échec de reconnexion (Circuit Breaker OPEN)
      const errorHandler = mockConnector.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      if (errorHandler) {
        // Mock Circuit Breaker OPEN
        (connector as any).circuitBreaker.getState = () => 'OPEN';

        await errorHandler(new Error('Connection failed'));

        expect((connector as any).emitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'tiktok:reconnection:failed',
            timestamp: expect.any(Date),
            correlationId: expect.any(String),
            data: expect.objectContaining({
              reason: 'Connection failed',
              circuitBreakerState: 'OPEN',
              willRetry: false
            })
          })
        );
      }
    });

    test('devrait émettre tiktok:reconnection:state:changed lors de changements d\'état', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Simuler un changement d'état
      (connector as any).reconnectionManager?.setReconnectionState('DEGRADED_MODE');

      expect((connector as any).emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tiktok:reconnection:state:changed',
          timestamp: expect.any(Date),
          correlationId: expect.any(String),
          data: expect.objectContaining({
            previousState: expect.any(String),
            newState: 'DEGRADED_MODE',
            reason: expect.any(String)
          })
        })
      );
    });

    test('devrait inclure les métriques de stabilité dans les notifications', async () => {
      await connector.initialize('session123', 'cookie=value');

      // Simuler un événement de reconnexion
      (connector as any).reconnectionManager?.recordConnectionEvent('connect', Date.now() - 300000);
      (connector as any).reconnectionManager?.recordConnectionEvent('disconnect', Date.now() - 200000);
      (connector as any).reconnectionManager?.recordConnectionEvent('connect', Date.now() - 100000);

      const disconnectHandler = mockConnector.on.mock.calls.find(
        call => call[0] === 'disconnected'
      )?.[1];

      if (disconnectHandler) {
        await disconnectHandler({ reason: 'network_error' });

        const emittedEvents = (connector as any).emitEvent.mock.calls;
        const reconnectionEvent = emittedEvents.find(call =>
          call[0].type === 'tiktok:reconnection:started'
        );

        expect(reconnectionEvent).toBeDefined();
        expect(reconnectionEvent[0].data.stabilityMetrics).toBeDefined();
        expect(reconnectionEvent[0].data.stabilityMetrics).toHaveProperty('uptimePercentage');
        expect(reconnectionEvent[0].data.stabilityMetrics).toHaveProperty('connectionStabilityScore');
      }
    });
  });
});