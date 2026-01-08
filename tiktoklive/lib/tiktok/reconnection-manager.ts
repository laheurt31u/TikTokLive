/**
 * Gestionnaire de reconnexion automatique pour TikTok Live
 * Implémente la surveillance continue de l'état de connexion et la reconnexion intelligente
 */

import { ReconnectionState, TikTokConnectionStatus } from './types';
import { CircuitBreakerState, CircuitBreakerMetrics } from './circuit-breaker';

// Interfaces pour l'injection de dépendances (testabilité)
export interface ICorrelationManager {
  generateId(): string;
  getElapsedTime(): number;
}

export interface IMetricsCollector {
  recordMetric(name: string, value: number, unit: string, tags?: Record<string, any>): void;
  recordConnection(operation: string, duration: number, success: boolean, retryCount: number, tags?: Record<string, any>): void;
  recordError(error: Error, severity: string, tags?: Record<string, any>): void;
}

// Imports avec gestion d'erreur pour les tests
let CorrelationManager: ICorrelationManager;
let MetricsCollector: IMetricsCollector;

try {
  const correlationModule = require('../logger/correlation');
  const metricsModule = require('../logger/metrics');
  CorrelationManager = correlationModule.CorrelationManager;
  MetricsCollector = metricsModule.MetricsCollector;
} catch (e) {
  // Fallback pour les tests
  CorrelationManager = {
    generateId: () => 'test-correlation-id',
    getElapsedTime: () => 1000
  };
  MetricsCollector = {
    recordMetric: () => {},
    recordConnection: () => {},
    recordError: () => {}
  };
}


export interface DisconnectClassification {
  type: 'tiktok' | 'network' | 'auth' | 'unknown';
  severity: 'low' | 'medium' | 'high';
  requiresReconnection: boolean;
  description: string;
}

export interface ConnectionStabilityMetrics {
  uptimePercentage: number;
  averageReconnectionTime: number;
  disconnectFrequency: number; // déconnexions par heure
  connectionStabilityScore: number; // 0-100
  totalReconnections: number;
  successfulReconnections: number;
  failedReconnections: number;
}

export interface CoordinatedMetrics extends ConnectionStabilityMetrics {
  circuitBreakerState: string;
  combinedStabilityScore: number;
  circuitBreakerHealth: number; // 0-100 basé sur les métriques CB
}

// Interface pour le Circuit Breaker (dépendance)
export interface ICircuitBreaker {
  getState(): CircuitBreakerState;
  getMetrics(): CircuitBreakerMetrics;
  isFallbackModeActive(): boolean;
}

export interface ExtendedConnectionStatus extends TikTokConnectionStatus {
  reconnectionState: ReconnectionState;
  lastReconnectionAttempt?: Date;
  reconnectionAttempts: number;
  timeSinceLastDisconnect?: number;
  stabilityMetrics: ConnectionStabilityMetrics;
}

/**
 * Gestionnaire spécialisé pour la reconnexion automatique TikTok
 */
export class ReconnectionManager {
  private reconnectionState: ReconnectionState = ReconnectionState.IDLE;
  private previousReconnectionState?: ReconnectionState;
  private lastReconnectionAttempt?: Date;
  private reconnectionAttempts = 0;
  private connectionEvents: Array<{ type: string; timestamp: number }> = [];
  private reconnectionTimings: number[] = [];
  private currentReconnectionStart?: number;

  // Gestion des tentatives de reconnexion (configurables via env)
  private readonly MAX_RECONNECTION_ATTEMPTS = parseInt(process.env.RECONNECTION_MAX_ATTEMPTS || '10', 10);
  private consecutiveFailedAttempts = 0;

  // Paramètres de backoff exponentiel (configurables via env)
  private readonly RECONNECTION_BASE_DELAY = parseInt(process.env.RECONNECTION_BASE_DELAY || '5000', 10); // 5 secondes
  private readonly RECONNECTION_MAX_DELAY = parseInt(process.env.RECONNECTION_MAX_DELAY || '300000', 10); // 5 minutes
  private readonly RECONNECTION_BACKOFF_MULTIPLIER = parseInt(process.env.RECONNECTION_BACKOFF_MULTIPLIER || '2', 10);
  private readonly JITTER_FACTOR = 0.1; // 10% de jitter

  constructor(
    private connector: any,
    private correlationId: string = CorrelationManager.generateId(),
    private correlationManager: ICorrelationManager = CorrelationManager,
    private metricsCollector: IMetricsCollector = MetricsCollector
  ) {}

  /**
   * Extension du monitoring de connexion existant
   */
  getExtendedConnectionStatus(): ExtendedConnectionStatus {
    const baseStatus = this.connector?.getConnectionStatus?.() || {
      connected: false,
      retryCount: 0
    };

    return {
      ...baseStatus,
      reconnectionState: this.reconnectionState,
      lastReconnectionAttempt: this.lastReconnectionAttempt,
      reconnectionAttempts: this.reconnectionAttempts,
      timeSinceLastDisconnect: this.getTimeSinceLastDisconnect(),
      stabilityMetrics: this.getConnectionStabilityMetrics()
    };
  }

  /**
   * Détection des déconnexions TikTok vs problèmes réseau locaux
   */
  classifyDisconnectReason(errorMessage: string): DisconnectClassification {
    const message = errorMessage.toLowerCase();

    let classification: DisconnectClassification;

    // Erreurs TikTok spécifiques
    if (message.includes('tiktok') || message.includes('live ended') || message.includes('stream ended')) {
      classification = {
        type: 'tiktok',
        severity: 'high',
        requiresReconnection: true,
        description: 'Déconnexion initiée par TikTok (fin de live ou maintenance)'
      };
    }

    // Erreurs réseau
    else if (message.includes('enotfound') || message.includes('econnrefused') ||
        message.includes('network') || message.includes('timeout')) {
      classification = {
        type: 'network',
        severity: 'medium',
        requiresReconnection: true,
        description: 'Problème de réseau local ou connexion internet'
      };
    }

    // Erreurs d'authentification
    else if (message.includes('auth') || message.includes('unauthorized') ||
        message.includes('forbidden') || message.includes('credentials')) {
      classification = {
        type: 'auth',
        severity: 'high',
        requiresReconnection: false,
        description: 'Problème d\'authentification - reconnexion impossible'
      };
    }

    // Erreur inconnue - tentative de reconnexion par défaut
    else {
      classification = {
        type: 'unknown',
        severity: 'medium',
        requiresReconnection: true,
        description: 'Erreur inconnue - tentative de reconnexion recommandée'
      };
    }

    // Logging de la classification
    console.log(`[${new Date().toISOString()}] [${this.correlationId}] [CLASSIFICATION] ${classification.type.toUpperCase()} - ${errorMessage} -> ${classification.description} (reconnect: ${classification.requiresReconnection})`);

    return classification;
  }

  /**
   * Métriques de stabilité de connexion temps réel
   */
  getConnectionStabilityMetrics(): ConnectionStabilityMetrics {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Filtrer les événements de la dernière heure
    const recentEvents = this.connectionEvents.filter(e => e.timestamp > oneHourAgo);

    // Si pas d'événements récents, retourner 0
    if (recentEvents.length === 0) {
      return {
        uptimePercentage: 0,
        averageReconnectionTime: 0,
        disconnectFrequency: 0,
        connectionStabilityScore: 0,
        totalReconnections: this.reconnectionAttempts,
        successfulReconnections: this.reconnectionTimings.length,
        failedReconnections: this.reconnectionAttempts - this.reconnectionTimings.length
      };
    }

    // Trier les événements par timestamp
    recentEvents.sort((a, b) => a.timestamp - b.timestamp);

    let uptimeMs = 0;
    let lastEventTime = oneHourAgo;
    let isCurrentlyConnected = false;

    for (const event of recentEvents) {
      if (event.type === 'connect') {
        if (!isCurrentlyConnected) {
          // Nouvelle période de connexion
          isCurrentlyConnected = true;
        }
        // Le temps depuis le dernier événement jusqu'à maintenant compte comme uptime
        lastEventTime = event.timestamp;
      } else if (event.type === 'disconnect') {
        if (isCurrentlyConnected) {
          // Fin d'une période de connexion
          uptimeMs += event.timestamp - lastEventTime;
          isCurrentlyConnected = false;
        }
        lastEventTime = event.timestamp;
      }
    }

    // Si le dernier événement était une connexion, ajouter le temps jusqu'à maintenant
    const lastEvent = recentEvents[recentEvents.length - 1];
    if (lastEvent?.type === 'connect') {
      uptimeMs += now - lastEvent.timestamp;
    }

    const totalTimeMs = now - oneHourAgo;
    const uptimePercentage = Math.min(100, Math.max(0, (uptimeMs / totalTimeMs) * 100));

    // Calculer la fréquence des déconnexions
    const disconnectedEvents = recentEvents.filter(e => e.type === 'disconnect');
    const disconnectFrequency = disconnectedEvents.length;

    // Calculer le temps moyen de reconnexion
    const averageReconnectionTime = this.reconnectionTimings.length > 0
      ? this.reconnectionTimings.reduce((a, b) => a + b, 0) / this.reconnectionTimings.length
      : 0;

    // Score de stabilité (0-100)
    const stabilityScore = Math.max(0, Math.min(100,
      uptimePercentage - (disconnectFrequency * 5) - (averageReconnectionTime / 1000)
    ));

    return {
      uptimePercentage,
      averageReconnectionTime,
      disconnectFrequency,
      connectionStabilityScore: stabilityScore,
      totalReconnections: this.reconnectionAttempts,
      successfulReconnections: this.reconnectionTimings.length,
      failedReconnections: this.reconnectionAttempts - this.reconnectionTimings.length
    };
  }

  /**
   * Enregistre un événement de connexion pour les métriques
   */
  recordConnectionEvent(type: string, timestamp?: number): void {
    this.connectionEvents.push({
      type,
      timestamp: timestamp || Date.now()
    });

    // Garder seulement les 100 derniers événements
    if (this.connectionEvents.length > 100) {
      this.connectionEvents = this.connectionEvents.slice(-100);
    }

    // Métriques
    this.metricsCollector.recordMetric(
      `tiktok.connection.${type}`,
      1,
      'count',
      { correlationId: this.correlationId }
    );
  }



  /**
   * Calcule le temps écoulé depuis la dernière déconnexion
   */
  private getTimeSinceLastDisconnect(): number | undefined {
    const lastDisconnect = [...this.connectionEvents]
      .reverse()
      .find(e => e.type === 'disconnect');

    return lastDisconnect ? Date.now() - lastDisconnect.timestamp : undefined;
  }

  /**
   * Coordination avec le Circuit Breaker Pattern existant
   */
  canAttemptReconnection(circuitBreaker: ICircuitBreaker): boolean {
    const cbState = circuitBreaker.getState();

    // Ne pas tenter de reconnexion si Circuit Breaker est OPEN
    if (cbState === CircuitBreakerState.OPEN) {
      return false;
    }

    // Autoriser la reconnexion en HALF_OPEN (test de remise en service)
    if (cbState === CircuitBreakerState.HALF_OPEN) {
      return true;
    }

    // Vérifier les limites de tentatives de reconnexion
    if (this.reconnectionAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      return false;
    }

    // Vérifier si le mode fallback est actif (pas de reconnexion dans ce cas)
    if (circuitBreaker.isFallbackModeActive()) {
      return false;
    }

    return true;
  }

  /**
   * Métriques coordonnées avec le Circuit Breaker
   */
  getCoordinatedMetrics(circuitBreaker: ICircuitBreaker): CoordinatedMetrics {
    const baseMetrics = this.getConnectionStabilityMetrics();
    const cbMetrics = circuitBreaker.getMetrics();

    // Calculer la santé du Circuit Breaker (0-100)
    const cbHealth = cbMetrics.totalRequests > 0
      ? (cbMetrics.successfulRequests / cbMetrics.totalRequests) * 100
      : 100;

    // Score combiné pondéré
    const combinedScore = (baseMetrics.connectionStabilityScore * 0.7) + (cbHealth * 0.3);

    return {
      ...baseMetrics,
      circuitBreakerState: cbMetrics.state,
      combinedStabilityScore: Math.round(combinedScore),
      circuitBreakerHealth: Math.round(cbHealth)
    };
  }

  /**
   * Backoff exponentiel pour éviter surcharge TikTok
   */
  calculateReconnectionDelay(attemptNumber: number): number {
    // Validation des paramètres d'entrée
    if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
      console.warn(`[ReconnectionManager] Invalid attemptNumber: ${attemptNumber}, using 1`);
      attemptNumber = 1;
    }

    // Calcul exponentiel: baseDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay = this.RECONNECTION_BASE_DELAY *
      Math.pow(this.RECONNECTION_BACKOFF_MULTIPLIER, attemptNumber - 1);

    // Ajouter du jitter pour éviter les thundering herd
    const jitter = Math.random() * this.JITTER_FACTOR * exponentialDelay;
    const totalDelay = exponentialDelay + jitter;

    // Respecter le délai maximum et minimum
    const clampedDelay = Math.max(this.RECONNECTION_BASE_DELAY, Math.min(totalDelay, this.RECONNECTION_MAX_DELAY));

    return clampedDelay;
  }

  /**
   * Gestion des tentatives de reconnexion multiples
   */
  canAttemptMoreReconnections(): boolean {
    return this.reconnectionAttempts < this.MAX_RECONNECTION_ATTEMPTS;
  }

  getConsecutiveFailedAttempts(): number {
    return this.consecutiveFailedAttempts;
  }


  /**
   * Met à jour l'état de reconnexion et notifie les changements
   */
  setReconnectionState(state: ReconnectionState, reason?: string): void {
    const previousState = this.reconnectionState;
    this.previousReconnectionState = previousState;
    this.reconnectionState = state;

    // Émettre un événement de changement d'état si c'est un vrai changement
    if (previousState !== state) {
      this.emitReconnectionEvent('tiktok:reconnection:state:changed', {
        previousState,
        newState: state,
        reason: reason || 'state_transition',
        timestamp: new Date().toISOString()
      });
    }

    this.metricsCollector.recordMetric(
      'tiktok.reconnection.state',
      1,
      'count',
      {
        correlationId: this.correlationId,
        state: state
      }
    );
  }

  /**
   * Démarre une tentative de reconnexion et notifie
   */
  startReconnectionAttempt(reason?: string): void {
    this.currentReconnectionStart = Date.now();
    this.reconnectionState = ReconnectionState.RECONNECTING;
    this.lastReconnectionAttempt = new Date();
    this.reconnectionAttempts++;

    const delay = this.calculateReconnectionDelay(this.consecutiveFailedAttempts + 1);

    // Logging détaillé du début de reconnexion
    this.logReconnectionEvent('STARTED', {
      attempt: this.reconnectionAttempts,
      consecutiveFailures: this.consecutiveFailedAttempts,
      reason: reason || 'disconnection_detected',
      delay,
      uptimePercentage: this.getConnectionStabilityMetrics().uptimePercentage
    });

    this.emitReconnectionEvent('tiktok:reconnection:started', {
      reason: reason || 'disconnection_detected',
      attempt: this.reconnectionAttempts,
      consecutiveFailures: this.consecutiveFailedAttempts,
      delay,
      stabilityMetrics: this.getConnectionStabilityMetrics()
    });

    this.recordConnectionEvent('reconnection_start');
  }

  /**
   * Termine une tentative de reconnexion et notifie le résultat
   */
  endReconnectionAttempt(success: boolean, reason?: string): void {
    if (this.currentReconnectionStart) {
      const duration = Date.now() - this.currentReconnectionStart;

      if (success) {
        this.reconnectionTimings.push(duration);
        this.reconnectionState = ReconnectionState.CONNECTED;
        this.consecutiveFailedAttempts = 0; // Réinitialiser le compteur de succès

        // Garder seulement les 50 derniers timings
        if (this.reconnectionTimings.length > 50) {
          this.reconnectionTimings = this.reconnectionTimings.slice(-50);
        }

        // Logging détaillé du succès
        this.logReconnectionEvent('SUCCESS', {
          attempt: this.reconnectionAttempts,
          duration,
          totalAttempts: this.reconnectionAttempts,
          reason: reason || 'reconnection_successful',
          stabilityMetrics: this.getConnectionStabilityMetrics()
        });

        this.emitReconnectionEvent('tiktok:reconnection:success', {
          attempt: this.reconnectionAttempts,
          reconnectionTime: duration,
          totalAttempts: this.reconnectionAttempts,
          consecutiveFailures: this.consecutiveFailedAttempts,
          reason: reason || 'reconnection_successful'
        });

      } else {
        this.reconnectionState = ReconnectionState.RECONNECT_FAILED;
        this.consecutiveFailedAttempts++;

        // Logging détaillé de l'échec
        this.logReconnectionEvent('FAILED', {
          attempt: this.reconnectionAttempts,
          duration,
          consecutiveFailures: this.consecutiveFailedAttempts,
          reason: reason || 'reconnection_failed',
          willRetry: this.canAttemptMoreReconnections()
        });

        // Alerte sur échecs répétés
        if (this.consecutiveFailedAttempts >= 5) {
          this.logReconnectionEvent('ALERT', {
            message: `${this.consecutiveFailedAttempts} consecutive reconnection failures`,
            severity: 'high',
            stabilityScore: this.getConnectionStabilityMetrics().connectionStabilityScore
          });
        }

        this.emitReconnectionEvent('tiktok:reconnection:failed', {
          attempt: this.reconnectionAttempts,
          duration,
          consecutiveFailures: this.consecutiveFailedAttempts,
          reason: reason || 'reconnection_failed',
          willRetry: this.canAttemptMoreReconnections(),
          circuitBreakerState: 'unknown' // Sera défini par le caller
        });
      }

      this.currentReconnectionStart = undefined;
      this.recordConnectionEvent(success ? 'reconnection_success' : 'reconnection_failed');
    }
  }

  /**
   * Émet un événement de reconnexion via le connector
   */
  private emitReconnectionEvent(type: string, data: any): void {
    if (this.connector && typeof this.connector.emitEvent === 'function') {
      this.connector.emitEvent({
        type,
        timestamp: new Date(),
        correlationId: this.correlationId,
        data
      });
    }
  }

  /**
   * Logging détaillé des événements de reconnexion avec correlation IDs
   */
  private logReconnectionEvent(eventType: string, details: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      correlationId: this.correlationId,
      event: 'RECONNECTION',
      type: eventType,
      ...details
    };

    // Format structuré pour le logging
    const logMessage = `[${timestamp}] [${this.correlationId}] [RECONNECTION] ${eventType}`;

    switch (eventType) {
      case 'STARTED':
        console.log(`${logMessage} attempt: ${details.attempt}, consecutiveFailures: ${details.consecutiveFailures}, reason: ${details.reason}, delay: ${details.delay}ms, uptime: ${details.uptimePercentage?.toFixed(1)}%`);
        break;

      case 'SUCCESS':
        console.log(`${logMessage} attempt: ${details.attempt}, duration: ${details.duration}ms, reason: ${details.reason}, stability: ${details.stabilityMetrics?.connectionStabilityScore?.toFixed(1)}/100`);
        break;

      case 'FAILED':
        console.log(`${logMessage} attempt: ${details.attempt}, duration: ${details.duration}ms, consecutiveFailures: ${details.consecutiveFailures}, reason: ${details.reason}, willRetry: ${details.willRetry}`);
        break;

      case 'ALERT':
        console.log(`${logMessage} ALERT: ${details.message}, severity: ${details.severity}, stabilityScore: ${details.stabilityScore?.toFixed(1)}/100`);
        break;

      default:
        console.log(`${logMessage}`, JSON.stringify(details));
    }

    // Log structuré pour analyse (peut être envoyé à un système de logging externe)
    this.metricsCollector.recordMetric(
      'tiktok.reconnection.log',
      1,
      'count',
      {
        correlationId: this.correlationId,
        eventType,
        ...details
      }
    );
  }

  /**
   * Réinitialise les métriques (pour les tests)
   */
  reset(): void {
    this.reconnectionState = ReconnectionState.IDLE;
    this.lastReconnectionAttempt = undefined;
    this.reconnectionAttempts = 0;
    this.connectionEvents = [];
    this.reconnectionTimings = [];
    this.currentReconnectionStart = undefined;
    this.consecutiveFailedAttempts = 0;
  }
}