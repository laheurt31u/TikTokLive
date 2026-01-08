/**
 * Tests pour le logging détaillé des tentatives de reconnexion
 */

import { ReconnectionManager } from '../../../lib/tiktok/reconnection-manager';

// Mock des dépendances
jest.mock('../../../lib/logger/correlation', () => ({
  CorrelationManager: {
    generateId: () => 'test-correlation-id',
    getElapsedTime: () => 1000
  }
}));

jest.mock('../../../lib/logger/metrics', () => ({
  MetricsCollector: {
    recordMetric: jest.fn(),
    recordConnection: jest.fn(),
    recordError: jest.fn()
  }
}));

describe('ReconnectionManager - Logging détaillé des tentatives de reconnexion', () => {
  let reconnectionManager: ReconnectionManager;
  let mockConnector: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockConnector = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false),
      getConnectionStatus: jest.fn()
    };

    reconnectionManager = new ReconnectionManager(mockConnector);

    // Spy sur console pour vérifier les logs
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Correlation IDs pour tracer les cycles de reconnexion', () => {
    test('devrait logger le début de chaque cycle de reconnexion avec correlation ID', () => {
      reconnectionManager.startReconnectionAttempt('test_reason');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RECONNECTION] STARTED')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-correlation-id')
      );
    });

    test('devrait logger les détails de classification des erreurs', () => {
      const classification = reconnectionManager.classifyDisconnectReason('Connection closed by TikTok');

      // Vérifier que la classification est correcte
      expect(classification.type).toBe('tiktok');
      expect(classification.requiresReconnection).toBe(true);

      // Simuler une reconnexion qui utiliserait cette classification
      reconnectionManager.startReconnectionAttempt(classification.description);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection closed by TikTok')
      );
    });

    test('devrait tracer les tentatives successives avec numéro de tentative', () => {
      // Première tentative
      reconnectionManager.startReconnectionAttempt('first_attempt');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt: 1')
      );

      // Seconde tentative
      reconnectionManager.startReconnectionAttempt('second_attempt');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt: 2')
      );
    });
  });

  describe('Logging des métriques SLOs pour taux de succès de reconnexion', () => {
    test('devrait logger les métriques de succès/échec', () => {
      // Simuler plusieurs cycles
      reconnectionManager.startReconnectionAttempt('attempt_1');
      reconnectionManager.endReconnectionAttempt(true);

      reconnectionManager.startReconnectionAttempt('attempt_2');
      reconnectionManager.endReconnectionAttempt(false);

      reconnectionManager.startReconnectionAttempt('attempt_3');
      reconnectionManager.endReconnectionAttempt(true);

      // Vérifier que les succès et échecs sont loggés
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SUCCESS')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('FAILED')
      );
    });

    test('devrait calculer et logger le taux de succès de reconnexion', () => {
      // Simuler des reconnexions
      reconnectionManager.startReconnectionAttempt('test_1');
      reconnectionManager.endReconnectionAttempt(true);

      reconnectionManager.startReconnectionAttempt('test_2');
      reconnectionManager.endReconnectionAttempt(true);

      reconnectionManager.startReconnectionAttempt('test_3');
      reconnectionManager.endReconnectionAttempt(false);

      const metrics = reconnectionManager.getConnectionStabilityMetrics();

      // Vérifier que les métriques sont calculées correctement
      expect(metrics.successfulReconnections).toBe(2);
      expect(metrics.failedReconnections).toBe(1);
      expect(metrics.totalReconnections).toBe(3);
    });

    test('devrait logger les alertes sur échecs répétés', () => {
      // Simuler des échecs répétés
      for (let i = 0; i < 5; i++) {
        reconnectionManager.startReconnectionAttempt(`attempt_${i}`);
        reconnectionManager.endReconnectionAttempt(false);
      }

      // Vérifier que l'alerte a été loggée (console.error)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('5 consecutive reconnection failures')
      );
    });
  });

  describe('Logging des timings de reconnexion', () => {
    test('devrait mesurer et logger la durée des tentatives de reconnexion', () => {
      reconnectionManager.startReconnectionAttempt('timed_attempt');

      // Simuler un délai en modifiant directement le timestamp de début
      (reconnectionManager as any).currentReconnectionStart = Date.now() - 150; // 150ms ago

      reconnectionManager.endReconnectionAttempt(true);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('duration:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SUCCESS')
      );
    });

    test('devrait logger les statistiques de performance de reconnexion', () => {
      // Simuler plusieurs reconnexions avec différents timings
      reconnectionManager.startReconnectionAttempt('fast_reconnect');
      (reconnectionManager as any).currentReconnectionStart = Date.now() - 50;
      reconnectionManager.endReconnectionAttempt(true);

      reconnectionManager.startReconnectionAttempt('slow_reconnect');
      (reconnectionManager as any).currentReconnectionStart = Date.now() - 200;
      reconnectionManager.endReconnectionAttempt(true);

      const metrics = reconnectionManager.getConnectionStabilityMetrics();

      expect(metrics.averageReconnectionTime).toBeGreaterThan(0);
      expect(metrics.averageReconnectionTime).toBe(125); // (50 + 200) / 2
    });
  });
});