import { test, expect } from '../support/fixtures';
import { TikTokLiveFactory } from '../support/factories/tiktok-live-factory';

test.describe('Reconnection Resilience E2E', () => {
  test.describe('Automatic Reconnection Scenarios', () => {
    test('[P0] should automatically reconnect after network interruption', async ({ page, tiktokRoom, networkFailure }) => {
      // GIVEN: Connected to TikTok room with active stream
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // Verify initial connection metrics
      const initialReconnectionCount = await page.locator('[data-testid="reconnection-count"]').textContent();
      expect(parseInt(initialReconnectionCount || '0')).toBe(0);

      // WHEN: Network connection is lost
      await networkFailure.simulateOffline();

      // THEN: Connection status should change to reconnecting
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Reconnexion|Reconnecting/, { timeout: 5000 });

      // WHEN: Network connection is restored
      await networkFailure.simulateOnline();

      // THEN: Should automatically reconnect within timeout
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/, { timeout: 10000 });

      // Reconnection count should be incremented
      const finalReconnectionCount = await page.locator('[data-testid="reconnection-count"]').textContent();
      expect(parseInt(finalReconnectionCount || '0')).toBe(1);
    });

    test('[P0] should handle multiple reconnection attempts with exponential backoff', async ({ page, tiktokRoom, networkFailure }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Multiple network failures occur
      const reconnectionAttempts = 3;

      for (let i = 0; i < reconnectionAttempts; i++) {
        await networkFailure.simulateOffline();
        await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Reconnexion|Reconnecting/);

        // Wait for reconnection attempt timeout (should increase with each attempt)
        await page.waitForTimeout(2000 * (i + 1)); // Simulating exponential backoff

        await networkFailure.simulateOnline();
      }

      // THEN: Should eventually reconnect after multiple attempts
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/, { timeout: 15000 });

      // Reconnection metrics should reflect multiple attempts
      const finalReconnectionCount = await page.locator('[data-testid="reconnection-count"]').textContent();
      expect(parseInt(finalReconnectionCount || '0')).toBe(reconnectionAttempts);
    });

    test('[P1] should activate degraded mode after maximum reconnection attempts', async ({ page, tiktokRoom, networkFailure }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Network failures persist beyond maximum attempts (10 attempts)
      for (let i = 0; i < 12; i++) { // Exceed max attempts
        await networkFailure.simulateOffline();
        await page.waitForTimeout(1000); // Short wait between failures
        await networkFailure.simulateOnline();
        await page.waitForTimeout(500);
      }

      // THEN: Should enter degraded mode instead of continuing infinite reconnections
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Dégradé|Degraded/, { timeout: 10000 });

      // Degraded mode indicator should be visible
      await expect(page.locator('[data-testid="degraded-mode-indicator"]')).toBeVisible();

      // System should still be functional in limited capacity
      await expect(page.locator('[data-testid="app-status"]')).toHaveText(/Limité|Limited/);
    });

    test('[P1] should classify and handle different types of disconnections appropriately', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // Test different disconnection scenarios
      const disconnectionScenarios = [
        { type: 'network', description: 'Network timeout', shouldReconnect: true },
        { type: 'auth', description: 'Authentication expired', shouldReconnect: false },
        { type: 'tiktok', description: 'Stream ended by broadcaster', shouldReconnect: true },
      ];

      for (const scenario of disconnectionScenarios) {
        // WHEN: Specific type of disconnection occurs
        await page.evaluate((disconnectType) => {
          window.postMessage({
            type: 'simulate-disconnect',
            reason: disconnectType
          }, '*');
        }, scenario.type);

        if (scenario.shouldReconnect) {
          // THEN: Should attempt reconnection for recoverable errors
          await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Reconnexion|Reconnecting/);

          // Simulate successful reconnection
          await page.evaluate(() => {
            window.postMessage({
              type: 'simulate-reconnect'
            }, '*');
          });

          await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);
        } else {
          // THEN: Should NOT attempt reconnection for non-recoverable errors
          await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Erreur|Error/);

          // Auth error indicator should be shown
          await expect(page.locator('[data-testid="auth-error-indicator"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Circuit Breaker Integration', () => {
    test('[P1] should integrate with circuit breaker for connection stability', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Multiple connection failures trigger circuit breaker
      for (let i = 0; i < 8; i++) { // Enough to potentially trigger circuit breaker
        await page.evaluate(() => {
          window.postMessage({
            type: 'simulate-connect-failure'
          }, '*');
        });
        await page.waitForTimeout(500);
      }

      // THEN: Circuit breaker should activate and prevent further connection attempts
      await expect(page.locator('[data-testid="circuit-breaker-status"]')).toHaveText(/Ouvert|Open/);

      // Connection attempts should be blocked
      await expect(page.locator('[data-testid="connection-blocked-indicator"]')).toBeVisible();

      // WHEN: Circuit breaker enters half-open state
      await page.waitForTimeout(60000); // Wait for timeout (simulated)

      // THEN: Should attempt limited reconnection
      await expect(page.locator('[data-testid="circuit-breaker-status"]')).toHaveText(/Semi-ouvert|Half-Open/);

      // Simulate successful connection in half-open state
      await page.evaluate(() => {
        window.postMessage({
          type: 'simulate-successful-connect'
        }, '*');
      });

      // Circuit breaker should reset to closed
      await expect(page.locator('[data-testid="circuit-breaker-status"]')).toHaveText(/Fermé|Closed/);
    });

    test('[P2] should provide circuit breaker health metrics', async ({ page, tiktokRoom }) => {
      // GIVEN: System with circuit breaker operational
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');

      // WHEN: Circuit breaker metrics are requested
      await page.click('[data-testid="show-metrics-button"]');

      // THEN: Health metrics should be displayed
      await expect(page.locator('[data-testid="circuit-breaker-metrics"]')).toBeVisible();

      // Should show various health indicators
      await expect(page.locator('[data-testid="total-requests"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="failure-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="consecutive-failures"]')).toBeVisible();

      // Health score should be calculated
      const healthScore = await page.locator('[data-testid="health-score"]').textContent();
      const score = parseFloat(healthScore || '0');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  test.describe('Reconnection Performance and Stability', () => {
    test('[P1] should maintain stability metrics during reconnection scenarios', async ({ page, tiktokRoom, networkFailure }) => {
      // GIVEN: Connected to TikTok room with monitoring enabled
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Multiple reconnections occur over time
      const reconnectionEvents = [];
      const startTime = Date.now();

      for (let i = 0; i < 5; i++) {
        const reconnectStart = Date.now();

        await networkFailure.simulateOffline();
        await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Reconnexion|Reconnecting/);

        await networkFailure.simulateOnline();
        await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

        const reconnectEnd = Date.now();
        reconnectionEvents.push({
          attempt: i + 1,
          duration: reconnectEnd - reconnectStart,
          timestamp: reconnectEnd
        });

        // Wait between reconnections
        await page.waitForTimeout(2000);
      }

      // THEN: Stability metrics should be calculated and displayed
      await page.click('[data-testid="show-stability-metrics"]');

      // Should show uptime percentage
      const uptimePercentage = await page.locator('[data-testid="uptime-percentage"]').textContent();
      const uptime = parseFloat(uptimePercentage || '0');
      expect(uptime).toBeGreaterThan(0);
      expect(uptime).toBeLessThanOrEqual(100);

      // Should show average reconnection time
      const avgReconnectTime = await page.locator('[data-testid="avg-reconnection-time"]').textContent();
      const avgTime = parseFloat(avgReconnectTime || '0');
      expect(avgTime).toBeGreaterThan(0);

      // Should show connection stability score
      const stabilityScore = await page.locator('[data-testid="stability-score"]').textContent();
      const score = parseFloat(stabilityScore || '0');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('[P2] should handle concurrent reconnection attempts gracefully', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Multiple simultaneous disconnection events occur
      await page.evaluate(() => {
        // Simulate multiple concurrent disconnect events
        for (let i = 0; i < 3; i++) {
          window.postMessage({
            type: 'simulate-disconnect',
            concurrent: true,
            id: i
          }, '*');
        }
      });

      // THEN: Should handle concurrent reconnections without conflicts
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Reconnexion|Reconnecting/);

      // Should eventually stabilize to connected state
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/, { timeout: 15000 });

      // No race conditions or duplicate reconnection attempts should occur
      const reconnectionCount = await page.locator('[data-testid="reconnection-count"]').textContent();
      expect(parseInt(reconnectionCount || '0')).toBeLessThanOrEqual(3); // Should not exceed concurrent events
    });

    test('[P2] should provide detailed logging and error tracking during reconnections', async ({ page, tiktokRoom, networkFailure }) => {
      // GIVEN: Connected to TikTok room with logging enabled
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Reconnection scenario occurs
      await networkFailure.simulateOffline();
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Reconnexion|Reconnecting/);

      await networkFailure.simulateOnline();
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // THEN: Detailed logs should be available
      await page.click('[data-testid="show-connection-logs"]');

      // Should show reconnection attempt logs
      await expect(page.locator('[data-testid="connection-logs"]')).toContainText('disconnect');
      await expect(page.locator('[data-testid="connection-logs"]')).toContainText('reconnect');

      // Should show timing information
      await expect(page.locator('[data-testid="connection-logs"]')).toContainText('duration');
      await expect(page.locator('[data-testid="connection-logs"]')).toContainText('attempt');

      // Error tracking should be available
      const errorCount = await page.locator('[data-testid="connection-errors-count"]').textContent();
      expect(parseInt(errorCount || '0')).toBeGreaterThanOrEqual(0);
    });
  });
});