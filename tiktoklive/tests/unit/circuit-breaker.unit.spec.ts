import { TikTokCircuitBreaker, CircuitBreakerState } from '../../lib/tiktok/circuit-breaker';

describe('TikTokCircuitBreaker', () => {
  let circuitBreaker: TikTokCircuitBreaker;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    };
    circuitBreaker = new TikTokCircuitBreaker(mockConfig);
  });

  describe('[P1] Circuit Breaker State Management', () => {
    test('should initialize in CLOSED state', () => {
      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.metrics.totalRequests).toBe(0);
      expect(status.metrics.successfulRequests).toBe(0);
      expect(status.metrics.failedRequests).toBe(0);
    });

    test('should transition to OPEN after consecutive failures', async () => {
      // Simulate consecutive failures
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(() => Promise.reject(new Error('Connection failed')));
      }

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.OPEN);
      expect(status.metrics.failedRequests).toBe(5);
      expect(status.metrics.consecutiveFailures).toBe(5);
    });

    test('should transition to HALF_OPEN after timeout period', async () => {
      // First fail multiple times to open circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(() => Promise.reject(new Error('Connection failed')));
      }

      // Mock the shouldAttemptReset to return true
      jest.spyOn(circuitBreaker as any, 'shouldAttemptReset').mockReturnValue(true);

      // Next request should transition to HALF_OPEN
      const promise = circuitBreaker.execute(() => Promise.reject(new Error('Still failing')));

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.HALF_OPEN);

      await promise; // Let the rejection complete
    });

    test('should reset to CLOSED after successful request in HALF_OPEN', async () => {
      // Get to HALF_OPEN state
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(() => Promise.reject(new Error('Connection failed')));
      }
      jest.spyOn(circuitBreaker as any, 'shouldAttemptReset').mockReturnValue(true);
      await circuitBreaker.execute(() => Promise.reject(new Error('Still failing')));

      // Now succeed in HALF_OPEN state
      await circuitBreaker.execute(() => Promise.resolve('Success'));

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.metrics.successfulRequests).toBe(1);
      expect(status.metrics.consecutiveFailures).toBe(0);
    });
  });

  describe('[P1] Retry Logic', () => {
    test('should retry failed operations up to retry limit', async () => {
      let attemptCount = 0;
      const failingOperation = jest.fn(() => {
        attemptCount++;
        return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
      });

      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();

      expect(attemptCount).toBe(mockConfig.retryAttempts + 1); // Initial + retries
      expect(failingOperation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    test('should succeed on retry after initial failure', async () => {
      let attemptCount = 0;
      const intermittentOperation = jest.fn(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
        }
        return Promise.resolve('Success on attempt 3');
      });

      const result = await circuitBreaker.execute(intermittentOperation);

      expect(result).toBe('Success on attempt 3');
      expect(attemptCount).toBe(3);
      expect(intermittentOperation).toHaveBeenCalledTimes(3);
    });

    test('should respect retry delay between attempts', async () => {
      const startTime = Date.now();
      let attemptCount = 0;

      const delayedFailingOperation = jest.fn(() => {
        attemptCount++;
        return Promise.reject(new Error(`Attempt ${attemptCount}`));
      });

      await expect(circuitBreaker.execute(delayedFailingOperation)).rejects.toThrow();

      const elapsedTime = Date.now() - startTime;
      // Should take at least (retryAttempts * retryDelay) milliseconds
      expect(elapsedTime).toBeGreaterThanOrEqual(mockConfig.retryAttempts * mockConfig.retryDelay);
    });
  });

  describe('[P1] Fallback Mode', () => {
    test('should activate fallback mode when circuit is OPEN', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(() => Promise.reject(new Error('Connection failed')));
      }

      // Next request should trigger fallback
      const result = await circuitBreaker.execute(() => Promise.reject(new Error('Should fallback')));

      expect(result).toBeDefined();
      // Verify fallback response structure
      expect(typeof result).toBe('object');
      expect(result.fallback).toBe(true);
      expect(result.message).toContain('degraded');
    });

    test('should track fallback mode usage in metrics', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(() => Promise.reject(new Error('Connection failed')));
      }

      // Trigger fallback
      await circuitBreaker.execute(() => Promise.reject(new Error('Fallback test')));

      const status = circuitBreaker.getStatus();
      expect(status.metrics.fallbackActivations).toBeGreaterThan(0);
    });
  });

  describe('[P2] Metrics Collection', () => {
    test('should track successful operations', async () => {
      await circuitBreaker.execute(() => Promise.resolve('Success 1'));
      await circuitBreaker.execute(() => Promise.resolve('Success 2'));

      const status = circuitBreaker.getStatus();
      expect(status.metrics.totalRequests).toBe(2);
      expect(status.metrics.successfulRequests).toBe(2);
      expect(status.metrics.failedRequests).toBe(0);
      expect(status.metrics.consecutiveFailures).toBe(0);
    });

    test('should track failed operations and consecutive failures', async () => {
      await circuitBreaker.execute(() => Promise.reject(new Error('Fail 1')));
      await circuitBreaker.execute(() => Promise.resolve('Success'));
      await circuitBreaker.execute(() => Promise.reject(new Error('Fail 2')));
      await circuitBreaker.execute(() => Promise.reject(new Error('Fail 3')));

      const status = circuitBreaker.getStatus();
      expect(status.metrics.totalRequests).toBe(4);
      expect(status.metrics.successfulRequests).toBe(1);
      expect(status.metrics.failedRequests).toBe(3);
      expect(status.metrics.consecutiveFailures).toBe(2);
    });

    test('should reset consecutive failures after success', async () => {
      await circuitBreaker.execute(() => Promise.reject(new Error('Fail 1')));
      await circuitBreaker.execute(() => Promise.reject(new Error('Fail 2')));
      await circuitBreaker.execute(() => Promise.resolve('Success'));
      await circuitBreaker.execute(() => Promise.reject(new Error('Fail 3')));

      const status = circuitBreaker.getStatus();
      expect(status.metrics.consecutiveFailures).toBe(1); // Reset after success
    });

    test('should record timestamps for state changes', async () => {
      const initialStatus = circuitBreaker.getStatus();
      expect(initialStatus.stateChangedAt).toBeDefined();

      // Trigger state change to OPEN
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(() => Promise.reject(new Error('Connection failed')));
      }

      const openStatus = circuitBreaker.getStatus();
      expect(openStatus.state).toBe(CircuitBreakerState.OPEN);
      expect(openStatus.stateChangedAt).toBeDefined();
      expect(openStatus.stateChangedAt.getTime()).toBeGreaterThanOrEqual(initialStatus.stateChangedAt.getTime());
    });
  });

  describe('[P2] Error Handling', () => {
    test('should handle timeout errors appropriately', async () => {
      const timeoutError = new Error('Operation timed out');
      timeoutError.name = 'TimeoutError';

      await expect(circuitBreaker.execute(() => Promise.reject(timeoutError))).rejects.toThrow('Operation timed out');

      const status = circuitBreaker.getStatus();
      expect(status.metrics.failedRequests).toBe(1);
    });

    test('should handle network errors as failures', async () => {
      const networkError = new Error('Network connection failed');
      networkError.name = 'NetworkError';

      await expect(circuitBreaker.execute(() => Promise.reject(networkError))).rejects.toThrow();

      const status = circuitBreaker.getStatus();
      expect(status.metrics.failedRequests).toBe(1);
      expect(status.metrics.lastFailureTime).toBeDefined();
    });

    test('should preserve original error messages', async () => {
      const originalError = new Error('Specific TikTok API error: Invalid session');

      await expect(circuitBreaker.execute(() => Promise.reject(originalError))).rejects.toThrow('Specific TikTok API error: Invalid session');

      const status = circuitBreaker.getStatus();
      expect(status.lastError).toBeDefined();
    });
  });
});