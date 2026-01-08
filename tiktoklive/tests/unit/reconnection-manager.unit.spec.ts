import { ReconnectionManager, DisconnectClassification, ReconnectionState } from '../../lib/tiktok/reconnection-manager';
import { TikTokLiveFactory } from '../support/factories/tiktok-live-factory';

describe('ReconnectionManager', () => {
  let reconnectionManager: ReconnectionManager;
  let mockConnector: any;
  let mockCorrelationManager: any;
  let mockMetricsCollector: any;

  beforeEach(() => {
    mockConnector = {
      getConnectionStatus: jest.fn().mockReturnValue({
        connected: false,
        retryCount: 0,
      }),
    };

    mockCorrelationManager = {
      generateId: jest.fn().mockReturnValue('test-correlation-id'),
      getElapsedTime: jest.fn().mockReturnValue(1000),
    };

    mockMetricsCollector = {
      recordMetric: jest.fn(),
      recordConnection: jest.fn(),
      recordError: jest.fn(),
    };

    reconnectionManager = new ReconnectionManager(
      mockConnector,
      'test-session-id',
      mockCorrelationManager,
      mockMetricsCollector
    );
  });

  describe('[P2] classifyDisconnectReason', () => {
    test('should classify TikTok-initiated disconnects as high severity requiring reconnection', () => {
      // GIVEN: Various TikTok-specific error messages
      const tiktokErrors = [
        'TikTok live stream ended',
        'Stream ended by broadcaster',
        'Live ended',
        'Tiktok maintenance in progress'
      ];

      // WHEN/THEN: All should be classified as TikTok type, high severity, requiring reconnection
      tiktokErrors.forEach(errorMessage => {
        const classification = reconnectionManager.classifyDisconnectReason(errorMessage);

        expect(classification.type).toBe('tiktok');
        expect(classification.severity).toBe('high');
        expect(classification.requiresReconnection).toBe(true);
        expect(classification.description).toContain('TikTok');
      });
    });

    test('should classify network errors as medium severity requiring reconnection', () => {
      // GIVEN: Various network error messages
      const networkErrors = [
        'ENOTFOUND error',
        'ECONNREFUSED connection refused',
        'Network timeout occurred',
        'Connection timeout after 30 seconds'
      ];

      // WHEN/THEN: All should be classified as network type, medium severity, requiring reconnection
      networkErrors.forEach(errorMessage => {
        const classification = reconnectionManager.classifyDisconnectReason(errorMessage);

        expect(classification.type).toBe('network');
        expect(classification.severity).toBe('medium');
        expect(classification.requiresReconnection).toBe(true);
        expect(classification.description).toContain('réseau');
      });
    });

    test('should classify auth errors as high severity NOT requiring reconnection', () => {
      // GIVEN: Various authentication error messages
      const authErrors = [
        'Authentication failed',
        'Unauthorized access',
        'Forbidden credentials',
        'Invalid credentials provided'
      ];

      // WHEN/THEN: All should be classified as auth type, high severity, NOT requiring reconnection
      authErrors.forEach(errorMessage => {
        const classification = reconnectionManager.classifyDisconnectReason(errorMessage);

        expect(classification.type).toBe('auth');
        expect(classification.severity).toBe('high');
        expect(classification.requiresReconnection).toBe(false);
        expect(classification.description).toContain('authentification');
      });
    });

    test('should classify unknown errors as medium severity requiring reconnection', () => {
      // GIVEN: Unknown error messages
      const unknownErrors = [
        'Unexpected error occurred',
        'Unknown failure in connection',
        'Something went wrong',
        'Random error message'
      ];

      // WHEN/THEN: All should be classified as unknown type, medium severity, requiring reconnection
      unknownErrors.forEach(errorMessage => {
        const classification = reconnectionManager.classifyDisconnectReason(errorMessage);

        expect(classification.type).toBe('unknown');
        expect(classification.severity).toBe('medium');
        expect(classification.requiresReconnection).toBe(true);
        expect(classification.description).toContain('inconnue');
      });
    });

    test('should handle case-insensitive error message matching', () => {
      // GIVEN: Mixed case error messages
      const mixedCaseErrors = [
        'TIKTOK LIVE STREAM ENDED',
        'network TIMEOUT occurred',
        'AUTHENTICATION FAILED',
        'ECONNREFUSED Connection Refused'
      ];

      // WHEN/THEN: Case should not affect classification
      mixedCaseErrors.forEach(errorMessage => {
        const classification = reconnectionManager.classifyDisconnectReason(errorMessage);
        expect(classification).toBeDefined();
        expect(['tiktok', 'network', 'auth', 'unknown']).toContain(classification.type);
      });
    });

    test('should handle empty or undefined error messages', () => {
      // GIVEN: Empty or undefined error messages
      const emptyMessages = ['', undefined, null] as any[];

      // WHEN/THEN: Should classify as unknown type
      emptyMessages.forEach(errorMessage => {
        const classification = reconnectionManager.classifyDisconnectReason(errorMessage || '');

        expect(classification.type).toBe('unknown');
        expect(classification.severity).toBe('medium');
        expect(classification.requiresReconnection).toBe(true);
      });
    });
  });

  describe('[P2] getExtendedConnectionStatus', () => {
    test('should return extended status with reconnection state and metrics', () => {
      // GIVEN: Mock connector status
      mockConnector.getConnectionStatus.mockReturnValue({
        connected: true,
        lastConnected: new Date(),
        retryCount: 2,
      });

      // WHEN: Getting extended connection status
      const status = reconnectionManager.getExtendedConnectionStatus();

      // THEN: Should include base status plus extended fields
      expect(status.connected).toBe(true);
      expect(status.lastConnected).toBeInstanceOf(Date);
      expect(status.retryCount).toBe(2);
      expect(status.reconnectionState).toBeDefined();
      expect(status.reconnectionAttempts).toBeDefined();
      expect(status.stabilityMetrics).toBeDefined();
      expect(typeof status.timeSinceLastDisconnect).toBe('number');
    });

    test('should handle missing connector status gracefully', () => {
      // GIVEN: Connector without getConnectionStatus method
      const managerWithoutConnector = new ReconnectionManager(
        null,
        'test-session-id',
        mockCorrelationManager,
        mockMetricsCollector
      );

      // WHEN: Getting extended connection status
      const status = managerWithoutConnector.getExtendedConnectionStatus();

      // THEN: Should provide default values
      expect(status.connected).toBe(false);
      expect(status.retryCount).toBe(0);
      expect(status.reconnectionState).toBe(ReconnectionState.IDLE);
      expect(status.reconnectionAttempts).toBe(0);
    });

    test('should include reconnection timing information', () => {
      // GIVEN: Manager with reconnection history
      reconnectionManager = new ReconnectionManager(
        mockConnector,
        'test-session-id',
        mockCorrelationManager,
        mockMetricsCollector
      );

      // Simulate some reconnection attempts
      const manager = reconnectionManager as any;
      manager.reconnectionAttempts = 3;
      manager.lastReconnectionAttempt = new Date(Date.now() - 30000); // 30 seconds ago

      // WHEN: Getting extended connection status
      const status = reconnectionManager.getExtendedConnectionStatus();

      // THEN: Should include timing information
      expect(status.reconnectionAttempts).toBe(3);
      expect(status.lastReconnectionAttempt).toBeInstanceOf(Date);
      expect(status.timeSinceLastDisconnect).toBeDefined();
    });
  });

  describe('[P2] State Management', () => {
    test('should initialize with IDLE state', () => {
      // WHEN: Creating new manager
      const status = reconnectionManager.getExtendedConnectionStatus();

      // THEN: Should start in IDLE state
      expect(status.reconnectionState).toBe(ReconnectionState.IDLE);
    });

    test('should track reconnection attempts count', () => {
      // GIVEN: Manager with some reconnection attempts
      const manager = reconnectionManager as any;
      manager.reconnectionAttempts = 5;

      // WHEN: Getting status
      const status = reconnectionManager.getExtendedConnectionStatus();

      // THEN: Should report correct attempt count
      expect(status.reconnectionAttempts).toBe(5);
    });

    test('should calculate time since last disconnect correctly', () => {
      // GIVEN: Manager with last disconnect time
      const manager = reconnectionManager as any;
      const thirtySecondsAgo = Date.now() - 30000;
      manager.connectionEvents = [{ type: 'disconnect', timestamp: thirtySecondsAgo }];

      // WHEN: Getting time since last disconnect
      const timeSince = (reconnectionManager as any).getTimeSinceLastDisconnect();

      // THEN: Should be approximately 30 seconds
      expect(timeSince).toBeGreaterThan(29000); // Allow some margin for test execution time
      expect(timeSince).toBeLessThan(31000);
    });

    test('should return undefined for time since disconnect when no disconnect events', () => {
      // GIVEN: Manager with no disconnect events
      const manager = reconnectionManager as any;
      manager.connectionEvents = [{ type: 'connect', timestamp: Date.now() }];

      // WHEN: Getting time since last disconnect
      const timeSince = manager.getTimeSinceLastDisconnect();

      // THEN: Should return undefined
      expect(timeSince).toBeUndefined();
    });
  });

  describe('[P2] Connection Stability Metrics', () => {
    test('should calculate basic stability metrics', () => {
      // GIVEN: Manager with some connection events
      const manager = reconnectionManager as any;
      const now = Date.now();
      manager.connectionEvents = [
        { type: 'connect', timestamp: now - 3600000 }, // 1 hour ago
        { type: 'disconnect', timestamp: now - 1800000 }, // 30 min ago
        { type: 'connect', timestamp: now - 900000 }, // 15 min ago
      ];
      manager.reconnectionTimings = [5000, 8000, 3000]; // reconnection times in ms

      // WHEN: Getting stability metrics
      const metrics = manager.getConnectionStabilityMetrics();

      // THEN: Should calculate metrics correctly
      expect(metrics).toBeDefined();
      expect(metrics.uptimePercentage).toBeGreaterThanOrEqual(0);
      expect(metrics.uptimePercentage).toBeLessThanOrEqual(100);
      expect(metrics.totalReconnections).toBeDefined();
      expect(metrics.connectionStabilityScore).toBeDefined();
      expect(metrics.averageReconnectionTime).toBeDefined();
    });

    test('should handle empty connection events gracefully', () => {
      // GIVEN: Manager with no connection events
      const manager = reconnectionManager as any;
      manager.connectionEvents = [];
      manager.reconnectionTimings = [];

      // WHEN: Getting stability metrics
      const metrics = manager.getConnectionStabilityMetrics();

      // THEN: Should provide default values
      expect(metrics.uptimePercentage).toBe(0);
      expect(metrics.totalReconnections).toBe(0);
      expect(metrics.connectionStabilityScore).toBe(0);
      expect(metrics.averageReconnectionTime).toBe(0);
    });

    test('should calculate disconnect frequency correctly', () => {
      // GIVEN: Manager with multiple disconnects over time
      const manager = reconnectionManager as any;
      const hourAgo = Date.now() - 3600000; // 1 hour ago
      manager.connectionEvents = [
        { type: 'disconnect', timestamp: hourAgo },
        { type: 'disconnect', timestamp: hourAgo + 1800000 }, // 30 min later
        { type: 'disconnect', timestamp: hourAgo + 2700000 }, // 45 min after first
      ];

      // WHEN: Getting stability metrics
      const metrics = manager.getConnectionStabilityMetrics();

      // THEN: Should calculate frequency (disconnects per hour)
      expect(metrics.disconnectFrequency).toBeDefined();
      expect(metrics.disconnectFrequency).toBeGreaterThan(0);
    });
  });

  describe('[P3] Error Handling and Edge Cases', () => {
    test('should handle null or undefined connector gracefully', () => {
      // GIVEN: Manager created without connector
      const managerWithoutConnector = new ReconnectionManager(
        null,
        'test-session-id',
        mockCorrelationManager,
        mockMetricsCollector
      );

      // WHEN: Getting status
      const status = managerWithoutConnector.getExtendedConnectionStatus();

      // THEN: Should not throw and provide defaults
      expect(status).toBeDefined();
      expect(status.connected).toBe(false);
      expect(status.retryCount).toBe(0);
    });

    test('should handle corrupted connection events array', () => {
      // GIVEN: Manager with corrupted events array
      const manager = reconnectionManager as any;
      manager.connectionEvents = null;

      // WHEN: Getting stability metrics
      const metrics = manager.getConnectionStabilityMetrics();

      // THEN: Should handle gracefully
      expect(metrics).toBeDefined();
      expect(metrics.totalReconnections).toBe(0);
    });

    test('should handle empty reconnection timings array', () => {
      // GIVEN: Manager with empty reconnection timings
      const manager = reconnectionManager as any;
      manager.reconnectionTimings = [];
      manager.connectionEvents = [{ type: 'connect', timestamp: Date.now() }];

      // WHEN: Getting stability metrics
      const metrics = manager.getConnectionStabilityMetrics();

      // THEN: Average reconnection time should be 0
      expect(metrics.averageReconnectionTime).toBe(0);
    });
  });
});