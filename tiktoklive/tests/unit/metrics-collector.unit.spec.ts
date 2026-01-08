import { MetricsCollector, PerformanceMetric, ErrorMetric, ConnectionMetric } from '../../lib/logger/metrics';

describe('MetricsCollector', () => {
  beforeEach(() => {
    // Clear all metrics before each test
    (MetricsCollector as any).metrics = [];
    (MetricsCollector as any).errors = [];
    (MetricsCollector as any).connections = [];
    (MetricsCollector as any).alerts = [];
  });

  describe('[P2] recordMetric', () => {
    test('should record performance metric with all required fields', () => {
      // GIVEN: Metric data
      const name = 'test.metric';
      const value = 42;
      const unit = 'ms';
      const tags = { sessionId: 'session-123', userId: 'user-456' };

      // WHEN: Recording the metric
      MetricsCollector.recordMetric(name, value, unit, tags);

      // THEN: Should store the metric correctly
      const metrics = (MetricsCollector as any).metrics;
      expect(metrics).toHaveLength(1);

      const metric = metrics[0];
      expect(metric.name).toBe(name);
      expect(metric.value).toBe(value);
      expect(metric.unit).toBe(unit);
      expect(metric.tags).toEqual(tags);
      expect(metric.timestamp).toBeInstanceOf(Date);
      expect(metric.correlationId).toBeDefined();
    });

    test('should record metric without tags', () => {
      // WHEN: Recording metric without tags
      MetricsCollector.recordMetric('test.metric', 100, 'bytes');

      // THEN: Should have empty tags object
      const metrics = (MetricsCollector as any).metrics;
      expect(metrics[0].tags).toEqual({});
    });

    test('should limit stored metrics to 1000 entries', () => {
      // GIVEN: More than 1000 metrics
      const metricCount = 1005;

      // WHEN: Recording many metrics
      for (let i = 0; i < metricCount; i++) {
        MetricsCollector.recordMetric(`metric.${i}`, i, 'count');
      }

      // THEN: Should keep only the last 1000
      const metrics = (MetricsCollector as any).metrics;
      expect(metrics).toHaveLength(1000);
      expect(metrics[0].name).toBe('metric.5'); // First should be metric.5 (after removing first 5)
      expect(metrics[999].name).toBe('metric.1004'); // Last should be the most recent
    });

    test('should handle zero and negative values', () => {
      // WHEN: Recording metrics with edge values
      MetricsCollector.recordMetric('zero.metric', 0, 'count');
      MetricsCollector.recordMetric('negative.metric', -5, 'temp');

      // THEN: Should store correctly
      const metrics = (MetricsCollector as any).metrics;
      expect(metrics[0].value).toBe(0);
      expect(metrics[1].value).toBe(-5);
    });
  });

  describe('[P2] recordError', () => {
    test('should record Error object with stack trace', () => {
      // GIVEN: Error object
      const error = new Error('Test error message');
      const severity = 'high';
      const tags = { operation: 'test-op', sessionId: 'session-123' };

      // WHEN: Recording the error
      MetricsCollector.recordError(error, severity, tags);

      // THEN: Should store error with stack trace
      const errors = (MetricsCollector as any).errors;
      expect(errors).toHaveLength(1);

      const errorMetric = errors[0];
      expect(errorMetric.error).toBe('Test error message');
      expect(errorMetric.stack).toContain('Test error message');
      expect(errorMetric.severity).toBe(severity);
      expect(errorMetric.tags).toEqual(tags);
      expect(errorMetric.timestamp).toBeInstanceOf(Date);
    });

    test('should record string error without stack trace', () => {
      // GIVEN: String error
      const errorString = 'Simple error message';

      // WHEN: Recording the error
      MetricsCollector.recordError(errorString);

      // THEN: Should store error without stack trace
      const errors = (MetricsCollector as any).errors;
      expect(errors[0].error).toBe(errorString);
      expect(errors[0].stack).toBeUndefined();
      expect(errors[0].severity).toBe('medium'); // default
    });

    test('should use default severity when not specified', () => {
      // WHEN: Recording error without severity
      MetricsCollector.recordError('Test error');

      // THEN: Should use medium severity
      const errors = (MetricsCollector as any).errors;
      expect(errors[0].severity).toBe('medium');
    });

    test('should handle all severity levels', () => {
      // GIVEN: All severity levels
      const severities: ErrorMetric['severity'][] = ['low', 'medium', 'high', 'critical'];

      // WHEN: Recording errors with different severities
      severities.forEach(severity => {
        MetricsCollector.recordError(`Error ${severity}`, severity);
      });

      // THEN: Should store all severities correctly
      const errors = (MetricsCollector as any).errors;
      severities.forEach((severity, index) => {
        expect(errors[index].severity).toBe(severity);
      });
    });
  });

  describe('[P2] recordConnection', () => {
    test('should record successful connection metric', () => {
      // GIVEN: Successful connection data
      const operation = 'connect';
      const duration = 1500;
      const success = true;
      const retryCount = 0;
      const tags = { sessionId: 'session-123' };

      // WHEN: Recording the connection
      MetricsCollector.recordConnection(operation, duration, success, retryCount, tags);

      // THEN: Should store connection metric
      const connections = (MetricsCollector as any).connections;
      expect(connections).toHaveLength(1);

      const connection = connections[0];
      expect(connection.operation).toBe(operation);
      expect(connection.duration).toBe(duration);
      expect(connection.success).toBe(success);
      expect(connection.retryCount).toBe(retryCount);
      expect(connection.tags).toEqual(tags);
      expect(connection.timestamp).toBeInstanceOf(Date);
    });

    test('should record failed connection metric', () => {
      // GIVEN: Failed connection data
      const operation = 'reconnect';
      const duration = 5000;
      const success = false;
      const retryCount = 3;

      // WHEN: Recording the failed connection
      MetricsCollector.recordConnection(operation, duration, success, retryCount);

      // THEN: Should store failed connection
      const connections = (MetricsCollector as any).connections;
      const connection = connections[0];
      expect(connection.success).toBe(false);
      expect(connection.retryCount).toBe(3);
      expect(connection.duration).toBe(5000);
    });

    test('should handle zero duration and retry count', () => {
      // WHEN: Recording connection with zero values
      MetricsCollector.recordConnection('test', 0, true, 0);

      // THEN: Should store correctly
      const connections = (MetricsCollector as any).connections;
      const connection = connections[0];
      expect(connection.duration).toBe(0);
      expect(connection.retryCount).toBe(0);
    });
  });

  describe('[P2] recordCommentReceived', () => {
    test('should record comment with latency metric', () => {
      // GIVEN: Comment data
      const sessionId = 'session-123';
      const latency = 500;
      const tags = { userId: 'user-456', commentId: 'comment-789' };

      // WHEN: Recording comment received
      MetricsCollector.recordCommentReceived(sessionId, latency, tags);

      // THEN: Should create both metric and connection records
      const metrics = (MetricsCollector as any).metrics;
      const connections = (MetricsCollector as any).connections;

      // Should have latency metric
      expect(metrics.some(m => m.name === 'comment.latency' && m.value === latency)).toBe(true);

      // Should have connection record for comment
      expect(connections.some(c => c.operation === 'comment-received' && c.duration === latency)).toBe(true);
    });

    test('should include session ID in comment metric tags', () => {
      // GIVEN: Comment data
      const sessionId = 'session-123';
      const latency = 300;

      // WHEN: Recording comment
      MetricsCollector.recordCommentReceived(sessionId, latency, { commentId: 'c-123' });

      // THEN: Should include sessionId in metric tags
      const metrics = (MetricsCollector as any).metrics;
      const latencyMetric = metrics.find(m => m.name === 'comment.latency');
      expect(latencyMetric!.tags.sessionId).toBe(sessionId);
    });
  });

  describe('[P2] getMetricsSummary', () => {
    test('should return summary of all collected metrics', () => {
      // GIVEN: Various metrics recorded
      MetricsCollector.recordMetric('test.metric1', 100, 'ms', { tag1: 'value1' });
      MetricsCollector.recordMetric('test.metric2', 200, 'ms', { tag2: 'value2' });
      MetricsCollector.recordError('Test error', 'high');
      MetricsCollector.recordConnection('connect', 1500, true, 0);

      // WHEN: Getting metrics summary
      const summary = MetricsCollector.getMetricsSummary();

      // THEN: Should include counts and recent items
      expect(summary.totalMetrics).toBe(2);
      expect(summary.totalErrors).toBe(1);
      expect(summary.totalConnections).toBe(1);
      expect(summary.recentMetrics).toHaveLength(2);
      expect(summary.recentErrors).toHaveLength(1);
      expect(summary.recentConnections).toHaveLength(1);
    });

    test('should limit recent items to 10', () => {
      // GIVEN: More than 10 metrics
      for (let i = 0; i < 15; i++) {
        MetricsCollector.recordMetric(`metric.${i}`, i, 'count');
      }

      // WHEN: Getting summary
      const summary = MetricsCollector.getMetricsSummary();

      // THEN: Should limit to 10 recent items
      expect(summary.recentMetrics).toHaveLength(10);
      expect(summary.totalMetrics).toBe(15);
    });
  });

  describe('[P3] Alert Thresholds', () => {
    test('should trigger alert for high connection time', () => {
      // WHEN: Recording connection over threshold (10+ seconds)
      MetricsCollector.recordMetric('connection.duration', 15000, 'ms', { operation: 'connect' });

      // THEN: Should trigger alert
      const alerts = (MetricsCollector as any).alerts;
      expect(alerts.some(alert => alert.includes('connection time'))).toBe(true);
    });

    test('should trigger alert for high error rate', () => {
      // GIVEN: Multiple errors to simulate high error rate
      for (let i = 0; i < 15; i++) {
        MetricsCollector.recordError(`Error ${i}`, 'high');
      }

      // WHEN: Recording another error
      MetricsCollector.recordError('Trigger error', 'high');

      // THEN: Should have error rate alerts
      const alerts = (MetricsCollector as any).alerts;
      expect(alerts.length).toBeGreaterThan(0);
    });

    test('should not trigger alerts for normal metrics', () => {
      // WHEN: Recording normal metrics
      MetricsCollector.recordMetric('connection.duration', 1000, 'ms');
      MetricsCollector.recordError('Minor error', 'low');

      // THEN: Should not trigger alerts
      const alerts = (MetricsCollector as any).alerts;
      expect(alerts).toHaveLength(0);
    });
  });

  describe('[P3] Data Retention', () => {
    test('should retain metrics in chronological order', () => {
      // GIVEN: Metrics recorded at different times
      const startTime = Date.now();
      MetricsCollector.recordMetric('first', 1, 'count');
      MetricsCollector.recordMetric('second', 2, 'count');
      MetricsCollector.recordMetric('third', 3, 'count');

      // WHEN: Checking storage order
      const metrics = (MetricsCollector as any).metrics;

      // THEN: Should be in chronological order
      expect(metrics[0].value).toBe(1);
      expect(metrics[1].value).toBe(2);
      expect(metrics[2].value).toBe(3);

      // All timestamps should be after start time
      metrics.forEach(metric => {
        expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(startTime);
      });
    });

    test('should handle empty collections gracefully', () => {
      // WHEN: Getting summary with no data
      const summary = MetricsCollector.getMetricsSummary();

      // THEN: Should return zero counts
      expect(summary.totalMetrics).toBe(0);
      expect(summary.totalErrors).toBe(0);
      expect(summary.totalConnections).toBe(0);
      expect(summary.recentMetrics).toEqual([]);
      expect(summary.recentErrors).toEqual([]);
      expect(summary.recentConnections).toEqual([]);
    });
  });
});