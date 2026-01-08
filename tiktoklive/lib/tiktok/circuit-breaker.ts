/**
 * Implémentation du Circuit Breaker Pattern pour la gestion robuste des connexions TikTok
 */

import { TikTokConnectionConfig } from './types';
import { MetricsCollector } from '../logger/metrics';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Fonctionnement normal
  OPEN = 'OPEN',         // Circuit ouvert - rejette les appels
  HALF_OPEN = 'HALF_OPEN' // Test si le service est de nouveau disponible
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  state: CircuitBreakerState;
  stateChangedAt: Date;
}

export interface RetryAttempt {
  attempt: number;
  delay: number;
  timestamp: Date;
  error?: string;
}

/**
 * Circuit Breaker pour gérer les connexions TikTok avec retry et fallback
 */
export class TikTokCircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private metrics: CircuitBreakerMetrics;
  private config: TikTokConnectionConfig;
  private retryHistory: RetryAttempt[] = [];
  private fallbackModeActive: boolean = false;
  private halfOpenTestInProgress: boolean = false;

  // Métriques spécifiques aux commentaires temps réel
  private commentMetrics: {
    totalComments: number;
    successfulComments: number;
    failedComments: number;
    consecutiveCommentFailures: number;
    lastCommentReceived?: Date;
    pollingFallbackActive: boolean;
  } = {
    totalComments: 0,
    successfulComments: 0,
    failedComments: 0,
    consecutiveCommentFailures: 0,
    pollingFallbackActive: false
  };

  constructor(config: TikTokConnectionConfig) {
    this.config = config;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
      state: CircuitBreakerState.CLOSED,
      stateChangedAt: new Date()
    };
  }

  /**
   * Exécute une opération avec protection Circuit Breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'tiktok-operation'
  ): Promise<T> {
    this.metrics.totalRequests++;

    // Vérifier l'état du circuit
    if (this.state === CircuitBreakerState.OPEN) {
      // Vérifier si on peut passer en HALF_OPEN
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
        this.halfOpenTestInProgress = true;
      } else {
        // Fallback vers mode dégradé
        return this.executeInFallbackMode(operationName);
      }
    }

    try {
      // Tenter l'opération avec retry logic
      const result = await this.executeWithRetry(operation, operationName);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Exécute l'opération avec retry logic et backoff exponentiel
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await operation();

        // Succès - nettoyer l'historique des retry pour cette opération
        this.retryHistory = this.retryHistory.filter(
          r => r.attempt < attempt || r.timestamp.getTime() < Date.now() - 60000 // Garder 1 minute
        );

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Enregistrer la tentative de retry
        this.retryHistory.push({
          attempt,
          delay: this.calculateBackoffDelay(attempt),
          timestamp: new Date(),
          error: lastError.message
        });

        // Si ce n'est pas la dernière tentative, attendre avant retry
        if (attempt < this.config.retryAttempts) {
          const delay = this.calculateBackoffDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // Toutes les tentatives ont échoué
    throw lastError || new Error(`Operation ${operationName} failed after ${this.config.retryAttempts} attempts`);
  }

  /**
   * Exécute l'opération en mode fallback (dégradé)
   */
  private async executeInFallbackMode<T>(operationName: string): Promise<T> {
    this.fallbackModeActive = true;

    // En mode fallback, on simule un succès ou on retourne une valeur par défaut
    // Pour TikTok, cela pourrait être une connexion simulée ou des données mockées
    throw new Error(`Circuit Breaker OPEN: ${operationName} executed in fallback mode. Service temporarily unavailable.`);
  }

  /**
   * Calcule le délai de backoff exponentiel avec jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

    // Ajouter du jitter pour éviter les thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    const totalDelay = exponentialDelay + jitter;

    // Respecter les limites
    return Math.min(totalDelay, this.config.timeout);
  }

  /**
   * Enregistre un succès
   */
  private recordSuccess(): void {
    this.metrics.successfulRequests++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = new Date();

    // Enregistrer la métrique de succès
    MetricsCollector.recordMetric(
      'circuit_breaker.success',
      1,
      'count',
      { state: this.state, consecutiveFailures: '0' }
    );

    // Si on était en HALF_OPEN et que le test réussit, fermer le circuit
    if (this.state === CircuitBreakerState.HALF_OPEN && this.halfOpenTestInProgress) {
      this.halfOpenTestInProgress = false;
      this.transitionTo(CircuitBreakerState.CLOSED);
    }

    this.fallbackModeActive = false;
  }

  /**
   * Enregistre un échec
   */
  private recordFailure(errorMessage: string): void {
    this.metrics.failedRequests++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailureTime = new Date();

    // Enregistrer la métrique d'échec
    MetricsCollector.recordMetric(
      'circuit_breaker.failure',
      1,
      'count',
      {
        state: this.state,
        consecutiveFailures: this.metrics.consecutiveFailures.toString(),
        error: errorMessage.substring(0, 100) // Limiter la longueur
      }
    );

    // Vérifier si on doit ouvrir le circuit
    if (this.state === CircuitBreakerState.CLOSED &&
        this.metrics.consecutiveFailures >= 3) { // Seuil configurable
      this.transitionTo(CircuitBreakerState.OPEN);
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Test HALF_OPEN a échoué, revenir à OPEN
      this.halfOpenTestInProgress = false;
      this.transitionTo(CircuitBreakerState.OPEN);
    }
  }

  /**
   * Détermine si on peut tenter de reset le circuit (passer de OPEN à HALF_OPEN)
   */
  private shouldAttemptReset(): boolean {
    if (!this.metrics.lastFailureTime) return true;

    const timeSinceLastFailure = Date.now() - this.metrics.lastFailureTime.getTime();
    const timeoutPeriod = this.config.timeout * 2; // Période d'attente configurable

    return timeSinceLastFailure >= timeoutPeriod;
  }

  /**
   * Change l'état du circuit breaker
   */
  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;
    this.metrics.state = newState;
    this.metrics.stateChangedAt = new Date();

    // Enregistrer le changement d'état
    MetricsCollector.recordMetric(
      'circuit_breaker.state_change',
      1,
      'count',
      {
        from: oldState,
        to: newState,
        timestamp: this.metrics.stateChangedAt.toISOString()
      }
    );

    // Alerte pour les changements critiques
    if (newState === CircuitBreakerState.OPEN) {
      MetricsCollector.recordError(
        `Circuit Breaker ouvert après ${this.metrics.consecutiveFailures} échecs consécutifs`,
        'high',
        { circuitBreakerState: 'opened', consecutiveFailures: this.metrics.consecutiveFailures.toString() }
      );
    }
  }

  /**
   * Utilitaire pour les délais
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtient les métriques actuelles
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtient l'état actuel
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Vérifie si le mode fallback est actif
   */
  isFallbackModeActive(): boolean {
    return this.fallbackModeActive;
  }

  /**
   * Obtient l'historique des tentatives de retry récentes
   */
  getRetryHistory(minutes: number = 5): RetryAttempt[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.retryHistory.filter(r => r.timestamp.getTime() >= cutoffTime);
  }

  /**
   * Calcule le taux de succès
   */
  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 1.0;
    return this.metrics.successfulRequests / this.metrics.totalRequests;
  }

  /**
   * Reset manuel du circuit breaker (pour les tests ou récupération manuelle)
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.metrics.consecutiveFailures = 0;
    this.fallbackModeActive = false;
    this.halfOpenTestInProgress = false;
    this.metrics.stateChangedAt = new Date();
  }

  /**
   * Enregistre un commentaire réussi
   */
  recordCommentSuccess(): void {
    this.commentMetrics.totalComments++;
    this.commentMetrics.successfulComments++;
    this.commentMetrics.consecutiveCommentFailures = 0;
    this.commentMetrics.lastCommentReceived = new Date();

    // Désactiver le mode polling fallback si on reçoit des commentaires
    if (this.commentMetrics.pollingFallbackActive) {
      this.commentMetrics.pollingFallbackActive = false;
      MetricsCollector.recordMetric(
        'circuit_breaker.comment_fallback_deactivated',
        1,
        'count',
        { reason: 'comment_received' }
      );
    }
  }

  /**
   * Enregistre un échec de réception de commentaire
   */
  recordCommentFailure(): void {
    this.commentMetrics.totalComments++;
    this.commentMetrics.failedComments++;
    this.commentMetrics.consecutiveCommentFailures++;

    // Activer le mode fallback après 5 échecs consécutifs
    if (this.commentMetrics.consecutiveCommentFailures >= 5 && !this.commentMetrics.pollingFallbackActive) {
      this.activatePollingFallback();
    }
  }

  /**
   * Active le mode fallback vers polling
   */
  private activatePollingFallback(): void {
    this.commentMetrics.pollingFallbackActive = true;
    this.fallbackModeActive = true;

    MetricsCollector.recordMetric(
      'circuit_breaker.polling_fallback_activated',
      1,
      'count',
      {
        consecutiveFailures: this.commentMetrics.consecutiveCommentFailures.toString(),
        totalComments: this.commentMetrics.totalComments.toString()
      }
    );

    // MetricsCollector.addAlert(
    //   `🔄 Mode polling activé: ${this.commentMetrics.consecutiveCommentFailures} échecs commentaires consécutifs`
    // );
  }

  /**
   * Vérifie si le mode polling fallback est actif
   */
  isPollingFallbackActive(): boolean {
    return this.commentMetrics.pollingFallbackActive;
  }

  /**
   * Obtient les métriques de commentaires
   */
  getCommentMetrics(): typeof this.commentMetrics {
    return { ...this.commentMetrics };
  }

  /**
   * Calcule le taux de succès des commentaires
   */
  getCommentSuccessRate(): number {
    if (this.commentMetrics.totalComments === 0) return 1;
    return this.commentMetrics.successfulComments / this.commentMetrics.totalComments;
  }

  /**
   * Force la désactivation du mode polling fallback
   */
  deactivatePollingFallback(): void {
    this.commentMetrics.pollingFallbackActive = false;
    this.commentMetrics.consecutiveCommentFailures = 0;
  }
}