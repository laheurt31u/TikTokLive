import { test, expect } from '../support/fixtures';
import { TikTokLiveFactory } from '../support/factories/tiktok-live-factory';

test.describe('Metrics and Correlation E2E', () => {
  test.describe('Real-time Metrics Collection', () => {
    test('[P1] should collect and display real-time comment processing metrics', async ({ page, tiktokRoom, metricsCollector }) => {
      // GIVEN: Connected to TikTok room with metrics collection enabled
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Comments are processed
      const testComments = TikTokLiveFactory.createHighVolumeTikTokComments(25, 'metrics-test-session');

      for (const comment of testComments) {
        await page.evaluate((commentData) => {
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, comment);

        // Simulate some processing delay
        await page.waitForTimeout(Math.random() * 100);
      }

      // THEN: Real-time metrics should be collected and displayed
      await page.click('[data-testid="show-metrics-dashboard"]');

      // Should show comment processing metrics
      await expect(page.locator('[data-testid="total-comments-processed"]')).toHaveText('25');
      await expect(page.locator('[data-testid="comments-per-second"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-processing-time"]')).toBeVisible();

      // Latency metrics should be within NFR limits (< 2s average)
      const avgLatency = await page.locator('[data-testid="average-processing-time"]').textContent();
      const latency = parseFloat(avgLatency || '0');
      expect(latency).toBeGreaterThan(0);
      expect(latency).toBeLessThan(2000); // NFR requirement
    });

    test('[P1] should track correlation IDs across comment processing pipeline', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room with correlation tracking
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Comment with specific correlation ID is processed
      const correlationId = 'test-correlation-12345';
      const comment = TikTokLiveFactory.createTikTokComment({
        text: 'Correlation test comment',
        sessionId: 'correlation-session'
      });

      await page.evaluate((commentData, corrId) => {
        window.postMessage({
          type: 'tiktok-comment',
          data: commentData,
          correlationId: corrId
        }, '*');
      }, comment, correlationId);

      // THEN: Correlation ID should be tracked throughout the processing pipeline
      await page.click('[data-testid="show-correlation-logs"]');

      // Should show correlation ID in logs
      await expect(page.locator('[data-testid="correlation-logs"]')).toContainText(correlationId);

      // Should show processing steps with same correlation ID
      const logEntries = await page.locator('[data-testid="correlation-log-entry"]').all();
      expect(logEntries.length).toBeGreaterThan(0);

      // All log entries should contain the correlation ID
      for (const entry of logEntries) {
        const text = await entry.textContent();
        expect(text).toContain(correlationId);
      }
    });

    test('[P1] should monitor error rates and trigger alerts when thresholds exceeded', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room with error monitoring
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: High volume of invalid comments causes errors
      const validComments = 10;
      const invalidComments = 15; // 60% error rate

      // Send valid comments
      for (let i = 0; i < validComments; i++) {
        const comment = TikTokLiveFactory.createTikTokComment({ text: `Valid comment ${i}` });
        await page.evaluate((commentData) => {
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, comment);
      }

      // Send invalid comments to trigger errors
      for (let i = 0; i < invalidComments; i++) {
        const invalidComment = { invalid: 'data' }; // Will cause parsing errors
        await page.evaluate((commentData) => {
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, invalidComment);
      }

      // THEN: Error rate should be monitored and alerts triggered
      await page.click('[data-testid="show-error-metrics"]');

      // Should show error rate exceeding threshold
      const errorRate = await page.locator('[data-testid="error-rate-percentage"]').textContent();
      const rate = parseFloat(errorRate || '0');
      expect(rate).toBeGreaterThan(50); // Should be around 60%

      // Alert should be triggered for high error rate
      await expect(page.locator('[data-testid="error-rate-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-rate-alert"]')).toHaveText(/élevé|high/);
    });
  });

  test.describe('Connection Stability Metrics', () => {
    test('[P1] should calculate and display connection stability metrics', async ({ page, tiktokRoom, networkFailure }) => {
      // GIVEN: Connection with stability monitoring enabled
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      const startTime = Date.now();

      // WHEN: Connection experiences disruptions over time
      const disruptions = [
        { duration: 5000, type: 'network' },
        { duration: 3000, type: 'network' },
        { duration: 8000, type: 'auth' },
        { duration: 2000, type: 'network' },
      ];

      for (const disruption of disruptions) {
        await networkFailure.simulateOffline();
        await page.waitForTimeout(disruption.duration);
        await networkFailure.simulateOnline();

        // Wait for reconnection
        await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/, { timeout: 10000 });
      }

      const totalTime = Date.now() - startTime;

      // THEN: Stability metrics should be calculated correctly
      await page.click('[data-testid="show-stability-dashboard"]');

      // Uptime percentage should be calculated
      const uptimePercentage = await page.locator('[data-testid="uptime-percentage"]')).textContent();
      const uptime = parseFloat(uptimePercentage || '0');
      expect(uptime).toBeGreaterThan(0);
      expect(uptime).toBeLessThan(100); // Should reflect the disruptions

      // Average reconnection time should be calculated
      const avgReconnectTime = await page.locator('[data-testid="avg-reconnection-time"]')).textContent();
      const avgTime = parseFloat(avgReconnectTime || '0');
      expect(avgTime).toBeGreaterThan(0);

      // Disconnect frequency should be calculated
      const disconnectFreq = await page.locator('[data-testid="disconnect-frequency"]')).textContent();
      const frequency = parseFloat(disconnectFreq || '0');
      expect(frequency).toBeGreaterThan(0);

      // Overall stability score should be computed
      const stabilityScore = await page.locator('[data-testid="stability-score"]')).textContent();
      const score = parseFloat(stabilityScore || '0');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('[P2] should correlate metrics across different system components', async ({ page, tiktokRoom, metricsCollector, eventBatcher }) => {
      // GIVEN: Multiple system components with metrics collection
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: System processes various events and metrics are collected
      const sessionId = 'correlation-test-session';

      // Simulate comment processing with metrics
      const comments = TikTokLiveFactory.createHighVolumeTikTokComments(10, sessionId);

      for (const comment of comments) {
        metricsCollector.recordEvent({
          type: 'comment-processed',
          sessionId,
          latency: Math.random() * 1000,
          success: true
        });

        await page.evaluate((commentData) => {
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, comment);
      }

      // Simulate event batching
      const batchEvents = TikTokLiveFactory.createEventBatch(20, sessionId);
      for (const event of batchEvents) {
        eventBatcher.addEvent(event);
      }

      // THEN: Metrics should be correlated across components
      await page.click('[data-testid="show-correlated-metrics"]');

      // Should show session-based correlation
      await expect(page.locator('[data-testid="session-metrics"]')).toContainText(sessionId);

      // Should correlate comment processing with event batching
      const commentMetrics = await page.locator('[data-testid="comment-processing-metrics"]')).textContent();
      const batchMetrics = await page.locator('[data-testid="event-batching-metrics"]')).textContent();

      // Both should reference the same session
      expect(commentMetrics).toContain(sessionId);
      expect(batchMetrics).toContain(sessionId);

      // Should show combined performance metrics
      await expect(page.locator('[data-testid="combined-throughput"]')).toBeVisible();
      await expect(page.locator('[data-testid="end-to-end-latency"]')).toBeVisible();
    });
  });

  test.describe('Performance Monitoring and Alerts', () => {
    test('[P2] should monitor performance against NFR requirements', async ({ page, tiktokRoom }) => {
      // GIVEN: System with NFR monitoring enabled
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: System operates under various loads
      const performanceScenarios = [
        { comments: 5, expectedLatency: '< 500ms' },
        { comments: 25, expectedLatency: '< 1000ms' },
        { comments: 100, expectedLatency: '< 2000ms' },
      ];

      for (const scenario of performanceScenarios) {
        const comments = TikTokLiveFactory.createHighVolumeTikTokComments(scenario.comments, `perf-test-${scenario.comments}`);

        const startTime = Date.now();

        for (const comment of comments) {
          await page.evaluate((commentData) => {
            window.postMessage({
              type: 'tiktok-comment',
              data: commentData
            }, '*');
          }, comment);
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // THEN: Performance should meet NFR requirements
        await page.click('[data-testid="check-nfr-compliance"]');

        // Should validate against NFR thresholds
        const nfrStatus = await page.locator('[data-testid="nfr-compliance-status"]')).textContent();
        expect(nfrStatus).toContain('compliant') || expect(nfrStatus).toContain('conforme');

        // Performance metrics should be within acceptable ranges
        const avgLatency = await page.locator('[data-testid="current-avg-latency"]')).textContent();
        const latency = parseFloat(avgLatency || '0');

        // NFR: Comment processing < 2 seconds
        expect(latency).toBeLessThan(2000);

        // Reset for next scenario
        await page.click('[data-testid="reset-performance-metrics"]');
      }
    });

    test('[P2] should generate alerts for system health issues', async ({ page, tiktokRoom }) => {
      // GIVEN: System with health monitoring and alerting
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Various health issues occur
      const healthIssues = [
        { type: 'high-error-rate', trigger: 'send-invalid-comments' },
        { type: 'high-latency', trigger: 'simulate-slow-processing' },
        { type: 'memory-pressure', trigger: 'simulate-high-memory-usage' },
      ];

      for (const issue of healthIssues) {
        // Trigger specific health issue
        await page.evaluate((issueType) => {
          window.postMessage({
            type: 'simulate-health-issue',
            issue: issueType
          }, '*');
        }, issue.type);

        // THEN: Appropriate alerts should be generated
        await expect(page.locator('[data-testid="system-alerts"]')).toBeVisible();

        // Alert should be specific to the issue type
        const alertText = await page.locator('[data-testid="active-alert"]')).textContent();
        expect(alertText).toContain(issue.type.replace('-', ' '));

        // Alert should have severity level
        await expect(page.locator('[data-testid="alert-severity"]')).toBeVisible();

        // Should provide remediation suggestions
        await expect(page.locator('[data-testid="alert-remediation"]')).toBeVisible();

        // Clear alert for next test
        await page.click('[data-testid="dismiss-alert"]');
      }
    });

    test('[P2] should provide comprehensive system health dashboard', async ({ page, tiktokRoom }) => {
      // GIVEN: System operating with full monitoring enabled
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Health dashboard is accessed
      await page.click('[data-testid="open-health-dashboard"]');

      // THEN: Comprehensive health metrics should be displayed
      await expect(page.locator('[data-testid="health-dashboard"]')).toBeVisible();

      // Core health indicators
      await expect(page.locator('[data-testid="overall-health-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="uptime-indicator"]')).toBeVisible();

      // Performance metrics
      await expect(page.locator('[data-testid="performance-metrics-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="throughput-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="latency-chart"]')).toBeVisible();

      // Error tracking
      await expect(page.locator('[data-testid="error-rate-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-alerts-list"]')).toBeVisible();

      // Resource usage
      await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="cpu-usage"]')).toBeVisible();

      // NFR compliance status
      await expect(page.locator('[data-testid="nfr-compliance-matrix"]')).toBeVisible();

      // Should allow drill-down into specific metrics
      await page.click('[data-testid="drill-down-performance"]');
      await expect(page.locator('[data-testid="detailed-performance-metrics"]')).toBeVisible();
    });
  });
});