import { test, expect } from '../support/fixtures';
import { WaitHelpers, AssertionHelpers } from '../support/helpers';

test.describe('TikTok Live Connection', () => {
  test('[P0] should establish connection to TikTok live stream', async ({ page, tiktokRoom }) => {
    // GIVEN: User is on the TikTokLive interface
    await page.goto('/');

    // WHEN: Connection to TikTok room is established
    await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
    await page.click('[data-testid="connect-button"]');

    // THEN: Connection status shows as connected
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    });

    const statusElement = page.locator('[data-testid="connection-status"]');
    await expect(statusElement).toHaveText(/Connecté|Connected/);
  });

  test('[P0] should display room information after connection', async ({ page, tiktokRoom }) => {
    // GIVEN: Connected to a TikTok room
    await page.goto('/');
    await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
    await page.click('[data-testid="connect-button"]');

    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    });

    // THEN: Room information is displayed
    await expect(page.locator('[data-testid="room-name"]')).toHaveText(tiktokRoom.name);
    await expect(page.locator('[data-testid="viewer-count"]')).toBeVisible();
  });

  test('[P1] should handle connection errors gracefully', async ({ page }) => {
    // GIVEN: User attempts to connect with invalid room ID
    await page.goto('/');

    // WHEN: Invalid room ID is entered
    await page.fill('[data-testid="room-id-input"]', 'invalid-room-id-12345');
    await page.click('[data-testid="connect-button"]');

    // THEN: Error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/erreur|error|invalid/i);
  });

  test('[P1] should reconnect automatically after disconnection', async ({ page, tiktokRoom }) => {
    // GIVEN: Connected to a room
    await page.goto('/');
    await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
    await page.click('[data-testid="connect-button"]');

    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    });

    // WHEN: Disconnection occurs (simulated)
    // Note: In real scenario, this would be triggered by network issues
    await page.click('[data-testid="simulate-disconnect"]');

    // THEN: Auto-reconnection should occur
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Reconnexion') || status?.includes('Reconnecting') || false;
    }, 10000);

    // And eventually reconnect successfully
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    }, 15000);
  });

  test('[P2] should display connection logs', async ({ page, tiktokRoom }) => {
    // GIVEN: Connected to a room
    await page.goto('/');
    await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
    await page.click('[data-testid="connect-button"]');

    // WHEN: Connection events occur
    await WaitHelpers.waitForCondition(async () => {
      const status = await page.locator('[data-testid="connection-status"]').textContent();
      return status?.includes('Connecté') || false;
    });

    // THEN: Connection logs should be visible
    const logsContainer = page.locator('[data-testid="connection-logs"]');
    await expect(logsContainer).toBeVisible();

    // Should contain at least connection established log
    await expect(logsContainer).toContainText(/connecté|connected|established/i);
  });
});