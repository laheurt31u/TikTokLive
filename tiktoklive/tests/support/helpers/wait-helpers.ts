import { Page, Locator } from '@playwright/test';

/**
 * Custom wait helpers for TikTokLive testing
 */
export class WaitHelpers {
  /**
   * Wait for a specific number of viewers to be displayed
   */
  static async waitForViewerCount(
    page: Page,
    expectedCount: number,
    timeout: number = 10000
  ): Promise<void> {
    await page.waitForFunction(
      (count) => {
        const viewerElement = document.querySelector('[data-testid="viewer-count"]');
        if (!viewerElement) return false;
        const currentCount = parseInt(viewerElement.textContent?.replace(/\D/g, '') || '0');
        return currentCount >= count;
      },
      expectedCount,
      { timeout }
    );
  }

  /**
   * Wait for a question to appear in the overlay
   */
  static async waitForQuestion(
    page: Page,
    questionText?: string,
    timeout: number = 10000
  ): Promise<void> {
    if (questionText) {
      await page.waitForSelector(`[data-testid="question"]:has-text("${questionText}")`, { timeout });
    } else {
      await page.waitForSelector('[data-testid="question"]', { timeout });
    }
  }

  /**
   * Wait for leaderboard to update with new scores
   */
  static async waitForLeaderboardUpdate(
    page: Page,
    timeout: number = 5000
  ): Promise<void> {
    await page.waitForTimeout(100); // Small delay to ensure update starts

    // Wait for any leaderboard item to change
    await page.waitForFunction(() => {
      const leaderboardItems = document.querySelectorAll('[data-testid="leaderboard-item"]');
      return leaderboardItems.length > 0;
    }, { timeout });
  }

  /**
   * Wait for a winner announcement to appear
   */
  static async waitForWinnerAnnouncement(
    page: Page,
    winnerName?: string,
    timeout: number = 10000
  ): Promise<void> {
    if (winnerName) {
      await page.waitForSelector(`[data-testid="winner-announcement"]:has-text("${winnerName}")`, { timeout });
    } else {
      await page.waitForSelector('[data-testid="winner-announcement"]', { timeout });
    }
  }

  /**
   * Wait for text-to-speech audio to complete (approximation)
   */
  static async waitForAudioAnnouncement(
    page: Page,
    duration: number = 3000
  ): Promise<void> {
    await page.waitForTimeout(duration);
  }

  /**
   * Wait for real-time WebSocket updates
   */
  static async waitForRealtimeUpdate(
    page: Page,
    eventType: string,
    timeout: number = 5000
  ): Promise<void> {
    // This would typically listen for custom events or check for DOM updates
    // For now, use a simple timeout
    await page.waitForTimeout(100);

    await page.waitForFunction(
      (type) => {
        // Check for custom event or DOM change indicating real-time update
        return window.localStorage.getItem(`realtime-${type}`) !== null;
      },
      eventType,
      { timeout }
    );
  }

  /**
   * Polling helper for complex async conditions
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Wait for connection status to change
   */
  static async waitForConnectionStatus(
    page: Page,
    expectedStatus: string,
    timeout: number = 10000
  ): Promise<void> {
    await this.waitForCondition(async () => {
      const statusElement = page.locator('[data-testid="connection-status"]');
      const currentStatus = await statusElement.textContent();
      return currentStatus?.toLowerCase().includes(expectedStatus.toLowerCase()) || false;
    }, timeout);
  }

  /**
   * Wait for circuit breaker state change
   */
  static async waitForCircuitBreakerState(
    page: Page,
    expectedState: 'OPEN' | 'CLOSED' | 'HALF_OPEN',
    timeout: number = 5000
  ): Promise<void> {
    await this.waitForCondition(async () => {
      const stateElement = page.locator('[data-testid="circuit-breaker-status"]');
      const currentState = await stateElement.textContent();
      return currentState?.includes(expectedState) || false;
    }, timeout);
  }

  /**
   * Wait for message processing to complete
   */
  static async waitForMessageProcessing(
    page: Page,
    expectedProcessedCount: number,
    timeout: number = 15000
  ): Promise<void> {
    await this.waitForCondition(async () => {
      const processedElement = page.locator('[data-testid="processed-messages-count"]');
      const currentCount = parseInt(await processedElement.textContent() || '0');
      return currentCount >= expectedProcessedCount;
    }, timeout);
  }

  /**
   * Wait for performance metrics to update
   */
  static async waitForMetricsUpdate(
    page: Page,
    metricName: string,
    timeout: number = 5000
  ): Promise<void> {
    await this.waitForCondition(async () => {
      const metricElement = page.locator(`[data-testid="${metricName}"]`);
      return await metricElement.isVisible();
    }, timeout);
  }

  /**
   * Wait for network request completion
   */
  static async waitForNetworkRequest(
    page: Page,
    urlPattern: string | RegExp,
    timeout: number = 10000
  ): Promise<void> {
    let requestCompleted = false;

    const responsePromise = page.waitForResponse(urlPattern, { timeout });
    responsePromise.then(() => {
      requestCompleted = true;
    }).catch(() => {
      // Timeout handled by waitForCondition
    });

    await this.waitForCondition(async () => requestCompleted, timeout);
  }

  /**
   * Wait for DOM element to stabilize (no changes for specified duration)
   */
  static async waitForElementStability(
    locator: Locator,
    stabilityMs: number = 1000,
    timeout: number = 5000
  ): Promise<void> {
    let lastContent = '';
    let stabilityStart = 0;

    await this.waitForCondition(async () => {
      const currentContent = await locator.textContent() || '';
      const now = Date.now();

      if (currentContent === lastContent) {
        if (stabilityStart === 0) {
          stabilityStart = now;
        } else if (now - stabilityStart >= stabilityMs) {
          return true;
        }
      } else {
        stabilityStart = 0;
        lastContent = currentContent;
      }

      return false;
    }, timeout);
  }
}