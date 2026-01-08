import { test, expect } from '../support/fixtures';
import { WaitHelpers, AssertionHelpers } from '../support/helpers';

test.describe('TikTok Live Connection - End-to-End', () => {
  test('[P0] should complete full connection lifecycle from UI to TikTok API', async ({ page, authenticatedUser }) => {
    // GIVEN: User is on TikTokLive interface and authenticated
    await page.goto('/');

    // WHEN: User initiates TikTok Live connection
    await page.fill('[data-testid="session-id-input"]', 'test_session_12345');
    await page.fill('[data-testid="cookies-input"]', 'sessionid=abc123; user_id=12345; tt_csrf_token=xyz789');
    await page.click('[data-testid="connect-button"]');

    // THEN: Connection establishes successfully
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || status?.includes('Connected') || false;
    }, 10000);

    // AND: Connection status shows as active
    const statusElement = page.locator('[data-testid="connection-status"]');
    await expect(statusElement).toHaveText(/Connecté|Connected/);

    // AND: Room information is displayed
    await expect(page.locator('[data-testid="room-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="viewer-count"]')).toBeVisible();

    // AND: Connection metrics are being collected
    await expect(page.locator('[data-testid="connection-metrics"]')).toBeVisible();
  });

  test('[P0] should handle connection failure and show appropriate error messages', async ({ page }) => {
    // GIVEN: User is on TikTokLive interface
    await page.goto('/');

    // WHEN: User attempts connection with invalid credentials
    await page.fill('[data-testid="session-id-input"]', 'invalid_session');
    await page.fill('[data-testid="cookies-input"]', 'invalid=cookies');
    await page.click('[data-testid="connect-button"]');

    // THEN: Connection fails gracefully
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Erreur') || status?.includes('Error') || false;
    }, 10000);

    // AND: Error message is displayed to user
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/échec|failed|invalid/i);

    // AND: Retry option is available
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('[P0] should automatically reconnect after network interruption', async ({ page }) => {
    // GIVEN: User is connected to TikTok Live
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'test_session_12345');
    await page.fill('[data-testid="cookies-input"]', 'sessionid=abc123; user_id=12345');
    await page.click('[data-testid="connect-button"]');

    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    });

    // WHEN: Network interruption occurs (simulated)
    await page.click('[data-testid="simulate-disconnect"]');

    // THEN: Connection status shows disconnection
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Déconnecté') || status?.includes('Disconnected') || false;
    });

    // AND: Auto-reconnection begins
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Reconnexion') || status?.includes('Reconnecting') || false;
    });

    // AND: Eventually reconnects successfully
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    }, 15000);
  });

  test('[P0] should process live chat messages and identify quiz winners', async ({ page, quizSession }) => {
    // GIVEN: Connected to TikTok Live with active quiz session
    await page.goto(`/room/${quizSession.roomId}`);

    // WHEN: Chat messages arrive (simulated)
    await page.click('[data-testid="simulate-chat-message"]');
    await page.fill('[data-testid="chat-message-input"]', quizSession.currentQuestion.answers[quizSession.currentQuestion.correctAnswer]);
    await page.click('[data-testid="send-chat-message"]');

    // THEN: Message is processed and validated
    await WaitHelpers.waitForCondition(async () => {
      const validationStatus = await page.locator('[data-testid="message-validation-status"]').textContent();
      return validationStatus?.includes('Validé') || validationStatus?.includes('Validated') || false;
    });

    // AND: Winner is identified and announced
    await AssertionHelpers.expectWinnerAnnouncement(page, 'TestUser');

    // AND: Winner profile picture is displayed
    await AssertionHelpers.expectWinnerProfilePicture(page, 'TestUser');

    // AND: Winner is added to leaderboard
    await AssertionHelpers.expectUserInLeaderboard(page, 'TestUser');
  });

  test('[P1] should maintain connection stability under high message volume', async ({ page }) => {
    // GIVEN: Connected to busy TikTok Live session
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'busy_session_12345');
    await page.fill('[data-testid="cookies-input"]', 'sessionid=abc123; user_id=12345');
    await page.click('[data-testid="connect-button"]');

    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    });

    // WHEN: High volume of chat messages arrives (simulated)
    for (let i = 0; i < 50; i++) {
      await page.click('[data-testid="simulate-high-volume-message"]');
    }

    // THEN: Connection remains stable
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    }, 30000);

    // AND: All messages are processed without data loss
    const processedCount = await page.locator('[data-testid="processed-messages-count"]').textContent();
    expect(parseInt(processedCount || '0')).toBeGreaterThanOrEqual(45); // Allow some tolerance

    // AND: Performance metrics remain within acceptable ranges
    const avgResponseTime = await page.locator('[data-testid="avg-response-time"]').textContent();
    expect(parseInt(avgResponseTime || '0')).toBeLessThan(2000); // < 2 seconds
  });

  test('[P1] should handle circuit breaker activation during API failures', async ({ page }) => {
    // GIVEN: Connected to TikTok Live
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'test_session_12345');
    await page.fill('[data-testid="cookies-input"]', 'sessionid=abc123; user_id=12345');
    await page.click('[data-testid="connect-button"]');

    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    });

    // WHEN: Multiple consecutive API failures occur (simulated)
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="simulate-api-failure"]');
    }

    // THEN: Circuit breaker activates and prevents further requests
    await WaitHelpers.waitForCondition(async () => {
      const circuitStatus = await page.locator('[data-testid="circuit-breaker-status"]').textContent();
      return circuitStatus?.includes('OPEN') || false;
    });

    // AND: Fallback mode is activated
    await expect(page.locator('[data-testid="fallback-mode-indicator"]')).toBeVisible();

    // AND: User is notified of degraded functionality
    await expect(page.locator('[data-testid="degraded-mode-message"]')).toBeVisible();
  });

  test('[P2] should display real-time connection metrics and logs', async ({ page }) => {
    // GIVEN: Connected to TikTok Live
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'test_session_12345');
    await page.fill('[data-testid="cookies-input"]', 'sessionid=abc123; user_id=12345');
    await page.click('[data-testid="connect-button"]');

    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    });

    // WHEN: Connection events occur over time
    await page.waitForTimeout(2000); // Allow some events to occur

    // THEN: Connection metrics are displayed
    await expect(page.locator('[data-testid="connection-uptime"]')).toBeVisible();
    await expect(page.locator('[data-testid="messages-processed"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-count"]')).toBeVisible();

    // AND: Connection logs are available
    await expect(page.locator('[data-testid="connection-logs"]')).toBeVisible();
    const logEntries = page.locator('[data-testid="log-entry"]');
    await expect(logEntries).toHaveCountGreaterThan(0);

    // AND: Logs can be filtered and searched
    await page.fill('[data-testid="log-search"]', 'connect');
    const filteredLogs = page.locator('[data-testid="log-entry"]:visible');
    await expect(filteredLogs).toHaveCountGreaterThan(0);
  });
});