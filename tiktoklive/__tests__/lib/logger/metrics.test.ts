/**
 * Tests unitaires pour le système de métriques
 */

import { MetricsCollector, Metrics } from '../../../lib/logger/metrics';
import { CorrelationManager } from '../../../lib/logger/correlation';

// Mock de uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234567890abcdef')
}));

// Mock de console.warn pour éviter les erreurs de test
const originalWarn = console.warn;
console.warn = jest.fn();

describe('MetricsCollector', () => {
  beforeEach(() => {
    MetricsCollector.reset();
    CorrelationManager.reset();
  });

  describe('Enregistrement des métriques', () => {
    it('devrait enregistrer une métrique de performance', () => {
      MetricsCollector.recordMetric('test.duration', 150, 'ms', { operation: 'test' });

      const metrics = MetricsCollector.getRecentMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(expect.objectContaining({
        name: 'test.duration',
        value: 150,
        unit: 'ms',
        tags: { operation: 'test' }
      }));
    });

    it('devrait inclure le correlation ID dans les métriques', () => {
      CorrelationManager.createContext({ test: 'correlation' });
      MetricsCollector.recordMetric('test.metric', 100, 'count');

      const metrics = MetricsCollector.getRecentMetrics();
      expect(metrics[0].correlationId).toBe(CorrelationManager.getCurrentId());
    });

    it('devrait limiter le nombre de métriques stockées', () => {
      // Créer plus de 1000 métriques
      for (let i = 0; i < 1100; i++) {
        MetricsCollector.recordMetric(`metric.${i}`, i, 'count');
      }

      const metrics = MetricsCollector.getRecentMetrics(24); // Toutes les métriques
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Enregistrement des erreurs', () => {
    it('devrait enregistrer une erreur avec sévérité', () => {
      const error = new Error('Test error');
      MetricsCollector.recordError(error, 'high', { component: 'test' });

      const errors = MetricsCollector.getRecentErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(expect.objectContaining({
        error: 'Test error',
        severity: 'high',
        tags: { component: 'test' }
      }));
    });

    it('devrait accepter une chaîne d\'erreur', () => {
      MetricsCollector.recordError('String error', 'medium');

      const errors = MetricsCollector.getRecentErrors();
      expect(errors[0].error).toBe('String error');
    });

    it('devrait limiter le nombre d\'erreurs stockées', () => {
      for (let i = 0; i < 600; i++) {
        MetricsCollector.recordError(`Error ${i}`);
      }

      const errors = MetricsCollector.getRecentErrors(24);
      expect(errors.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Métriques de connexion', () => {
    it('devrait enregistrer une métrique de connexion réussie', () => {
      MetricsCollector.recordConnection('tiktok-connect', 500, true, 1, { userId: '123' });

      const connections = MetricsCollector.getRecentConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0]).toEqual(expect.objectContaining({
        operation: 'tiktok-connect',
        duration: 500,
        success: true,
        retryCount: 1,
        tags: { userId: '123' }
      }));
    });
  });

  describe('Système d\'alertes', () => {
    it('devrait générer une alerte pour connexion lente', () => {
      MetricsCollector.recordMetric('connection.duration', 15000, 'ms'); // 15 secondes

      const alerts = MetricsCollector.getRecentAlerts();
      expect(alerts.some(alert => alert.includes('Connexion lente'))).toBe(true);
    });

    it('devrait générer une alerte pour taux d\'erreur élevé', () => {
      MetricsCollector.recordMetric('circuit_breaker.error_rate', 0.15, 'ratio'); // 15%

      const alerts = MetricsCollector.getRecentAlerts();
      expect(alerts.some(alert => alert.includes('Taux d\'erreur élevé'))).toBe(true);
    });

    it('devrait générer une alerte pour défaillances répétées', () => {
      // Simuler 5 erreurs en peu de temps
      for (let i = 0; i < 6; i++) {
        MetricsCollector.recordError(`Error ${i}`, 'high');
      }

      const alerts = MetricsCollector.getRecentAlerts();
      expect(alerts.some(alert => alert.includes('Défaillances répétées'))).toBe(true);
    });

    it('devrait limiter le nombre d\'alertes stockées', () => {
      for (let i = 0; i < 150; i++) {
        MetricsCollector.recordMetric('connection.duration', 15000, 'ms');
      }

      const alerts = MetricsCollector.getRecentAlerts(200);
      expect(alerts.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Statistiques de performance', () => {
    it('devrait calculer les statistiques de performance', () => {
      // Ajouter quelques connexions
      MetricsCollector.recordConnection('connect', 100, true, 0);
      MetricsCollector.recordConnection('connect', 200, false, 1);
      MetricsCollector.recordConnection('connect', 150, true, 0);

      const stats = MetricsCollector.getPerformanceStats();
      expect(stats.totalConnections).toBe(3);
      expect(stats.successRate).toBe(2/3);
      expect(stats.avgConnectionTime).toBe(150); // (100+200+150)/3
    });

    it('devrait gérer le cas sans connexions récentes', () => {
      const stats = MetricsCollector.getPerformanceStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.avgConnectionTime).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });
});

describe('Metrics utilities', () => {
  beforeEach(() => {
    MetricsCollector.reset();
    CorrelationManager.reset();
  });

  describe('Metrics.time', () => {
    it('devrait mesurer le temps d\'une opération réussie', async () => {
      const result = await Metrics.time(
        'test-operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'success';
        },
        { component: 'test' }
      );

      expect(result).toBe('success');

      const metrics = MetricsCollector.getRecentMetrics();
      expect(metrics.some(m =>
        m.name === 'test-operation.duration' &&
        m.value >= 45 &&
        m.tags.success === 'true'
      )).toBe(true);
    });

    it('devrait mesurer le temps d\'une opération échouante', async () => {
      await expect(
        Metrics.time(
          'failing-operation',
          async () => {
            await new Promise(resolve => setTimeout(resolve, 25));
            throw new Error('Test failure');
          }
        )
      ).rejects.toThrow('Test failure');

      const metrics = MetricsCollector.getRecentMetrics();
      expect(metrics.some(m =>
        m.name === 'failing-operation.duration' &&
        m.tags.success === 'false'
      )).toBe(true);
    });
  });

  describe('Metrics.error', () => {
    it('devrait enregistrer une erreur via l\'utilitaire', () => {
      const error = new Error('Utility error');
      Metrics.error(error, 'medium', { utility: 'test' });

      const errors = MetricsCollector.getRecentErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe('Utility error');
      expect(errors[0].severity).toBe('medium');
    });
  });

  describe('Metrics.connection', () => {
    it('devrait enregistrer une métrique de connexion via l\'utilitaire', () => {
      Metrics.connection('test-connect', 300, true, 2, { test: 'true' });

      const connections = MetricsCollector.getRecentConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].operation).toBe('test-connect');
      expect(connections[0].duration).toBe(300);
      expect(connections[0].success).toBe(true);
      expect(connections[0].retryCount).toBe(2);
    });
  });
});