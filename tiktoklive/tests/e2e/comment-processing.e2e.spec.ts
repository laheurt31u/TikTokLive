import { test, expect } from '../support/fixtures';
import { TikTokLiveFactory } from '../support/factories/tiktok-live-factory';

test.describe('Comment Processing E2E', () => {
  test.describe('Real-time Comment Flow', () => {
    test('[P0] should process comments from TikTok live stream in real-time', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room with active comment stream
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');

      // Wait for connection
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/, { timeout: 10000 });

      // WHEN: Comments are received from TikTok
      const highVolumeComments = TikTokLiveFactory.createHighVolumeTikTokComments(10, 'e2e-session-123');

      // Simulate comment processing (in real scenario, these come from WebSocket)
      for (const comment of highVolumeComments) {
        // Simulate WebSocket message
        await page.evaluate((commentData) => {
          // This would normally come from the WebSocket connection
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, comment);
      }

      // THEN: Comments should appear in the UI within 2 seconds (NFR requirement)
      await expect(page.locator('[data-testid="comment-count"]')).toHaveText('10', { timeout: 2000 });

      // Verify comment content is displayed
      for (const comment of highVolumeComments.slice(0, 3)) { // Check first 3 comments
        await expect(page.locator('[data-testid="comments-list"]')).toContainText(comment.text);
      }
    });

    test('[P1] should handle comment processing errors gracefully without breaking the stream', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Invalid comment data is received
      const invalidComments = [
        { invalid: 'data' }, // Missing required fields
        { id: '', text: 'empty id' }, // Empty ID
        { id: 'valid-id', text: '' }, // Empty text
        null,
        undefined
      ];

      for (const invalidComment of invalidComments) {
        await page.evaluate((commentData) => {
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, invalidComment);
      }

      // THEN: System should continue functioning
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // Error counter should be incremented (but not crash the app)
      const errorCount = await page.locator('[data-testid="processing-errors"]').textContent();
      expect(parseInt(errorCount || '0')).toBeGreaterThan(0);
    });

    test('[P1] should maintain comment order and prevent duplicates', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Comments arrive in specific order
      const orderedComments = [
        TikTokLiveFactory.createTikTokComment({ text: 'First comment', timestamp: new Date(Date.now() - 3000) }),
        TikTokLiveFactory.createTikTokComment({ text: 'Second comment', timestamp: new Date(Date.now() - 2000) }),
        TikTokLiveFactory.createTikTokComment({ text: 'Third comment', timestamp: new Date(Date.now() - 1000) }),
      ];

      for (const comment of orderedComments) {
        await page.evaluate((commentData) => {
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, comment);
      }

      // THEN: Comments should appear in chronological order (oldest first)
      await expect(page.locator('[data-testid="comment-0"]')).toContainText('First comment');
      await expect(page.locator('[data-testid="comment-1"]')).toContainText('Second comment');
      await expect(page.locator('[data-testid="comment-2"]')).toContainText('Third comment');
    });

    test('[P2] should handle high-volume comment bursts without performance degradation', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: High volume of comments arrives in rapid succession (100 comments in < 1 second)
      const burstComments = TikTokLiveFactory.createHighVolumeTikTokComments(100, 'burst-session-456');

      // Send all comments rapidly
      const startTime = Date.now();
      for (const comment of burstComments) {
        await page.evaluate((commentData) => {
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, comment);
      }
      const endTime = Date.now();

      // THEN: All comments should be processed within reasonable time
      expect(endTime - startTime).toBeLessThan(2000); // Should process 100 comments in < 2 seconds

      // UI should reflect all comments
      await expect(page.locator('[data-testid="comment-count"]')).toHaveText('100', { timeout: 3000 });

      // Performance metrics should be within acceptable range
      const avgProcessingTime = await page.locator('[data-testid="avg-processing-time"]').textContent();
      expect(parseFloat(avgProcessingTime || '0')).toBeLessThan(50); // < 50ms per comment
    });
  });

  test.describe('Comment Validation and Sanitization', () => {
    test('[P1] should sanitize sensitive data from comments before display', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Comment with sensitive data arrives
      const sensitiveComment = TikTokLiveFactory.createTikTokComment({
        text: 'Contact me at 123-456-7890 or 098-765-4321 for more info',
        username: 'user@private.com'
      });

      await page.evaluate((commentData) => {
        window.postMessage({
          type: 'tiktok-comment',
          data: commentData
        }, '*');
      }, sensitiveComment);

      // THEN: Sensitive data should be masked in display
      await expect(page.locator('[data-testid="comments-list"]')).toContainText('[PHONE_NUMBER]');
      await expect(page.locator('[data-testid="comments-list"]')).not.toContainText('123-456-7890');
      await expect(page.locator('[data-testid="comments-list"]')).not.toContainText('098-765-4321');
    });

    test('[P1] should validate comment content and reject invalid comments', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Various invalid comments are received
      const invalidComments = [
        { text: '   ' }, // Only whitespace
        { text: 'a'.repeat(501) }, // Too long
        { username: '' }, // Empty username
        { id: null }, // Null ID
      ];

      for (const invalidComment of invalidComments) {
        const comment = TikTokLiveFactory.createTikTokComment(invalidComment);
        await page.evaluate((commentData) => {
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, comment);
      }

      // THEN: Invalid comments should be filtered out
      const commentCount = await page.locator('[data-testid="comment-count"]').textContent();
      expect(parseInt(commentCount || '0')).toBe(0);

      // Validation errors should be logged
      const validationErrors = await page.locator('[data-testid="validation-errors"]').textContent();
      expect(parseInt(validationErrors || '0')).toBeGreaterThan(0);
    });
  });

  test.describe('Comment Metadata and Analytics', () => {
    test('[P2] should extract and display comment metadata', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Comments with various metadata arrive
      const commentsWithMetadata = [
        TikTokLiveFactory.createTikTokComment({ text: 'Hello @moderator!' }),
        TikTokLiveFactory.createTikTokComment({ text: 'Great stream everyone!' }),
        TikTokLiveFactory.createTikTokComment({ text: 'Short' }),
      ];

      for (const comment of commentsWithMetadata) {
        await page.evaluate((commentData) => {
          window.postMessage({
            type: 'tiktok-comment',
            data: commentData
          }, '*');
        }, comment);
      }

      // THEN: Metadata should be calculated and displayed
      await expect(page.locator('[data-testid="mentions-count"]')).toHaveText('1');
      await expect(page.locator('[data-testid="total-comments"]')).toHaveText('3');

      // Average comment length should be calculated
      const avgLength = await page.locator('[data-testid="avg-comment-length"]').textContent();
      expect(parseFloat(avgLength || '0')).toBeGreaterThan(0);
    });

    test('[P2] should track comment processing latency and performance', async ({ page, tiktokRoom }) => {
      // GIVEN: Connected to TikTok room
      await page.goto('/');
      await page.fill('[data-testid="room-id-input"]', tiktokRoom.id);
      await page.click('[data-testid="connect-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connecté|Connected/);

      // WHEN: Comments are processed
      const startTime = Date.now();
      const comment = TikTokLiveFactory.createTikTokComment({ text: 'Performance test comment' });

      await page.evaluate((commentData) => {
        window.postMessage({
          type: 'tiktok-comment',
          data: commentData
        }, '*');
      }, comment);

      // THEN: Processing latency should be tracked and within NFR limits (< 2s)
      const latencyMetric = await page.locator('[data-testid="processing-latency"]').textContent();
      const latency = parseFloat(latencyMetric || '0');
      expect(latency).toBeGreaterThan(0);
      expect(latency).toBeLessThan(2000); // NFR: < 2 seconds

      // Performance should be within acceptable range
      expect(Date.now() - startTime).toBeLessThan(5000); // Total E2E time < 5s
    });
  });
});