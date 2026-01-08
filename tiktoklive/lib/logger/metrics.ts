/**
 * Métriques de performance et monitoring pour l'application TikTokLive
 */

import { getCurrentCorrelationId } from './correlation';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  correlationId?: string;
  tags: Record<string, string>;
}

export interface ErrorMetric {
  error: string;
  stack?: string;
  timestamp: Date;
  correlationId?: string;
  tags: Record<string, string>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConnectionMetric {
  operation: string;
  duration: number;
  success: boolean;
  retryCount: number;
  timestamp: Date;
  correlationId?: string;
  tags: Record<string, string>;
}

/**
 * Collecteur de métriques de performance
 */
export class MetricsCollector {
  private static metrics: PerformanceMetric[] = [];
  private static errors: ErrorMetric[] = [];
  private static connections: ConnectionMetric[] = [];
  private static alerts: string[] = [];

  // Seuils d'alerte configurables
  private static readonly ALERT_THRESHOLDS = {
    maxConnectionTime: 10000, // 10 secondes
    maxErrorRate: 0.1, // 10% d'erreurs
    maxRetryRate: 0.5, // 50% de retry
    consecutiveFailures: 5
  };

  /**
   * Enregistre une métrique de performance
   */
  static recordMetric(
    name: string,
    value: number,
    unit: string,
    tags: Record<string, string> = {}
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      correlationId: getCurrentCorrelationId() || undefined,
      tags
    };

    this.metrics.push(metric);

    // Garder seulement les 1000 dernières métriques
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Vérifier les seuils d'alerte
    this.checkMetricAlerts(metric);
  }

  /**
   * Enregistre une erreur
   */
  static recordError(
    error: Error | string,
    severity: ErrorMetric['severity'] = 'medium',
    tags: Record<string, string> = {}
  ): void {
    const errorString = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const errorMetric: ErrorMetric = {
      error: errorString,
      stack,
      timestamp: new Date(),
      correlationId: getCurrentCorrelationId() || undefined,
      tags,
      severity
    };

    this.errors.push(errorMetric);

    // Garder seulement les 500 dernières erreurs
    if (this.errors.length > 500) {
      this.errors = this.errors.slice(-500);
    }

    // Générer une alerte si nécessaire
    this.checkErrorAlerts(errorMetric);
  }

  /**
   * Enregistre une métrique de connexion
   */
  static recordConnection(
    operation: string,
    duration: number,
    success: boolean,
    retryCount: number = 0,
    tags: Record<string, string> = {}
  ): void {
    const connectionMetric: ConnectionMetric = {
      operation,
      duration,
      success,
      retryCount,
      timestamp: new Date(),
      correlationId: getCurrentCorrelationId() || undefined,
      tags
    };

    this.connections.push(connectionMetric);

    // Garder seulement les 500 dernières connexions
    if (this.connections.length > 500) {
      this.connections = this.connections.slice(-500);
    }

    // Vérifier les seuils de performance
    this.checkConnectionAlerts(connectionMetric);
  }

  /**
   * Enregistre la réception d'un commentaire TikTok avec métriques de performance
   */
  static recordCommentReceived(
    sessionId: string,
    latency: number,
    tags: Record<string, string> = {}
  ): void {
    // Enregistrer la métrique de latence
    this.recordMetric(
      'comment.latency',
      latency,
      'ms',
      {
        sessionId,
        ...tags
      }
    );

    // Vérifier les seuils de performance temps réel
    if (latency > 2000) { // Plus de 2 secondes selon les exigences NFR
      this.addAlert(`🚨 Latence commentaire élevée: ${latency}ms (seuil: 2000ms)`);
    } else if (latency > 1500) { // Alerte préventive
      this.addAlert(`⚠️ Latence commentaire élevée: ${latency}ms`);
    }
  }

  /**
   * Vérifie les alertes basées sur les métriques
   */
  private static checkMetricAlerts(metric: PerformanceMetric): void {
    switch (metric.name) {
      case 'connection.duration':
        if (metric.value > this.ALERT_THRESHOLDS.maxConnectionTime) {
          this.addAlert(`⚠️ Connexion lente détectée: ${metric.value}ms (seuil: ${this.ALERT_THRESHOLDS.maxConnectionTime}ms)`);
        }
        break;

      case 'circuit_breaker.error_rate':
        if (metric.value > this.ALERT_THRESHOLDS.maxErrorRate) {
          this.addAlert(`🚨 Taux d'erreur élevé: ${(metric.value * 100).toFixed(1)}% (seuil: ${(this.ALERT_THRESHOLDS.maxErrorRate * 100).toFixed(1)}%)`);
        }
        break;
    }
  }

  /**
   * Vérifie les alertes basées sur les erreurs
   */
  private static checkErrorAlerts(errorMetric: ErrorMetric): void {
    // Compter les erreurs récentes (dernières 5 minutes)
    const recentErrors = this.errors.filter(
      e => Date.now() - e.timestamp.getTime() < 5 * 60 * 1000
    );

    if (recentErrors.length >= this.ALERT_THRESHOLDS.consecutiveFailures) {
      this.addAlert(`🔴 Défaillances répétées: ${recentErrors.length} erreurs en 5 minutes`);
    }
  }

  /**
   * Vérifie les alertes basées sur les connexions
   */
  private static checkConnectionAlerts(connectionMetric: ConnectionMetric): void {
    if (!connectionMetric.success && connectionMetric.retryCount > 2) {
      this.addAlert(`⚠️ Échec de connexion persistant: ${connectionMetric.operation} après ${connectionMetric.retryCount} tentatives`);
    }
  }

  /**
   * Ajoute une alerte
   */
  private static addAlert(message: string): void {
    const alert = `[${new Date().toISOString()}] ${message}`;
    this.alerts.push(alert);

    // Garder seulement les 100 dernières alertes
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log l'alerte (en production, ceci pourrait envoyer à un système de monitoring)
    console.warn(`ALERT: ${message}`);
  }

  /**
   * Obtient les métriques récentes
   */
  static getRecentMetrics(hours: number = 1): PerformanceMetric[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp.getTime() >= cutoffTime);
  }

  /**
   * Obtient les erreurs récentes
   */
  static getRecentErrors(hours: number = 1): ErrorMetric[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.errors.filter(e => e.timestamp.getTime() >= cutoffTime);
  }

  /**
   * Obtient les métriques de connexion récentes
   */
  static getRecentConnections(hours: number = 1): ConnectionMetric[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.connections.filter(c => c.timestamp.getTime() >= cutoffTime);
  }

  /**
   * Obtient les alertes récentes
   */
  static getRecentAlerts(count: number = 10): string[] {
    return this.alerts.slice(-count);
  }

  /**
   * Calcule des statistiques de performance
   */
  static getPerformanceStats(): {
    avgConnectionTime: number;
    errorRate: number;
    successRate: number;
    totalConnections: number;
    totalErrors: number;
  } {
    const recentConnections = this.getRecentConnections(1); // Dernière heure
    const recentErrors = this.getRecentErrors(1);

    const totalConnections = recentConnections.length;
    const successfulConnections = recentConnections.filter(c => c.success).length;
    const avgConnectionTime = totalConnections > 0
      ? recentConnections.reduce((sum, c) => sum + c.duration, 0) / totalConnections
      : 0;

    return {
      avgConnectionTime,
      errorRate: recentErrors.length / Math.max(totalConnections, 1),
      successRate: successfulConnections / Math.max(totalConnections, 1),
      totalConnections,
      totalErrors: recentErrors.length
    };
  }

  /**
   * Nettoie toutes les métriques (pour les tests)
   */
  static reset(): void {
    this.metrics = [];
    this.errors = [];
    this.connections = [];
    this.alerts = [];
  }
}

/**
 * Utilitaires de métriques pour usage simplifié
 */
export const Metrics = {
  /**
   * Mesure le temps d'exécution d'une opération
   */
  async time<T>(
    operationName: string,
    operation: () => Promise<T>,
    tags: Record<string, string> = {}
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      MetricsCollector.recordMetric(
        `${operationName}.duration`,
        duration,
        'ms',
        { ...tags, success: 'true' }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      MetricsCollector.recordMetric(
        `${operationName}.duration`,
        duration,
        'ms',
        { ...tags, success: 'false' }
      );

      throw error;
    }
  },

  /**
   * Enregistre une erreur avec métriques
   */
  error(error: Error | string, severity: ErrorMetric['severity'] = 'medium', tags: Record<string, string> = {}): void {
    MetricsCollector.recordError(error, severity, tags);
  },

  /**
   * Enregistre une métrique de connexion
   */
  connection(operation: string, duration: number, success: boolean, retryCount: number = 0, tags: Record<string, string> = {}): void {
    MetricsCollector.recordConnection(operation, duration, success, retryCount, tags);
  }
};