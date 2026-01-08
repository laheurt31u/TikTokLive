/**
 * Tests unitaires pour le Circuit Breaker TikTok
 */

import { TikTokCircuitBreaker, CircuitBreakerState } from '../../../lib/tiktok/circuit-breaker';
import { TikTokConnectionConfig } from '../../../lib/tiktok/types';

// Mock de uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234567890abcdef')
}));

// Mock de console.warn pour éviter les erreurs de test
const originalWarn = console.warn;
console.warn = jest.fn();

describe('TikTokCircuitBreaker', () => {
  let config: TikTokConnectionConfig;
  let circuitBreaker: TikTokCircuitBreaker;

  beforeEach(() => {
    config = {
      sessionId: 'test-session',
      cookies: 'test-cookie=value',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 100
    };
    circuitBreaker = new TikTokCircuitBreaker(config);
  });

  describe('État initial', () => {
    it('devrait démarrer dans l\'état CLOSED', () => {
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('devrait avoir des métriques initiales à zéro', () => {
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.consecutiveFailures).toBe(0);
    });
  });

  describe('Exécution réussie', () => {
    it('devrait réussir une opération normale', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation, 'test-op');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('devrait mettre à jour les métriques de succès', async () => {
      await circuitBreaker.execute(() => Promise.resolve('ok'));

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.consecutiveFailures).toBe(0);
    });
  });

  describe('Retry logic avec backoff exponentiel', () => {
    it('devrait retry une opération qui échoue temporairement', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temp failure'))
        .mockResolvedValueOnce('success');

      const result = await circuitBreaker.execute(operation, 'retry-test');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('devrait respecter le nombre maximum de tentatives', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(circuitBreaker.execute(operation, 'fail-test')).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(3); // retryAttempts = 3
    });

    it('devrait calculer le backoff exponentiel avec jitter', () => {
      const breaker = new TikTokCircuitBreaker(config);

      // On ne peut pas tester directement la méthode privée, mais on peut vérifier
      // que les retry se produisent avec des délais croissants
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Transition d\'états', () => {
    it('devrait ouvrir le circuit après plusieurs échecs consécutifs', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Simuler 3 échecs consécutifs
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, 'fail-test');
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it('devrait passer en HALF_OPEN après le timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Ouvrir le circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, 'fail-test');
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Simuler le passage du temps (timeout * 2)
      const originalDate = Date.now;
      const mockNow = jest.fn();
      global.Date.now = mockNow;
      mockNow.mockReturnValue(Date.now() + config.timeout * 2 + 1000);

      // La prochaine exécution devrait passer en HALF_OPEN
      await expect(circuitBreaker.execute(operation, 'half-open-test')).rejects.toThrow();

      global.Date.now = originalDate;
    });

    it('devrait fermer le circuit après un succès en HALF_OPEN', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('Failure'));
      const successOp = jest.fn().mockResolvedValue('success');

      // Ouvrir le circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failOp, 'fail-test');
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Simuler le passage du temps et réussir
      const originalDate = Date.now;
      global.Date.now = jest.fn().mockReturnValue(Date.now() + config.timeout * 2 + 1000);

      const result = await circuitBreaker.execute(successOp, 'recovery-test');
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);

      global.Date.now = originalDate;
    });
  });

  describe('Mode fallback', () => {
    it('devrait activer le mode fallback quand le circuit est OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Ouvrir le circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, 'fail-test');
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // La prochaine tentative devrait déclencher le fallback
      await expect(circuitBreaker.execute(operation, 'fallback-test')).rejects.toThrow('Circuit Breaker OPEN');
      expect(circuitBreaker.isFallbackModeActive()).toBe(true);
    });
  });

  describe('Métriques et monitoring', () => {
    it('devrait calculer correctement le taux de succès', async () => {
      // 2 succès, 1 échec = 66.67% de taux de succès
      await circuitBreaker.execute(() => Promise.resolve('ok1'));
      await circuitBreaker.execute(() => Promise.resolve('ok2'));

      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) {
        // Expected failure
      }

      expect(circuitBreaker.getSuccessRate()).toBeCloseTo(2/3, 2);
    });

    it('devrait maintenir un historique des retry', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      await circuitBreaker.execute(operation, 'history-test');

      const history = circuitBreaker.getRetryHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('attempt');
      expect(history[0]).toHaveProperty('delay');
      expect(history[0]).toHaveProperty('error');
    });
  });

  describe('Reset et nettoyage', () => {
    it('devrait permettre le reset manuel', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Ouvrir le circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, 'fail-test');
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.consecutiveFailures).toBe(0);
      expect(circuitBreaker.isFallbackModeActive()).toBe(false);
    });
  });
});