/**
 * Gestionnaire du mode dégradé pendant les reconnexions TikTok
 * Fournit une expérience de fallback lorsque la connexion principale est indisponible
 */

import { CorrelationManager } from '../logger/correlation';
import { MetricsCollector } from '../logger/metrics';

export interface DegradedModeCapabilities {
  available: string[];
  unavailable: string[];
  estimatedRecoveryTime: number;
}

export interface SynchronizationData {
  comments: any[];
  gifts: any[];
  follows: any[];
  likes: any[];
  shares: any[];
  totalEvents: number;
}

export interface MissedEvent {
  type: string;
  data: any;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Gestionnaire spécialisé pour le mode dégradé pendant les reconnexions
 */
export class DegradedModeManager {
  private isActive = false;
  private activationTime?: Date;
  private deactivationTime?: Date;
  private activationReason = '';
  private recoveryHistory: number[] = []; // Durées de récupération en ms

  // Données mises en cache pour le mode dégradé
  private cachedComments: any[] = [];
  private cachedLeaderboard: any[] = [];

  // Données manquées pendant l'indisponibilité
  private missedComments: any[] = [];
  private missedEvents: MissedEvent[] = [];

  // Capacités du mode dégradé
  private readonly AVAILABLE_CAPABILITIES = [
    'comment-history',      // Accès aux commentaires mis en cache
    'cached-leaderboard',   // Leaderboard mis en cache
    'offline-analytics',    // Statistiques hors ligne
    'user-management',      // Gestion utilisateurs (locale)
    'settings-access'       // Accès aux paramètres
  ];

  private readonly UNAVAILABLE_CAPABILITIES = [
    'live-comments',        // Commentaires en temps réel
    'live-gifts',          // Cadeaux en temps réel
    'live-follows',        // Follows en temps réel
    'real-time-leaderboard', // Leaderboard temps réel
    'live-chat-interaction'  // Interaction chat live
  ];

  constructor(
    private eventEmitter: any,
    private correlationId: string = CorrelationManager.generateId()
  ) {}

  /**
   * Activation automatique du mode dégradé pendant reconnexion
   */
  activateDegradedMode(reason: string): void {
    if (this.isActive) return; // Déjà actif

    this.isActive = true;
    this.activationTime = new Date();
    this.activationReason = reason;

    // Calculer le temps de récupération estimé basé sur l'historique
    const estimatedRecoveryTime = this.calculateEstimatedRecoveryTime();

    // Notifier l'activation du mode dégradé
    this.eventEmitter.emit({
      type: 'tiktok:degraded-mode:activated',
      timestamp: new Date(),
      correlationId: this.correlationId,
      data: {
        reason,
        activationTime: this.activationTime,
        capabilities: this.getAvailableCapabilities(),
        estimatedRecoveryTime
      }
    });

    // Notifier les capacités disponibles
    this.notifyCapabilities();

    // Métriques
    MetricsCollector.recordMetric(
      'tiktok.degraded_mode.activated',
      1,
      'count',
      {
        correlationId: this.correlationId,
        reason
      }
    );

    console.log(`[${new Date().toISOString()}] [${this.correlationId}] [DEGRADED_MODE] ACTIVATED: ${reason}, estimated recovery: ${estimatedRecoveryTime}ms`);
  }

  /**
   * Récupération transparente lors de la reconnexion réussie
   */
  deactivateDegradedMode(): void {
    if (!this.isActive) return;

    this.deactivationTime = new Date();
    const totalDowntime = this.activationTime
      ? this.deactivationTime.getTime() - this.activationTime.getTime()
      : 0;

    // Enregistrer la durée de récupération pour l'historique
    if (totalDowntime > 0) {
      this.recoveryHistory.push(totalDowntime);
      if (this.recoveryHistory.length > 10) { // Garder les 10 dernières
        this.recoveryHistory = this.recoveryHistory.slice(-10);
      }
    }

    // Notifier la désactivation
    this.eventEmitter.emit({
      type: 'tiktok:degraded-mode:deactivated',
      timestamp: new Date(),
      correlationId: this.correlationId,
      data: {
        reason: 'reconnection_successful',
        activationTime: this.activationTime,
        deactivationTime: this.deactivationTime,
        totalDowntime,
        recoverySuccessful: true
      }
    });

    // Synchroniser les données manquées
    this.synchronizeMissedData();

    // Reset
    this.isActive = false;
    this.activationTime = undefined;
    this.activationReason = '';

    // Métriques
    MetricsCollector.recordMetric(
      'tiktok.degraded_mode.deactivated',
      1,
      'count',
      {
        correlationId: this.correlationId,
        totalDowntime: totalDowntime.toString()
      }
    );

    console.log(`[${new Date().toISOString()}] [${this.correlationId}] [DEGRADED_MODE] DEACTIVATED: downtime ${totalDowntime}ms`);
  }

  /**
   * Synchronisation des données manquées pendant l'indisponibilité
   */
  private synchronizeMissedData(): void {
    if (this.missedComments.length === 0 && this.missedEvents.length === 0) return;

    try {
      const syncData: SynchronizationData = {
        comments: [...this.missedComments],
        gifts: this.missedEvents.filter(e => e.type === 'gift').map(e => e.data),
        follows: this.missedEvents.filter(e => e.type === 'follow').map(e => e.data),
        likes: this.missedEvents.filter(e => e.type === 'like').map(e => e.data),
        shares: this.missedEvents.filter(e => e.type === 'share').map(e => e.data),
        totalEvents: this.missedComments.length + this.missedEvents.length
      };

      // Notifier la synchronisation
      this.eventEmitter.emit({
        type: 'tiktok:degraded-mode:sync',
        timestamp: new Date(),
        correlationId: this.correlationId,
        data: syncData
      });

      // Vider les données synchronisées
      this.missedComments = [];
      this.missedEvents = [];

      console.log(`[${new Date().toISOString()}] [${this.correlationId}] [DEGRADED_MODE] SYNC: ${syncData.totalEvents} missed events synchronized`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [${this.correlationId}] [DEGRADED_MODE] Erreur lors de la synchronisation:`, error);

      // En cas d'erreur, ne pas vider les données pour permettre une nouvelle tentative
      // Mais logger l'erreur pour monitoring
      MetricsCollector.recordError(
        error instanceof Error ? error : new Error('Degraded mode sync error'),
        'medium',
        { correlationId: this.correlationId, missedEvents: this.missedEvents.length.toString() }
      );
    }
  }

  /**
   * Gestion des données en mode dégradé
   */
  setCachedComments(comments: any[]): void {
    this.cachedComments = [...comments];
  }

  getCachedComments(): any[] {
    return [...this.cachedComments];
  }

  getCachedCommentsCount(): number {
    return this.cachedComments.length;
  }

  setCachedLeaderboard(leaderboard: any[]): void {
    this.cachedLeaderboard = [...leaderboard];
  }

  getCachedLeaderboard(): any[] {
    return [...this.cachedLeaderboard];
  }

  /**
   * Gestion des données manquées
   */
  addMissedComment(comment: any): void {
    if (this.isActive) {
      this.missedComments.push(comment);
    }
  }

  getMissedComments(): any[] {
    return [...this.missedComments];
  }

  addMissedEvent(type: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    if (this.isActive) {
      this.missedEvents.push({
        type,
        data,
        timestamp: new Date(),
        priority
      });
    }
  }

  getMissedEvents(): MissedEvent[] {
    return [...this.missedEvents];
  }

  getSynchronizationData(): SynchronizationData {
    return {
      comments: [...this.missedComments],
      gifts: this.missedEvents.filter(e => e.type === 'gift').map(e => e.data),
      follows: this.missedEvents.filter(e => e.type === 'follow').map(e => e.data),
      likes: this.missedEvents.filter(e => e.type === 'like').map(e => e.data),
      shares: this.missedEvents.filter(e => e.type === 'share').map(e => e.data),
      totalEvents: this.missedComments.length + this.missedEvents.length
    };
  }

  /**
   * Capacités du mode dégradé
   */
  getAvailableCapabilities(): string[] {
    return [...this.AVAILABLE_CAPABILITIES];
  }

  getUnavailableCapabilities(): string[] {
    return [...this.UNAVAILABLE_CAPABILITIES];
  }

  private notifyCapabilities(): void {
    const capabilities: DegradedModeCapabilities = {
      available: this.getAvailableCapabilities(),
      unavailable: this.getUnavailableCapabilities(),
      estimatedRecoveryTime: this.getEstimatedRecoveryTime()
    };

    this.eventEmitter.emit({
      type: 'tiktok:degraded-mode:capabilities',
      timestamp: new Date(),
      correlationId: this.correlationId,
      data: capabilities
    });
  }

  /**
   * Estimation du temps de récupération
   */
  getEstimatedRecoveryTime(): number {
    if (this.recoveryHistory.length === 0) {
      return 30000; // 30 secondes par défaut
    }

    // Calculer la moyenne des récupérations précédentes
    const averageRecovery = this.recoveryHistory.reduce((a, b) => a + b, 0) / this.recoveryHistory.length;

    // Ajouter une marge de sécurité (20%)
    const estimatedTime = averageRecovery * 1.2;

    // Limiter entre 10 secondes et 5 minutes
    return Math.max(10000, Math.min(estimatedTime, 300000));
  }

  private calculateEstimatedRecoveryTime(): number {
    return this.getEstimatedRecoveryTime();
  }

  /**
   * État du mode dégradé
   */
  isDegradedModeActive(): boolean {
    return this.isActive;
  }

  getActivationReason(): string {
    return this.activationReason;
  }

  getActivationTime(): Date | undefined {
    return this.activationTime;
  }

  getTotalDowntime(): number {
    if (!this.activationTime) return 0;

    const endTime = this.deactivationTime || new Date();
    return endTime.getTime() - this.activationTime.getTime();
  }

  /**
   * Reset pour les tests
   */
  reset(): void {
    this.isActive = false;
    this.activationTime = undefined;
    this.deactivationTime = undefined;
    this.activationReason = '';
    this.cachedComments = [];
    this.cachedLeaderboard = [];
    this.missedComments = [];
    this.missedEvents = [];
  }
}