import { test as base } from '@playwright/test';
import { UserFactory } from '../factories/user-factory';
import { TikTokLiveFactory } from '../factories/tiktok-live-factory';

// Type definitions for our custom fixtures
type TestFixtures = {
  authenticatedUser: {
    id: string;
    email: string;
    name: string;
    roomId: string;
  };
  tiktokRoom: {
    id: string;
    name: string;
    isLive: boolean;
    viewerCount: number;
  };
  quizSession: {
    id: string;
    roomId: string;
    currentQuestion: {
      id: string;
      text: string;
      answers: string[];
      correctAnswer: number;
    };
    participants: Array<{
      id: string;
      name: string;
      score: number;
    }>;
  };
  mockTikTokApi: {
    baseUrl: string;
    mockResponses: Map<string, any>;
  };
  highVolumeChat: {
    messages: Array<{
      userId: string;
      username: string;
      content: string;
      timestamp: Date;
      type: 'comment';
    }>;
  };
  networkFailure: {
    simulateOffline: () => Promise<void>;
    simulateOnline: () => Promise<void>;
    isOffline: boolean;
  };
  // ===== NEW FIXTURES FOR EXTENDED TEST COVERAGE =====
  tiktokComments: Array<{
    id: string;
    userId: string;
    username: string;
    text: string;
    timestamp: Date;
    sessionId: string;
  }>;
  tiktokEventStream: Array<{
    type: string;
    timestamp: Date;
    data?: any;
    correlationId?: string;
  }>;
  reconnectionManager: {
    currentState: string;
    retryCount: number;
    simulateFailure: () => Promise<void>;
    simulateReconnection: () => Promise<void>;
  };
  metricsCollector: {
    sessionId: string;
    recordEvent: (event: any) => void;
    getMetrics: () => any;
  };
  eventBatcher: {
    addEvent: (event: any) => void;
    getBatchCount: () => number;
    forceFlush: () => void;
  };
};

// Extend Playwright's test with our custom fixtures
export const test = base.extend<TestFixtures>({
  // Authenticated user fixture with auto-cleanup
  authenticatedUser: async ({ page }, use) => {
    const user = await UserFactory.createAuthenticatedUser();

    // Setup: Navigate to app and authenticate if needed
    await page.goto('/');

    // If login is required, perform authentication
    const loginButton = page.locator('[data-testid="login-button"]');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      // Handle TikTok OAuth or other auth flow
      // This would be customized based on your auth implementation
    }

    // Provide user data to test
    await use(user);

    // Cleanup: Clean up test user data
    await UserFactory.cleanup(user.id);
  },

  // TikTok room fixture
  tiktokRoom: async ({}, use) => {
    const room = await TikTokLiveFactory.createTestRoom();

    await use(room);

    // Cleanup
    await TikTokLiveFactory.cleanupRoom(room.id);
  },

  // Quiz session fixture
  quizSession: async ({ tiktokRoom }, use) => {
    const session = await TikTokLiveFactory.createQuizSession(tiktokRoom.id);

    await use(session);

    // Cleanup
    await TikTokLiveFactory.cleanupSession(session.id);
  },

  // Mock TikTok API fixture for API testing
  mockTikTokApi: async ({}, use) => {
    const mockResponses = new Map<string, any>();
    const baseUrl = 'https://api.tiktok.com';

    // Setup mock responses for common TikTok API endpoints
    mockResponses.set('/user/info', { id: '12345', username: 'testuser' });
    mockResponses.set('/live/room/info', { roomId: 'room123', isLive: true });

    await use({ baseUrl, mockResponses });

    // Cleanup
    mockResponses.clear();
  },

  // High volume chat fixture for performance testing
  highVolumeChat: async ({}, use) => {
    const messages = Array.from({ length: 100 }, (_, i) => ({
      userId: `user${i}`,
      username: `User${i}`,
      content: `Message ${i}: ${Math.random() > 0.5 ? 'Answer A' : 'Answer B'}`,
      timestamp: new Date(Date.now() - (100 - i) * 1000), // Messages spread over 100 seconds
      type: 'comment' as const,
    }));

    await use({ messages });

    // No cleanup needed for static data
  },

  // Network failure simulation fixture
  networkFailure: async ({ page }, use) => {
    let isOffline = false;

    const simulateOffline = async () => {
      isOffline = true;
      await page.context().setOffline(true);
    };

    const simulateOnline = async () => {
      isOffline = false;
      await page.context().setOffline(false);
    };

    await use({
      simulateOffline,
      simulateOnline,
      get isOffline() { return isOffline; }
    });

    // Reset to online state
    await simulateOnline();
  },

  // ===== NEW FIXTURE IMPLEMENTATIONS =====

  // TikTok comments fixture for testing comment processing
  tiktokComments: async ({}, use) => {
    const comments = TikTokLiveFactory.createHighVolumeTikTokComments(50, 'test-session-123');
    const createdComments: string[] = [];

    // Track created comments for cleanup
    comments.forEach(comment => createdComments.push(comment.id));

    await use(comments);

    // Cleanup
    console.log(`Cleaning up ${createdComments.length} test comments`);
    createdComments.length = 0;
  },

  // TikTok event stream fixture for testing event handling
  tiktokEventStream: async ({}, use) => {
    const events = Array.from({ length: 20 }, (_, i) =>
      TikTokLiveFactory.createTikTokEvent({
        timestamp: new Date(Date.now() + i * 100), // 100ms intervals
      })
    );
    const createdEvents: string[] = [];

    events.forEach(event => createdEvents.push(event.correlationId || 'unknown'));

    await use(events);

    // Cleanup
    console.log(`Cleaning up ${createdEvents.length} test events`);
  },

  // Reconnection manager fixture for testing reconnection logic
  reconnectionManager: async ({}, use) => {
    let currentState = 'IDLE';
    let retryCount = 0;

    const simulateFailure = async () => {
      currentState = 'RECONNECTING';
      retryCount += 1;
    };

    const simulateReconnection = async () => {
      currentState = 'CONNECTED';
      retryCount = 0;
    };

    await use({
      get currentState() { return currentState; },
      get retryCount() { return retryCount; },
      simulateFailure,
      simulateReconnection,
    });

    // Reset state
    currentState = 'IDLE';
    retryCount = 0;
  },

  // Metrics collector fixture for testing metrics collection
  metricsCollector: async ({}, use) => {
    const sessionId = 'test-session-' + Date.now();
    const events: any[] = [];
    let metrics = {
      eventCount: 0,
      errorCount: 0,
      averageLatency: 0,
    };

    const recordEvent = (event: any) => {
      events.push(event);
      metrics.eventCount += 1;
      if (event.type === 'error') {
        metrics.errorCount += 1;
      }
      if (event.latency) {
        metrics.averageLatency = (metrics.averageLatency + event.latency) / 2;
      }
    };

    const getMetrics = () => ({ ...metrics, sessionId });

    await use({
      sessionId,
      recordEvent,
      getMetrics,
    });

    // Cleanup
    events.length = 0;
  },

  // Event batcher fixture for testing event batching logic
  eventBatcher: async ({}, use) => {
    const batchedEvents: any[] = [];
    let batchCount = 0;

    const addEvent = (event: any) => {
      batchedEvents.push(event);
      batchCount += 1;
    };

    const getBatchCount = () => batchCount;

    const forceFlush = () => {
      console.log(`Flushing ${batchedEvents.length} batched events`);
      batchedEvents.length = 0;
      batchCount = 0;
    };

    await use({
      addEvent,
      getBatchCount,
      forceFlush,
    });

    // Cleanup
    forceFlush();
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';