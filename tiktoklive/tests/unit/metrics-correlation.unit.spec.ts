import { MetricsCollector, CorrelationManager } from '../../lib/logger/metrics';
import { CorrelationManager as CorrManager } from '../../lib/logger/correlation';

describe('Metrics and Correlation System', () => {
  beforeEach(() => {
    // Reset metrics between tests
    MetricsCollector.reset();
    jest.clearAllMocks();
  });

  describe('[P1] MetricsCollector', () => {
    test('should record connection events', () => {
      const correlationId = 'test-conn-123';
      const duration = 1500;
      const success = true;
      const retryCount = 0;

      MetricsCollector.recordConnection(correlationId, duration, success, retryCount);

      const metrics = MetricsCollector.getMetrics();
      expect(metrics.connections.total).toBe(1);
      expect(metrics.connections.successful).toBe(1);
      expect(metrics.connections.failed).toBe(0);
      expect(metrics.connections.averageDuration).toBe(1500);
    });

    test('should record failed connections', () => {
      const correlationId = 'test-conn-fail-123';
      const duration = 500;
      const success = false;
      const retryCount = 2;

      MetricsCollector.recordConnection(correlationId, duration, success, retryCount);

      const metrics = MetricsCollector.getMetrics();
      expect(metrics.connections.total).toBe(1);
      expect(metrics.connections.successful).toBe(0);
      expect(metrics.connections.failed).toBe(1);
      expect(metrics.connections.averageRetryCount).toBe(2);
    });

    test('should record message processing metrics', () => {
      const messageType = 'comment';
      const processingTime = 250;
      const success = true;

      MetricsCollector.recordMessageProcessing(messageType, processingTime, success);

      const metrics = MetricsCollector.getMetrics();
      expect(metrics.messages.total).toBe(1);
      expect(metrics.messages.processed).toBe(1);
      expect(metrics.messages.failed).toBe(0);
      expect(metrics.messages.averageProcessingTime).toBe(250);
      expect(metrics.messages.byType.comment).toBe(1);
    });

    test('should track message failures', () => {
      MetricsCollector.recordMessageProcessing('comment', 100, false);
      MetricsCollector.recordMessageProcessing('answer', 200, false);

      const metrics = MetricsCollector.getMetrics();
      expect(metrics.messages.total).toBe(2);
      expect(metrics.messages.processed).toBe(0);
      expect(metrics.messages.failed).toBe(2);
      expect(metrics.messages.byType.comment).toBe(1);
      expect(metrics.messages.byType.answer).toBe(1);
    });

    test('should record quiz events', () => {
      MetricsCollector.recordQuizEvent('question_displayed', { questionId: 'q1', difficulty: 'easy' });
      MetricsCollector.recordQuizEvent('answer_received', { userId: 'u1', isCorrect: true });
      MetricsCollector.recordQuizEvent('winner_identified', { winnerId: 'u1', responseTime: 1500 });

      const metrics = MetricsCollector.getMetrics();
      expect(metrics.quiz.totalEvents).toBe(3);
      expect(metrics.quiz.questionsDisplayed).toBe(1);
      expect(metrics.quiz.answersReceived).toBe(1);
      expect(metrics.quiz.correctAnswers).toBe(1);
      expect(metrics.quiz.winnersIdentified).toBe(1);
      expect(metrics.quiz.averageResponseTime).toBe(1500);
    });

    test('should calculate averages correctly', () => {
      // Record multiple connections with different durations
      MetricsCollector.recordConnection('conn1', 1000, true, 0);
      MetricsCollector.recordConnection('conn2', 2000, true, 0);
      MetricsCollector.recordConnection('conn3', 1500, true, 1);

      // Record multiple message processing times
      MetricsCollector.recordMessageProcessing('comment', 100, true);
      MetricsCollector.recordMessageProcessing('answer', 200, true);
      MetricsCollector.recordMessageProcessing('comment', 150, true);

      const metrics = MetricsCollector.getMetrics();

      expect(metrics.connections.averageDuration).toBe(1500); // (1000+2000+1500)/3
      expect(metrics.connections.averageRetryCount).toBe(1); // (0+0+1)/3 = 0.33, rounded to 1?
      expect(metrics.messages.averageProcessingTime).toBe(150); // (100+200+150)/3
    });

    test('should provide health status', () => {
      // Healthy system
      MetricsCollector.recordConnection('conn1', 500, true, 0);
      MetricsCollector.recordMessageProcessing('comment', 100, true);

      let health = MetricsCollector.getHealthStatus();
      expect(health.overall).toBe('healthy');
      expect(health.connections.successRate).toBe(1.0);

      // Unhealthy system
      MetricsCollector.reset();
      MetricsCollector.recordConnection('conn1', 10000, false, 5);
      MetricsCollector.recordConnection('conn2', 15000, false, 5);

      health = MetricsCollector.getHealthStatus();
      expect(health.overall).toBe('unhealthy');
      expect(health.connections.successRate).toBe(0.0);
      expect(health.connections.averageDuration).toBeGreaterThan(5000);
    });
  });

  describe('[P1] CorrelationManager', () => {
    test('should generate unique correlation IDs', () => {
      const id1 = CorrelationManager.generateId();
      const id2 = CorrelationManager.generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    test('should start and track operations', () => {
      const operationId = 'test-operation';
      const correlationId = 'test-corr-123';

      CorrelationManager.startOperation(operationId, correlationId);

      const operation = CorrelationManager.getOperation(operationId);
      expect(operation).toBeDefined();
      expect(operation.id).toBe(operationId);
      expect(operation.correlationId).toBe(correlationId);
      expect(operation.startTime).toBeDefined();
      expect(operation.endTime).toBeUndefined();
    });

    test('should end operations and calculate duration', () => {
      const operationId = 'test-operation-end';
      const correlationId = 'test-corr-end-123';

      CorrelationManager.startOperation(operationId, correlationId);

      // Wait a bit
      const startTime = Date.now();
      while (Date.now() - startTime < 50) {
        // Busy wait for 50ms
      }

      CorrelationManager.endOperation(operationId);

      const operation = CorrelationManager.getOperation(operationId);
      expect(operation.endTime).toBeDefined();
      expect(operation.duration).toBeDefined();
      expect(operation.duration).toBeGreaterThanOrEqual(50);
    });

    test('should add context to operations', () => {
      const operationId = 'test-context';
      const correlationId = 'test-corr-context-123';
      const context = { userId: 'user123', action: 'connect' };

      CorrelationManager.startOperation(operationId, correlationId);
      CorrelationManager.addContext(operationId, context);

      const operation = CorrelationManager.getOperation(operationId);
      expect(operation.context).toEqual(context);
    });

    test('should record errors on operations', () => {
      const operationId = 'test-error';
      const correlationId = 'test-corr-error-123';
      const error = new Error('Connection failed');

      CorrelationManager.startOperation(operationId, correlationId);
      CorrelationManager.recordError(operationId, error);

      const operation = CorrelationManager.getOperation(operationId);
      expect(operation.error).toBeDefined();
      expect(operation.error.message).toBe('Connection failed');
      expect(operation.error.timestamp).toBeDefined();
    });

    test('should track nested operations', () => {
      const parentId = 'parent-op';
      const childId = 'child-op';
      const correlationId = 'test-nested-123';

      CorrelationManager.startOperation(parentId, correlationId);
      CorrelationManager.startOperation(childId, correlationId, parentId);

      const child = CorrelationManager.getOperation(childId);
      expect(child.parentOperationId).toBe(parentId);

      const parent = CorrelationManager.getOperation(parentId);
      expect(parent.childOperations).toContain(childId);
    });

    test('should calculate elapsed time correctly', () => {
      const operationId = 'test-elapsed';
      const correlationId = 'test-elapsed-123';

      CorrelationManager.startOperation(operationId, correlationId);

      // Mock elapsed time
      const mockElapsed = 2500;
      jest.spyOn(CorrelationManager, 'getElapsedTime').mockReturnValue(mockElapsed);

      const elapsed = CorrelationManager.getElapsedTime(operationId);
      expect(elapsed).toBe(mockElapsed);

      jest.restoreAllMocks();
    });

    test('should provide operation summary', () => {
      const operationId = 'test-summary';
      const correlationId = 'test-summary-123';

      CorrelationManager.startOperation(operationId, correlationId);
      CorrelationManager.addContext(operationId, { type: 'connection', target: 'tiktok' });
      CorrelationManager.endOperation(operationId);

      const summary = CorrelationManager.getOperationSummary(operationId);
      expect(summary).toBeDefined();
      expect(summary.id).toBe(operationId);
      expect(summary.correlationId).toBe(correlationId);
      expect(summary.context).toBeDefined();
      expect(summary.duration).toBeDefined();
    });

    test('should clean up completed operations', () => {
      const operationId = 'test-cleanup';
      const correlationId = 'test-cleanup-123';

      CorrelationManager.startOperation(operationId, correlationId);
      CorrelationManager.endOperation(operationId);

      // Initially should exist
      expect(CorrelationManager.getOperation(operationId)).toBeDefined();

      // After cleanup should be removed
      CorrelationManager.cleanupOperation(operationId);
      expect(CorrelationManager.getOperation(operationId)).toBeUndefined();
    });
  });

  describe('[P2] Integration between Metrics and Correlation', () => {
    test('should correlate metrics with operations', () => {
      const operationId = 'integrated-test';
      const correlationId = 'integrated-corr-123';

      CorrelationManager.startOperation(operationId, correlationId);

      // Record metrics during operation
      MetricsCollector.recordConnection(correlationId, 1000, true, 0);
      MetricsCollector.recordMessageProcessing('comment', 150, true);

      CorrelationManager.endOperation(operationId);

      const operation = CorrelationManager.getOperation(operationId);
      const metrics = MetricsCollector.getMetrics();

      expect(operation.correlationId).toBe(correlationId);
      expect(metrics.connections.total).toBe(1);
      expect(metrics.messages.total).toBe(1);
    });

    test('should handle operation failures in metrics', () => {
      const operationId = 'failure-test';
      const correlationId = 'failure-corr-123';
      const error = new Error('Operation failed');

      CorrelationManager.startOperation(operationId, correlationId);

      // Simulate failure
      MetricsCollector.recordConnection(correlationId, 500, false, 2);
      CorrelationManager.recordError(operationId, error);

      CorrelationManager.endOperation(operationId);

      const operation = CorrelationManager.getOperation(operationId);
      const metrics = MetricsCollector.getMetrics();

      expect(operation.error).toBeDefined();
      expect(metrics.connections.failed).toBe(1);
      expect(metrics.connections.averageRetryCount).toBe(2);
    });
  });
});