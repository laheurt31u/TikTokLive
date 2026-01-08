import { test, expect } from '../support/fixtures';
import { TikTokConnector } from '../../lib/tiktok/connector';

test.describe('TikTok Connector API Tests', () => {
  test('[P0] should initialize connector with valid credentials', async ({ authenticatedUser }) => {
    // GIVEN: Valid TikTok session credentials
    const sessionId = 'test_session_123456789';
    const cookies = 'sessionid=abc123def456; user_id=12345; tt_csrf_token=xyz789abc';

    // WHEN: Connector is initialized
    const connector = new TikTokConnector();
    await connector.initialize(sessionId, cookies);

    // THEN: Connector is properly configured
    expect(connector).toBeDefined();
    expect(connector.getConnectionStatus().connected).toBe(false); // Not connected yet

    // AND: Correlation ID is generated
    expect(connector.getCorrelationId()).toBeDefined();
    expect(typeof connector.getCorrelationId()).toBe('string');
  });

  test('[P0] should establish connection to TikTok Live API', async ({ authenticatedUser }) => {
    // GIVEN: Initialized connector
    const connector = new TikTokConnector();
    await connector.initialize('test_session_123', 'sessionid=abc123; user_id=123');

    // WHEN: Connection is established
    await connector.connect();

    // THEN: Connection status is updated
    const status = connector.getConnectionStatus();
    expect(status.connected).toBe(true);
    expect(status.lastConnected).toBeDefined();
    expect(status.retryCount).toBe(0);
  });

  test('[P0] should handle connection failures gracefully', async ({ authenticatedUser }) => {
    // GIVEN: Connector with invalid credentials
    const connector = new TikTokConnector();
    await connector.initialize('invalid_session', 'invalid=cookies');

    // WHEN: Connection attempt fails
    await expect(connector.connect()).rejects.toThrow();

    // THEN: Connection status reflects failure
    const status = connector.getConnectionStatus();
    expect(status.connected).toBe(false);
    expect(status.lastError).toBeDefined();
    expect(status.retryCount).toBeGreaterThan(0);
  });

  test('[P0] should parse and validate chat messages', async ({ authenticatedUser }) => {
    // GIVEN: Connected connector receiving chat messages
    const connector = new TikTokConnector();
    await connector.initialize('test_session_123', 'sessionid=abc123; user_id=123');
    await connector.connect();

    let receivedMessage: any = null;
    connector.onMessage((message) => {
      receivedMessage = message;
    });

    // WHEN: Valid chat message is received (simulated)
    const testMessage = {
      userId: 'user123',
      username: 'TestUser',
      content: 'La réponse est Paris',
      timestamp: new Date(),
      type: 'comment'
    };

    // Simulate message reception
    connector.simulateMessage(testMessage);

    // THEN: Message is properly parsed and validated
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.userId).toBe('user123');
    expect(receivedMessage.username).toBe('TestUser');
    expect(receivedMessage.content).toBe('La réponse est Paris');
    expect(receivedMessage.isValid).toBe(true);
  });

  test('[P0] should identify first correct answer as winner', async ({ quizSession }) => {
    // GIVEN: Active quiz session with multiple participants
    const connector = new TikTokConnector();
    await connector.initialize('test_session_123', 'sessionid=abc123; user_id=123');
    await connector.connect();

    let winnerIdentified: any = null;
    connector.onWinner((winner) => {
      winnerIdentified = winner;
    });

    // WHEN: Multiple answers are received
    const answers = [
      { userId: 'user1', username: 'Alice', content: 'Madrid', timestamp: new Date() },
      { userId: 'user2', username: 'Bob', content: quizSession.currentQuestion.answers[quizSession.currentQuestion.correctAnswer], timestamp: new Date() },
      { userId: 'user3', username: 'Charlie', content: quizSession.currentQuestion.answers[quizSession.currentQuestion.correctAnswer], timestamp: new Date() }
    ];

    // Simulate receiving answers in sequence
    for (const answer of answers) {
      connector.simulateMessage({
        ...answer,
        type: 'comment',
        isAnswer: true
      });
    }

    // THEN: First correct answer wins
    expect(winnerIdentified).toBeDefined();
    expect(winnerIdentified.userId).toBe('user2'); // Bob was first with correct answer
    expect(winnerIdentified.username).toBe('Bob');
    expect(winnerIdentified.isWinner).toBe(true);
  });

  test('[P1] should implement rate limiting for quiz answers', async ({ quizSession }) => {
    // GIVEN: Active quiz session
    const connector = new TikTokConnector();
    await connector.initialize('test_session_123', 'sessionid=abc123; user_id=123');
    await connector.connect();

    let rateLimitedMessages: any[] = [];
    connector.onRateLimited((message) => {
      rateLimitedMessages.push(message);
    });

    // WHEN: Same user sends multiple answers rapidly
    const userId = 'user123';
    const answers = [
      { userId, username: 'Alice', content: 'Paris', timestamp: new Date() },
      { userId, username: 'Alice', content: 'Madrid', timestamp: new Date() }, // Same user, different answer
      { userId, username: 'Alice', content: 'Rome', timestamp: new Date() }    // Same user again
    ];

    for (const answer of answers) {
      connector.simulateMessage({
        ...answer,
        type: 'comment',
        isAnswer: true
      });
    }

    // THEN: Rate limiting prevents multiple answers from same user
    expect(rateLimitedMessages.length).toBeGreaterThan(0);
    expect(rateLimitedMessages[0].userId).toBe(userId);
    expect(rateLimitedMessages[0].reason).toContain('rate limit');
  });

  test('[P1] should trigger circuit breaker on consecutive failures', async ({ authenticatedUser }) => {
    // GIVEN: Connector configured with circuit breaker
    const connector = new TikTokConnector();
    await connector.initialize('test_session_123', 'sessionid=abc123; user_id=123');

    // WHEN: Multiple consecutive connection failures occur
    for (let i = 0; i < 5; i++) {
      try {
        await connector.connect();
      } catch (error) {
        // Expected failure
      }
    }

    // THEN: Circuit breaker opens
    const circuitStatus = connector.getCircuitBreakerStatus();
    expect(circuitStatus.state).toBe('OPEN');

    // AND: Further requests are blocked
    await expect(connector.connect()).rejects.toThrow('Circuit breaker is OPEN');
  });

  test('[P1] should collect and expose connection metrics', async ({ authenticatedUser }) => {
    // GIVEN: Active connector
    const connector = new TikTokConnector();
    await connector.initialize('test_session_123', 'sessionid=abc123; user_id=123');
    await connector.connect();

    // WHEN: Various operations occur
    connector.simulateMessage({ userId: 'user1', username: 'Alice', content: 'Hello', type: 'comment' });
    connector.simulateMessage({ userId: 'user2', username: 'Bob', content: 'Answer', type: 'comment', isAnswer: true });

    // THEN: Metrics are collected and accessible
    const metrics = connector.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.totalMessages).toBeGreaterThan(0);
    expect(metrics.correctAnswers).toBeGreaterThanOrEqual(0);
    expect(metrics.connectionUptime).toBeDefined();
    expect(metrics.averageResponseTime).toBeGreaterThan(0);
  });

  test('[P2] should validate cookie parsing and session data', async ({ authenticatedUser }) => {
    // GIVEN: Various cookie formats
    const testCases = [
      {
        cookies: 'sessionid=abc123; user_id=456',
        expected: { sessionid: 'abc123', user_id: '456' }
      },
      {
        cookies: 'sessionid=def456;user_id=789; tt_csrf_token=xyz123',
        expected: { sessionid: 'def456', user_id: '789', tt_csrf_token: 'xyz123' }
      },
      {
        cookies: 'invalid format with spaces= value ',
        expected: { 'invalid format with spaces': 'value' }
      }
    ];

    for (const testCase of testCases) {
      // WHEN: Cookies are parsed
      const connector = new TikTokConnector();
      const parsedCookies = (connector as any).parseCookies(testCase.cookies);

      // THEN: Cookies are correctly parsed
      expect(parsedCookies).toEqual(testCase.expected);
    }
  });

  test('[P2] should handle malformed messages gracefully', async ({ authenticatedUser }) => {
    // GIVEN: Connected connector
    const connector = new TikTokConnector();
    await connector.initialize('test_session_123', 'sessionid=abc123; user_id=123');
    await connector.connect();

    let errorCount = 0;
    connector.onError(() => {
      errorCount++;
    });

    // WHEN: Malformed messages are received
    const malformedMessages = [
      { type: 'comment' }, // Missing required fields
      { userId: 'user1', content: null, type: 'comment' }, // Null content
      { userId: 'user1', username: '', content: '', type: 'invalid' } // Empty fields
    ];

    for (const message of malformedMessages) {
      connector.simulateMessage(message);
    }

    // THEN: Malformed messages are handled without crashing
    expect(errorCount).toBeGreaterThan(0);

    // AND: Connection remains stable
    const status = connector.getConnectionStatus();
    expect(status.connected).toBe(true);
  });
});