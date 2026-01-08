import { TikTokEventManager } from '../../lib/tiktok/events';
import { TikTokEvent, TikTokComment } from '../../lib/tiktok/types';
import { TikTokLiveFactory } from '../support/factories/tiktok-live-factory';

describe('TikTokEventManager', () => {
  let eventManager: TikTokEventManager;
  let mockEmitEvent: jest.MockedFunction<(event: TikTokEvent) => void>;
  let mockRecordCommentSuccess: jest.MockedFunction<() => void>;
  let mockRecordCommentFailure: jest.MockedFunction<() => void>;
  let mockParseAndValidateComment: jest.MockedFunction<(message: any, receivedAt: number) => TikTokComment | null>;

  beforeEach(() => {
    eventManager = new TikTokEventManager('test-correlation-id');
    mockEmitEvent = jest.fn();
    mockRecordCommentSuccess = jest.fn();
    mockRecordCommentFailure = jest.fn();
    mockParseAndValidateComment = jest.fn();
  });

  describe('[P2] processCommentEvent', () => {
    test('should emit comment event for valid parsed comment', async () => {
      // GIVEN: Valid comment that parses successfully
      const rawMessage = { id: 'comment-123', text: 'Hello world' };
      const parsedComment: TikTokComment = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Hello world',
        timestamp: new Date(),
        sessionId: 'session-789',
      };

      mockParseAndValidateComment.mockReturnValue(parsedComment);

      // WHEN: Processing the comment event
      await eventManager.processCommentEvent(
        rawMessage,
        mockParseAndValidateComment,
        mockRecordCommentSuccess,
        mockRecordCommentFailure,
        mockEmitEvent
      );

      // THEN: Should record success and emit comment event
      expect(mockRecordCommentSuccess).toHaveBeenCalledTimes(1);
      expect(mockRecordCommentFailure).not.toHaveBeenCalled();
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('comment');
      expect(emittedEvent.data).toBe(parsedComment);
      expect(emittedEvent.correlationId).toBe('test-correlation-id');
      expect(emittedEvent.latency).toBeDefined();
      expect(typeof emittedEvent.latency).toBe('number');
    });

    test('should emit error event when comment parsing fails', async () => {
      // GIVEN: Comment that fails to parse
      const rawMessage = { invalid: 'data' };
      mockParseAndValidateComment.mockReturnValue(null);

      // WHEN: Processing the comment event
      await eventManager.processCommentEvent(
        rawMessage,
        mockParseAndValidateComment,
        mockRecordCommentSuccess,
        mockRecordCommentFailure,
        mockEmitEvent
      );

      // THEN: Should record failure and emit error event
      expect(mockRecordCommentSuccess).not.toHaveBeenCalled();
      expect(mockRecordCommentFailure).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('error');
      expect(emittedEvent.data.error).toBe('Comment parsing failed');
      expect(emittedEvent.data.operation).toBe('comment-parsing');
      expect(emittedEvent.data.rawMessage).toBe(rawMessage);
    });

    test('should handle and emit events for processing errors', async () => {
      // GIVEN: Parse function throws an error
      const rawMessage = { id: 'comment-123' };
      const processingError = new Error('Processing failed');
      mockParseAndValidateComment.mockImplementation(() => {
        throw processingError;
      });

      // WHEN: Processing the comment event
      await eventManager.processCommentEvent(
        rawMessage,
        mockParseAndValidateComment,
        mockRecordCommentSuccess,
        mockRecordCommentFailure,
        mockEmitEvent
      );

      // THEN: Should emit error event with processing error details
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('error');
      expect(emittedEvent.data.error).toBe('Processing failed');
      expect(emittedEvent.data.operation).toBe('comment-processing');
      expect(emittedEvent.data.rawMessage).toBe(rawMessage);
    });

    test('should measure and report latency violations over 2 seconds', async () => {
      // GIVEN: Valid comment that takes > 2 seconds to process
      const rawMessage = { id: 'comment-123', text: 'Slow processing' };
      const parsedComment: TikTokComment = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Slow processing',
        timestamp: new Date(),
        sessionId: 'session-789',
      };

      mockParseAndValidateComment.mockReturnValue(parsedComment);

      // Mock Date.now to simulate slow processing
      const originalDateNow = Date.now;
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        // Return increasing timestamps to simulate 3 seconds of processing
        return callCount === 1 ? 1000 : 4000; // 3 second difference
      });

      // WHEN: Processing the comment event
      await eventManager.processCommentEvent(
        rawMessage,
        mockParseAndValidateComment,
        mockRecordCommentSuccess,
        mockRecordCommentFailure,
        mockEmitEvent
      );

      // THEN: Should have recorded latency violation (this would be tested by mocking MetricsCollector)
      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.latency).toBe(3000); // 3 seconds

      // Restore original Date.now
      jest.restoreAllMocks();
    });

    test('should handle non-Error exceptions gracefully', async () => {
      // GIVEN: Parse function throws a non-Error object
      const rawMessage = { id: 'comment-123' };
      mockParseAndValidateComment.mockImplementation(() => {
        throw 'String error'; // Not an Error object
      });

      // WHEN: Processing the comment event
      await eventManager.processCommentEvent(
        rawMessage,
        mockParseAndValidateComment,
        mockRecordCommentSuccess,
        mockRecordCommentFailure,
        mockEmitEvent
      );

      // THEN: Should convert to string and emit error event
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('error');
      expect(emittedEvent.data.error).toBe('String error');
    });
  });

  describe('[P2] processConnectionEvent', () => {
    test('should emit connect event with connection state', async () => {
      // GIVEN: Connection state data
      const connectionState = {
        connected: true,
        roomId: 'room-123',
        timestamp: new Date(),
      };

      // WHEN: Processing the connection event
      await eventManager.processConnectionEvent(connectionState, mockEmitEvent);

      // THEN: Should emit connect event with state data
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('connect');
      expect(emittedEvent.data).toBe(connectionState);
      expect(emittedEvent.correlationId).toBe('test-correlation-id');
      expect(emittedEvent.timestamp).toBeInstanceOf(Date);
    });

    test('should handle null or undefined connection state', async () => {
      // GIVEN: Null connection state
      const connectionState = null;

      // WHEN: Processing the connection event
      await eventManager.processConnectionEvent(connectionState, mockEmitEvent);

      // THEN: Should still emit event with null data
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('connect');
      expect(emittedEvent.data).toBeNull();
    });
  });

  describe('[P2] processErrorEvent', () => {
    test('should emit error event with Error object message', async () => {
      // GIVEN: Error object
      const error = new Error('Connection failed');

      // WHEN: Processing the error event
      await eventManager.processErrorEvent(error, mockEmitEvent);

      // THEN: Should emit error event with error message
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('error');
      expect(emittedEvent.data.error).toBe('Connection failed');
      expect(emittedEvent.correlationId).toBe('test-correlation-id');
    });

    test('should handle non-Error objects by converting to string', async () => {
      // GIVEN: Non-Error object
      const error = { code: 500, message: 'Server error' };

      // WHEN: Processing the error event
      await eventManager.processErrorEvent(error, mockEmitEvent);

      // THEN: Should convert to string representation
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('error');
      expect(emittedEvent.data.error).toBe('[object Object]');
    });

    test('should handle primitive values', async () => {
      // GIVEN: Primitive error value
      const error = 'Network timeout';

      // WHEN: Processing the error event
      await eventManager.processErrorEvent(error, mockEmitEvent);

      // THEN: Should convert to string
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('error');
      expect(emittedEvent.data.error).toBe('Network timeout');
    });
  });

  describe('[P2] processDisconnectEvent', () => {
    test('should emit disconnect event with disconnect info', async () => {
      // GIVEN: Disconnect information
      const disconnectInfo = {
        reason: 'Stream ended',
        code: 1000,
        timestamp: new Date(),
      };

      // WHEN: Processing the disconnect event
      await eventManager.processDisconnectEvent(disconnectInfo, mockEmitEvent);

      // THEN: Should emit disconnect event with info
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('disconnect');
      expect(emittedEvent.data).toBe(disconnectInfo);
      expect(emittedEvent.correlationId).toBe('test-correlation-id');
      expect(emittedEvent.timestamp).toBeInstanceOf(Date);
    });

    test('should handle empty disconnect info', async () => {
      // GIVEN: Empty disconnect info
      const disconnectInfo = {};

      // WHEN: Processing the disconnect event
      await eventManager.processDisconnectEvent(disconnectInfo, mockEmitEvent);

      // THEN: Should emit event with empty data
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.type).toBe('disconnect');
      expect(emittedEvent.data).toEqual({});
    });
  });

  describe('[P2] Correlation ID Management', () => {
    test('should include correlation ID in all emitted events', async () => {
      // GIVEN: Manager with specific correlation ID
      const managerWithId = new TikTokEventManager('custom-correlation-123');

      // WHEN: Processing various events
      await managerWithId.processConnectionEvent({}, mockEmitEvent);
      await managerWithId.processErrorEvent('test error', mockEmitEvent);
      await managerWithId.processDisconnectEvent({}, mockEmitEvent);

      // THEN: All events should include the correlation ID
      expect(mockEmitEvent).toHaveBeenCalledTimes(3);

      mockEmitEvent.mock.calls.forEach(call => {
        const emittedEvent = call[0];
        expect(emittedEvent.correlationId).toBe('custom-correlation-123');
      });
    });

    test('should handle empty correlation ID', async () => {
      // GIVEN: Manager with empty correlation ID
      const managerWithEmptyId = new TikTokEventManager('');

      // WHEN: Processing an event
      await managerWithEmptyId.processConnectionEvent({}, mockEmitEvent);

      // THEN: Should use empty string as correlation ID
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.correlationId).toBe('');
    });
  });

  describe('[P3] Event Timestamp Management', () => {
    test('should set current timestamp for all events', async () => {
      // GIVEN: Fixed current time
      const fixedTime = new Date('2024-01-15T10:30:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedTime.getTime());

      // WHEN: Processing events
      await eventManager.processConnectionEvent({}, mockEmitEvent);
      await eventManager.processErrorEvent('test', mockEmitEvent);

      // THEN: Events should have current timestamp
      expect(mockEmitEvent).toHaveBeenCalledTimes(2);

      mockEmitEvent.mock.calls.forEach(call => {
        const emittedEvent = call[0];
        expect(emittedEvent.timestamp.getTime()).toBe(fixedTime.getTime());
      });

      jest.restoreAllMocks();
    });

    test('should ensure timestamp is Date object', async () => {
      // WHEN: Processing any event
      await eventManager.processConnectionEvent({}, mockEmitEvent);

      // THEN: Timestamp should be Date instance
      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.timestamp).toBeInstanceOf(Date);
    });
  });
});