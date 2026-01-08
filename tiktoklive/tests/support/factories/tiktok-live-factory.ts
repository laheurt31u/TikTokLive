import { faker } from '@faker-js/faker';
import { TikTokComment, TikTokEvent, ReconnectionState, CircuitBreakerState } from '../../../lib/tiktok/types';

export interface TestRoom {
  id: string;
  name: string;
  ownerId: string;
  isLive: boolean;
  viewerCount: number;
  description?: string;
  tags?: string[];
}

export interface QuizQuestion {
  id: string;
  text: string;
  answers: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // seconds
}

export interface QuizSession {
  id: string;
  roomId: string;
  currentQuestion: QuizQuestion;
  participants: Array<{
    id: string;
    name: string;
    score: number;
    isActive: boolean;
  }>;
  startTime: Date;
  isActive: boolean;
}

export class TikTokLiveFactory {
  /**
   * Create a test TikTok live room
   */
  static createRoom(overrides: Partial<TestRoom> = {}): TestRoom {
    return {
      id: faker.string.uuid(),
      name: faker.lorem.words(3),
      ownerId: faker.string.uuid(),
      isLive: true,
      viewerCount: faker.number.int({ min: 0, max: 10000 }),
      description: faker.lorem.sentence(),
      tags: Array.from({ length: faker.number.int({ min: 1, max: 5 }) },
        () => faker.lorem.word()),
      ...overrides,
    };
  }

  /**
   * Create a test room (alias for createRoom for consistency)
   */
  static async createTestRoom(overrides: Partial<TestRoom> = {}): Promise<TestRoom> {
    const room = this.createRoom(overrides);

    // In a real implementation, this would create the room in test database/API
    // For now, just return the room object

    return room;
  }

  /**
   * Create a quiz question
   */
  static createQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
    const answers = [
      faker.lorem.sentence(),
      faker.lorem.sentence(),
      faker.lorem.sentence(),
      faker.lorem.sentence(),
    ];

    return {
      id: faker.string.uuid(),
      text: faker.lorem.sentence({ min: 5, max: 15 }) + '?',
      answers,
      correctAnswer: faker.number.int({ min: 0, max: 3 }),
      difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
      timeLimit: faker.number.int({ min: 10, max: 30 }),
      ...overrides,
    };
  }

  /**
   * Create a quiz session with participants
   */
  static async createQuizSession(roomId: string, participantCount: number = 5): Promise<QuizSession> {
    const currentQuestion = this.createQuestion();

    const participants = Array.from({ length: participantCount }, () => ({
      id: faker.string.uuid(),
      name: faker.internet.username(),
      score: faker.number.int({ min: 0, max: 1000 }),
      isActive: faker.datatype.boolean(),
    }));

    const session: QuizSession = {
      id: faker.string.uuid(),
      roomId,
      currentQuestion,
      participants,
      startTime: new Date(),
      isActive: true,
    };

    // In a real implementation, this would create the session in test database/API

    return session;
  }

  /**
   * Create a leaderboard entry
   */
  static createLeaderboardEntry() {
    return {
      id: faker.string.uuid(),
      name: faker.internet.username(),
      score: faker.number.int({ min: 0, max: 5000 }),
      rank: faker.number.int({ min: 1, max: 100 }),
      avatar: faker.image.avatar(),
    };
  }

  /**
   * Create multiple leaderboard entries
   */
  static createLeaderboard(count: number = 10) {
    return Array.from({ length: count }, () => this.createLeaderboardEntry())
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  /**
   * Clean up test room
   */
  static async cleanupRoom(roomId: string): Promise<void> {
    console.log(`Cleaning up test room: ${roomId}`);
    // In a real implementation, this would remove the room from test database
  }

  /**
   * Clean up quiz session
   */
  static async cleanupSession(sessionId: string): Promise<void> {
    console.log(`Cleaning up quiz session: ${sessionId}`);
    // In a real implementation, this would remove the session from test database
  }

  /**
   * Simulate a chat message from TikTok
   */
  static createChatMessage(overrides: Partial<{
    id: string;
    userId: string;
    username: string;
    content: string;
    timestamp: Date;
    isAnswer: boolean;
    answer?: string;
  }> = {}) {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      username: faker.internet.username(),
      content: faker.lorem.sentence(),
      timestamp: new Date(),
      isAnswer: faker.datatype.boolean({ probability: 0.3 }),
      answer: faker.lorem.word(),
      ...overrides,
    };
  }

  /**
   * Create multiple chat messages
   */
  static createChatMessages(count: number = 10) {
    return Array.from({ length: count }, () => this.createChatMessage());
  }

  /**
   * Create high-volume chat messages for performance testing
   */
  static createHighVolumeMessages(count: number = 100, timeSpanMs: number = 60000) {
    const now = Date.now();
    return Array.from({ length: count }, (_, i) => ({
      ...this.createChatMessage(),
      timestamp: new Date(now - (timeSpanMs - (i * timeSpanMs / count))),
      content: Math.random() > 0.5 ? 'La réponse est Paris' : faker.lorem.sentence(),
    }));
  }

  /**
   * Create connection metrics for testing
   */
  static createConnectionMetrics(overrides: Partial<{
    totalMessages: number;
    correctAnswers: number;
    connectionUptime: number;
    averageResponseTime: number;
    errorCount: number;
  }> = {}) {
    return {
      totalMessages: faker.number.int({ min: 0, max: 1000 }),
      correctAnswers: faker.number.int({ min: 0, max: 100 }),
      connectionUptime: faker.number.float({ min: 0, max: 100 }),
      averageResponseTime: faker.number.float({ min: 10, max: 2000 }),
      errorCount: faker.number.int({ min: 0, max: 50 }),
      ...overrides,
    };
  }

  /**
   * Create circuit breaker state for testing
   */
  static createCircuitBreakerState(overrides: Partial<{
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: Date;
    nextAttemptTime: Date;
  }> = {}) {
    const states: Array<'CLOSED' | 'OPEN' | 'HALF_OPEN'> = ['CLOSED', 'OPEN', 'HALF_OPEN'];
    return {
      state: faker.helpers.arrayElement(states),
      failureCount: faker.number.int({ min: 0, max: 10 }),
      lastFailureTime: faker.date.recent(),
      nextAttemptTime: faker.date.soon(),
      ...overrides,
    };
  }

  /**
   * Create connection configuration for testing
   */
  static createConnectionConfig(overrides: Partial<{
    sessionId: string;
    cookies: string;
    roomId: string;
    enableLogging: boolean;
  }> = {}) {
    return {
      sessionId: faker.string.alphanumeric(32),
      cookies: `sessionid=${faker.string.alphanumeric(32)}; user_id=${faker.string.uuid()}; tt_csrf_token=${faker.string.alphanumeric(16)}`,
      roomId: faker.string.uuid(),
      enableLogging: faker.datatype.boolean(),
      ...overrides,
    };
  }

  /**
   * Create quiz answers for performance testing
   */
  static createQuizAnswers(count: number = 20, correctAnswer: string = 'Paris') {
    return Array.from({ length: count }, (_, i) => ({
      ...this.createChatMessage(),
      timestamp: new Date(Date.now() - (count - i) * 100), // Stagger timestamps
      isAnswer: true,
      answer: Math.random() > 0.3 ? correctAnswer : faker.location.city(), // 70% correct
      content: Math.random() > 0.3 ? correctAnswer : faker.location.city(),
    }));
  }

  /**
   * Create network failure scenario data
   */
  static createNetworkFailure(overrides: Partial<{
    errorType: string;
    statusCode: number;
    message: string;
    retryCount: number;
  }> = {}) {
    return {
      errorType: faker.helpers.arrayElement(['TIMEOUT', 'CONNECTION_REFUSED', 'NETWORK_ERROR', 'API_ERROR']),
      statusCode: faker.helpers.arrayElement([408, 500, 502, 503, 504]),
      message: faker.lorem.sentence(),
      retryCount: faker.number.int({ min: 0, max: 5 }),
      ...overrides,
    };
  }

  // ===== NEW FACTORIES FOR EXTENDED TEST COVERAGE =====

  /**
   * Create a TikTok comment matching the lib types
   */
  static createTikTokComment(overrides: Partial<TikTokComment> = {}): TikTokComment {
    const timestamp = overrides.timestamp || new Date();
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      username: faker.internet.username(),
      text: faker.lorem.sentence(),
      timestamp,
      sessionId: faker.string.uuid(),
      ...overrides,
    };
  }

  /**
   * Create multiple TikTok comments
   */
  static createTikTokComments(count: number, sessionId?: string, overrides: Partial<TikTokComment> = {}): TikTokComment[] {
    const baseTimestamp = new Date();
    return Array.from({ length: count }, (_, i) => {
      const timestamp = new Date(baseTimestamp.getTime() + i * 1000); // 1 second apart
      return this.createTikTokComment({
        sessionId: sessionId || faker.string.uuid(),
        timestamp,
        ...overrides,
      });
    });
  }

  /**
   * Create high-volume comment stream for performance testing
   */
  static createHighVolumeTikTokComments(count: number, sessionId: string): TikTokComment[] {
    return this.createTikTokComments(count, sessionId, {
      text: faker.helpers.arrayElement([
        'Hello!',
        'Great stream!',
        'Love this content',
        'Can you answer my question?',
        'Amazing!',
        'Keep going!',
        'This is awesome',
        'Thank you!',
        'Nice work',
        'LOL'
      ])
    });
  }

  /**
   * Create a TikTok event
   */
  static createTikTokEvent(overrides: Partial<TikTokEvent> = {}): TikTokEvent {
    const eventTypes = ['connect', 'disconnect', 'error', 'comment', 'fallback'] as const;
    const eventType = overrides.type || faker.helpers.arrayElement(eventTypes);

    return {
      type: eventType,
      timestamp: new Date(),
      correlationId: faker.string.uuid(),
      latency: faker.number.int({ min: 10, max: 500 }),
      ...overrides,
    };
  }

  /**
   * Create reconnection state data
   */
  static createReconnectionState(overrides: Partial<{
    state: ReconnectionState;
    retryCount: number;
    lastError?: string;
  }> = {}): { state: ReconnectionState; retryCount: number; lastError?: string } {
    const states = Object.values(ReconnectionState);
    return {
      state: faker.helpers.arrayElement(states),
      retryCount: faker.number.int({ min: 0, max: 10 }),
      lastError: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
      ...overrides,
    };
  }

  /**
   * Create circuit breaker state data matching lib types
   */
  static createCircuitBreakerStateTyped(overrides: Partial<{
    state: CircuitBreakerState;
    consecutiveFailures: number;
    totalRequests: number;
  }> = {}): { state: CircuitBreakerState; consecutiveFailures: number; totalRequests: number } {
    const states = Object.values(CircuitBreakerState);
    return {
      state: faker.helpers.arrayElement(states),
      consecutiveFailures: faker.number.int({ min: 0, max: 10 }),
      totalRequests: faker.number.int({ min: 10, max: 1000 }),
      ...overrides,
    };
  }

  /**
   * Create metrics data for testing
   */
  static createMetricsData(overrides: Partial<{
    sessionId: string;
    timestamp: Date;
    eventCount: number;
    errorCount: number;
    reconnectionCount: number;
    averageLatency: number;
    uptime: number;
  }> = {}): {
    sessionId: string;
    timestamp: Date;
    eventCount: number;
    errorCount: number;
    reconnectionCount: number;
    averageLatency: number;
    uptime: number;
  } {
    return {
      sessionId: faker.string.uuid(),
      timestamp: new Date(),
      eventCount: faker.number.int({ min: 0, max: 1000 }),
      errorCount: faker.number.int({ min: 0, max: 50 }),
      reconnectionCount: faker.number.int({ min: 0, max: 10 }),
      averageLatency: faker.number.int({ min: 50, max: 500 }),
      uptime: faker.number.float({ min: 0.8, max: 1.0 }),
      ...overrides,
    };
  }

  /**
   * Create batch event data for testing event batching
   */
  static createEventBatch(count: number, sessionId: string): TikTokEvent[] {
    const baseTimestamp = new Date();
    return Array.from({ length: count }, (_, i) => {
      const timestamp = new Date(baseTimestamp.getTime() + i * 10); // 10ms apart for high frequency
      return this.createTikTokEvent({
        timestamp,
        correlationId: sessionId,
        latency: faker.number.int({ min: 1, max: 50 }),
      });
    });
  }

  /**
   * Create cache entry data for testing metadata cache
   */
  static createCacheEntry(overrides: Partial<{
    key: string;
    data: any;
    expires: number;
  }> = {}): { key: string; data: any; expires: number } {
    return {
      key: faker.lorem.word(),
      data: { testData: faker.lorem.sentence() },
      expires: Date.now() + (5 * 60 * 1000), // 5 minutes TTL
      ...overrides,
    };
  }
}