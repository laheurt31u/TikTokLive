/**
 * Abstraction Layer pour tiktok-live-connector
 * Implémente l'intégration TikTok Live avec gestion des erreurs et événements
 */

import { TikTokLiveConnection, ControlEvent, WebcastEvent } from 'tiktok-live-connector';
import {
  TikTokConnectionStatus,
  TikTokConnectionConfig,
  TikTokEvent,
  TikTokComment,
  CircuitBreakerState
} from './types';
import { createConnectionConfig, detectEnvironment } from '../config/tiktok-connection';
import { TikTokCircuitBreaker } from './circuit-breaker';
import { TikTokEventManager } from './events';
import { TikTokCommentParser } from './parser';
import { ReconnectionManager, ExtendedConnectionStatus } from './reconnection-manager';
import { ReconnectionState } from './types';
import { DegradedModeManager } from './degraded-mode-manager';
import { CorrelationManager } from '../logger/correlation';
import { MetricsCollector, Metrics } from '../logger/metrics';

/**
 * Cache pour métadonnées fréquentes (session info, user data)
 */
class MetadataCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.TTL
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Batching pour événements haute fréquence
 */
class EventBatcher {
  private batch: TikTokEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_INTERVAL = 100; // 100ms

  constructor(private onBatch: (events: TikTokEvent[]) => void) {}

  addEvent(event: TikTokEvent): void {
    this.batch.push(event);

    // Batch par taille ou intervalle
    if (this.batch.length >= this.BATCH_SIZE) {
      this.flush();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flush(), this.BATCH_INTERVAL);
    }
  }

  flush(): void {
    if (this.batch.length > 0) {
      this.onBatch([...this.batch]);
      this.batch = [];
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  clear(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.batch = [];
  }
}

/**
 * Connecteur TikTok Live avec gestion robuste des connexions
 */
export class TikTokConnector {
  private connector: TikTokLiveConnection | null = null;
  private connectionConfig: TikTokConnectionConfig | null = null;
  private connectionStatus: TikTokConnectionStatus = {
    connected: false,
    retryCount: 0
  };
  private eventListeners: Map<string, (event: TikTokEvent) => void> = new Map();
  private correlationId: string;
  private circuitBreaker: TikTokCircuitBreaker | null = null;
  private reconnectionManager: ReconnectionManager | null = null;
  private degradedModeManager: DegradedModeManager | null = null;
  private isReconnecting = false; // Flag pour empêcher les reconnexions concurrentes
  private eventManager: TikTokEventManager;
  private metadataCache: MetadataCache;
  private commentBatcher: EventBatcher;

  constructor(uniqueId?: string) {
    // Générer un correlation ID unique pour cette instance
    this.correlationId = uniqueId || CorrelationManager.generateId();

    // Initialiser le gestionnaire d'événements
    this.eventManager = new TikTokEventManager(this.correlationId);

    // Initialiser les optimisations performance
    this.metadataCache = new MetadataCache();
    this.commentBatcher = new EventBatcher((events) => {
      // Traiter le batch d'événements commentaires
      this.processCommentBatch(events);
    });
  }

  /**
   * Initialise la connexion TikTok avec les credentials fournis et la configuration
   */
  async initialize(
    sessionId: string,
    cookies: string,
    customConfig?: Partial<TikTokConnectionConfig>
  ): Promise<void> {
    // Créer la configuration de connexion en incluant les credentials
    const environment = detectEnvironment();
    const configWithCredentials = {
      sessionId,
      cookies,
      ...customConfig
    };
    const connectionConfig = createConnectionConfig(configWithCredentials, environment);

    // Créer le connecteur TikTok avec la configuration complète et optimisations
    this.connector = new TikTokLiveConnection(sessionId, {
      // Note: tiktok-live-connector utilise ses propres paramètres de timeout/retry
      // Notre configuration est utilisée pour notre logique métier (Circuit Breaker, etc.)

      // Optimisations performance temps réel
      enableRequestPolling: true, // Polling activé pour fallback
      requestPollingIntervalMs: 1000, // Intervalle polling
      // Note: Message batching géré côté application via EventBatcher
    });

    // Stocker la configuration pour usage ultérieur
    this.connectionConfig = connectionConfig;

    // Initialiser le Circuit Breaker
    this.circuitBreaker = new TikTokCircuitBreaker(connectionConfig);

    // Initialiser le Reconnection Manager
    this.reconnectionManager = new ReconnectionManager(this, this.correlationId);

    // Initialiser le Degraded Mode Manager
    this.degradedModeManager = new DegradedModeManager(this, this.correlationId);

    this.setupEventHandlers();
  }

  /**
   * Parse les cookies depuis la chaîne de caractères
   */
  private parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};

    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
    });

    return cookies;
  }

  /**
   * Traite un batch d'événements commentaires pour optimisations performance
   */
  private processCommentBatch(events: TikTokEvent[]): void {
    const batchSize = events.length;
    const startBatchTime = Date.now();

    // Optimisation: regrouper les métriques similaires
    const sessionIds = new Set(events.map(e => e.data?.sessionId).filter(Boolean));
    const avgLatency = events.reduce((sum, e) => sum + (e.latency ?? 0), 0) / batchSize;

    // Métriques de batch
    MetricsCollector.recordMetric(
      'comment.batch.size',
      batchSize,
      'count',
      { correlationId: this.correlationId }
    );

    MetricsCollector.recordMetric(
      'comment.batch.latency',
      avgLatency,
      'ms',
      { correlationId: this.correlationId }
    );

    // Émettre chaque événement du batch
    events.forEach(event => {
      this.emitEvent(event);
    });

    const batchProcessingTime = Date.now() - startBatchTime;

    // Monitoring performance du batching
    if (batchProcessingTime > 50) { // Plus de 50ms pour traiter un batch
      console.warn(`Traitement batch lent: ${batchProcessingTime}ms pour ${batchSize} événements`);
    }
  }

  /**
   * Parse et valide les données de commentaire TikTok via le parser dédié
   */
  private parseAndValidateComment(rawMessage: any, receivedAt: number): TikTokComment | null {
    const comment = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

    // Ajouter le sessionId correct si le commentaire a été parsé
    if (comment) {
      comment.sessionId = this.connectionConfig?.sessionId || 'unknown-session';
    }

    return comment;
  }

  /**
   * Configure les gestionnaires d'événements
   */
  private setupEventHandlers(): void {
    if (!this.connector) return;

    // Événement de connexion
    this.connector.on(ControlEvent.CONNECTED, async (connectionState: any) => {
      this.connectionStatus.connected = true;
      this.connectionStatus.lastConnected = new Date();
      this.connectionStatus.retryCount = 0;

      // Mettre à jour l'état de reconnexion
      if (this.reconnectionManager) {
        const wasReconnecting = this.reconnectionManager.getExtendedConnectionStatus().reconnectionState === 'RECONNECTING';

        if (wasReconnecting) {
          // Reconexion réussie - désactiver le mode dégradé
          this.reconnectionManager.endReconnectionAttempt(true, 'connection_restored');
          this.reconnectionManager.setReconnectionState(ReconnectionState.CONNECTED, 'reconnection_successful');

          if (this.degradedModeManager && this.degradedModeManager.isDegradedModeActive()) {
            this.degradedModeManager.deactivateDegradedMode();
          }
        } else {
          // Connexion initiale réussie
          this.reconnectionManager.setReconnectionState(ReconnectionState.CONNECTED, 'initial_connection_successful');
        }
        this.reconnectionManager.recordConnectionEvent('connect');
      }

      // Métriques de connexion réussie
      MetricsCollector.recordConnection(
        'tiktok-connect',
        CorrelationManager.getElapsedTime(),
        true,
        this.connectionStatus.retryCount,
        { connectorId: this.correlationId }
      );

      await this.eventManager.processConnectionEvent(connectionState, (event) => this.emitEvent(event));
    });

    // Événement d'erreur
    this.connector.on(ControlEvent.ERROR, async (error: any) => {
      this.connectionStatus.lastError = error instanceof Error ? error.message : String(error);

      // Gérer les états de reconnexion selon le type d'erreur
      if (this.reconnectionManager) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const classification = this.reconnectionManager.classifyDisconnectReason(errorMessage);

        // Activer le mode dégradé dès qu'il y a une erreur de connexion
        if (this.degradedModeManager && !this.degradedModeManager.isDegradedModeActive()) {
          this.degradedModeManager.activateDegradedMode(`connection_error: ${classification.description}`);
        }

        if (classification.requiresReconnection && this.reconnectionManager.canAttemptReconnection(this.circuitBreaker!)) {
          // Démarrer la reconnexion automatique
          this.reconnectionManager.startReconnectionAttempt(classification.description);
          this.scheduleAutomaticReconnection(classification);
        } else {
          // Erreur non-reconnexion - notifier l'échec
          this.reconnectionManager.setReconnectionState(ReconnectionState.DISCONNECTED, classification.description);

          // Émettre un événement d'échec de reconnexion
          if (this.reconnectionManager.getExtendedConnectionStatus().reconnectionState === 'RECONNECTING') {
            this.reconnectionManager.endReconnectionAttempt(false, classification.description);
          }
        }
      }

      // Enregistrer l'erreur dans les métriques
      MetricsCollector.recordError(
        error instanceof Error ? error : new Error(String(error)),
        'high',
        {
          connectorId: this.correlationId,
          operation: 'tiktok-live-connection'
        }
      );

      await this.eventManager.processErrorEvent(error, (event) => this.emitEvent(event));
    });

    // Événement de déconnexion
    this.connector.on(ControlEvent.DISCONNECTED, async (disconnectInfo: any) => {
      this.connectionStatus.connected = false;

      // Gérer la transition d'état de reconnexion
      if (this.reconnectionManager) {
        const reason = disconnectInfo?.reason || 'unknown_disconnect';
        const classification = this.reconnectionManager.classifyDisconnectReason(reason);

        if (classification.requiresReconnection && this.reconnectionManager.canAttemptReconnection(this.circuitBreaker!)) {
          // Activer le mode dégradé avant de commencer la reconnexion
          if (this.degradedModeManager) {
            this.degradedModeManager.activateDegradedMode(classification.description);
          }

          // Démarrer la reconnexion automatique
          this.reconnectionManager.startReconnectionAttempt(classification.description);
          this.scheduleAutomaticReconnection(classification);
        } else {
          // Pas de reconnexion possible
          this.reconnectionManager.setReconnectionState(ReconnectionState.DISCONNECTED, classification.description);
        }

        this.reconnectionManager.recordConnectionEvent('disconnect');
      }

      await this.eventManager.processDisconnectEvent(disconnectInfo, (event) => this.emitEvent(event));
    });

    // Événement de commentaire (message du chat)
    // Implémentation selon les spécifications de la story 1.2
    this.connector.on(WebcastEvent.CHAT, async (message: any) => {
      await this.eventManager.processCommentEvent(
        message,
        (msg, time) => this.parseAndValidateComment(msg, time),
        () => this.circuitBreaker?.recordCommentSuccess(),
        () => this.circuitBreaker?.recordCommentFailure(),
        (event) => {
          if (event.type === 'comment') {
            // Utiliser le batching pour optimiser les émissions haute fréquence
            this.commentBatcher.addEvent(event);
          } else {
            // Événements d'erreur sont émis immédiatement
            this.emitEvent(event);
          }
        }
      );
    });
  }

  /**
   * Émet un événement aux listeners enregistrés
   */
  private emitEvent(event: TikTokEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Erreur dans le listener d\'événement TikTok:', error);
      }
    });
  }

  /**
   * Enregistre un listener pour les événements
   */
  onEvent(listener: (event: TikTokEvent) => void): string {
    const listenerId = `listener-${Date.now()}-${Math.random()}`;
    this.eventListeners.set(listenerId, listener);
    return listenerId;
  }

  /**
   * Supprime un listener d'événement
   */
  removeEventListener(listenerId: string): void {
    this.eventListeners.delete(listenerId);
  }

  /**
   * Connecte au live TikTok avec protection Circuit Breaker
   */
  async connect(uniqueId: string): Promise<void> {
    if (!this.connector) {
      throw new Error('Connecteur non initialisé. Appelez initialize() d\'abord.');
    }

    if (!this.circuitBreaker) {
      throw new Error('Circuit Breaker non initialisé.');
    }

    // Créer un contexte de corrélation pour cette connexion
    await CorrelationManager.runInContext(
      { operation: 'tiktok-connect', uniqueId },
      async () => {
        try {
          // Mesurer le temps de connexion avec protection Circuit Breaker
          await Metrics.time(
            'tiktok-connection',
            async () => {
              return await this.circuitBreaker!.execute(async () => {
                this.connectionStatus.retryCount++;
                await this.connector!.connect(uniqueId);
              }, `tiktok-connect-${uniqueId}`);
            },
            { uniqueId, connectorId: this.correlationId }
          );

          // Succès de la connexion
          this.connectionStatus.connected = true;
          this.connectionStatus.retryCount = 0;
          this.connectionStatus.lastConnected = new Date();

        } catch (error) {
          this.connectionStatus.lastError = error instanceof Error ? error.message : 'Erreur inconnue';

          // Vérifier si on est en mode fallback
          if (this.circuitBreaker!.isFallbackModeActive()) {
            this.emitEvent({
              type: 'fallback',
              timestamp: new Date(),
              correlationId: this.correlationId,
              data: { reason: 'Circuit Breaker activé', originalError: this.connectionStatus.lastError }
            });
          }

          throw error;
        }
      }
    );
  }

  /**
   * Arrête la connexion au live TikTok
   * Note: tiktok-live-connector gère automatiquement la reconnexion,
   * cette méthode force l'arrêt définitif
   */
  async disconnect(): Promise<void> {
    // tiktok-live-connector n'a pas de méthode disconnect() publique
    // On marque simplement comme déconnecté
    this.connectionStatus.connected = false;

    // Émettre un événement de déconnexion manuelle
    this.emitEvent({
      type: 'disconnect',
      timestamp: new Date(),
      correlationId: this.correlationId,
      data: { manual: true }
    });
  }

  /**
   * Obtient le statut de connexion actuel
   */
  getConnectionStatus(): TikTokConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Obtient le statut étendu de connexion avec états de reconnexion
   */
  getExtendedConnectionStatus(): ExtendedConnectionStatus {
    if (!this.reconnectionManager) {
      // Fallback si pas initialisé
      return {
        ...this.connectionStatus,
        reconnectionState: ReconnectionState.IDLE,
        reconnectionAttempts: 0,
        stabilityMetrics: {
          uptimePercentage: 0,
          averageReconnectionTime: 0,
          disconnectFrequency: 0,
          connectionStabilityScore: 0,
          totalReconnections: 0,
          successfulReconnections: 0,
          failedReconnections: 0
        }
      };
    }

    return this.reconnectionManager.getExtendedConnectionStatus();
  }

  /**
   * Obtient le correlation ID de cette instance
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Obtient la configuration de connexion actuelle
   */
  getConnectionConfig(): TikTokConnectionConfig | null {
    return this.connectionConfig;
  }

  /**
   * Obtient les métriques du Circuit Breaker
   */
  getCircuitBreakerMetrics() {
    return this.circuitBreaker?.getMetrics();
  }

  /**
   * Obtient l'état du Circuit Breaker
   */
  getCircuitBreakerState(): CircuitBreakerState | null {
    return this.circuitBreaker?.getState() || null;
  }

  /**
   * Vérifie si le mode fallback est actif
   */
  isFallbackModeActive(): boolean {
    return this.circuitBreaker?.isFallbackModeActive() || false;
  }

  /**
   * Obtient l'historique des retry récents
   */
  getRetryHistory(minutes: number = 5) {
    return this.circuitBreaker?.getRetryHistory(minutes) || [];
  }

  /**
   * Obtient le taux de succès des connexions
   */
  getConnectionSuccessRate(): number {
    return this.circuitBreaker?.getSuccessRate() || 0;
  }

  /**
   * Obtient des métadonnées du cache (session info, etc.)
   */
  getCachedMetadata(key: string): any | null {
    return this.metadataCache.get(key);
  }

  /**
   * Stocke des métadonnées en cache
   */
  setCachedMetadata(key: string, data: any): void {
    this.metadataCache.set(key, data);

    MetricsCollector.recordMetric(
      'cache.metadata.set',
      1,
      'count',
      {
        correlationId: this.correlationId,
        cacheKey: key.substring(0, 50) // Tronquer pour métriques
      }
    );
  }

  /**
   * Force l'émission immédiate des événements batchés (flush)
   */
  flushCommentBatch(): void {
    this.commentBatcher.flush();
  }

  /**
   * Obtient les métriques de performance temps réel
   */
  getPerformanceMetrics(): {
    avgCommentLatency: number;
    batchEfficiency: number;
    cacheHitRate: number;
    connectionHealth: number;
  } {
    const recentMetrics = MetricsCollector.getRecentMetrics(5); // 5 minutes

    const commentLatencies = recentMetrics
      .filter(m => m.name === 'comment.latency')
      .map(m => m.value);

    const avgCommentLatency = commentLatencies.length > 0
      ? commentLatencies.reduce((a, b) => a + b, 0) / commentLatencies.length
      : 0;

    // Calculer l'efficacité du batching (événements par batch)
    const batchSizes = recentMetrics
      .filter(m => m.name === 'comment.batch.size')
      .map(m => m.value);

    const batchEfficiency = batchSizes.length > 0
      ? batchSizes.reduce((a, b) => a + b, 0) / batchSizes.length
      : 1;

    // Taux de succès connexion (estimé)
    const connectionHealth = this.circuitBreaker?.getSuccessRate() || 0;

    // Cache hit rate (simplifié - à implémenter plus tard si nécessaire)
    const cacheHitRate = 0.8; // Placeholder

    return {
      avgCommentLatency,
      batchEfficiency,
      cacheHitRate,
      connectionHealth
    };
  }

  /**
   * Vérifie si le mode polling fallback est actif pour les commentaires
   */
  isPollingFallbackActive(): boolean {
    return this.circuitBreaker?.isPollingFallbackActive() || false;
  }

  /**
   * Obtient les métriques de commentaires du circuit breaker
   */
  getCommentMetrics() {
    return this.circuitBreaker?.getCommentMetrics();
  }

  /**
   * Obtient le taux de succès des commentaires
   */
  getCommentSuccessRate(): number {
    return this.circuitBreaker?.getCommentSuccessRate() || 0;
  }

  /**
   * Force la désactivation du mode polling fallback
   */
  forceDeactivatePollingFallback(): void {
    this.circuitBreaker?.deactivatePollingFallback();
  }

  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    await this.disconnect();

    // Flush tous les batches en attente
    this.commentBatcher.flush();

    this.eventListeners.clear();
    this.metadataCache.clear();

    // Reset du Circuit Breaker pour permettre une réutilisation
    if (this.circuitBreaker) {
      this.circuitBreaker.reset();
    }

    // Reset du Reconnection Manager
    if (this.reconnectionManager) {
      this.reconnectionManager.reset();
    }

    // Reset du Degraded Mode Manager
    if (this.degradedModeManager) {
      this.degradedModeManager.reset();
    }
  }

  /**
   * Mode dégradé - Vérifier si actif
   */
  isDegradedModeActive(): boolean {
    return this.degradedModeManager?.isDegradedModeActive() || false;
  }

  /**
   * Mode dégradé - Obtenir les capacités disponibles
   */
  getDegradedModeCapabilities(): { available: string[]; unavailable: string[]; estimatedRecoveryTime: number } | null {
    if (!this.degradedModeManager) return null;

    return {
      available: this.degradedModeManager.getAvailableCapabilities(),
      unavailable: this.degradedModeManager.getUnavailableCapabilities(),
      estimatedRecoveryTime: this.degradedModeManager.getEstimatedRecoveryTime()
    };
  }

  /**
   * Mode dégradé - Accès aux commentaires mis en cache
   */
  getCachedComments(): any[] {
    return this.degradedModeManager?.getCachedComments() || [];
  }

  /**
   * Mode dégradé - Accès au leaderboard mis en cache
   */
  getCachedLeaderboard(): any[] {
    return this.degradedModeManager?.getCachedLeaderboard() || [];
  }

  /**
   * Mode dégradé - Obtenir les données de synchronisation
   */
  getSynchronizationData(): any {
    return this.degradedModeManager?.getSynchronizationData() || { comments: [], gifts: [], follows: [], likes: [], shares: [], totalEvents: 0 };
  }

  /**
   * Planifie une reconnexion automatique avec backoff exponentiel
   */
  private async scheduleAutomaticReconnection(classification: any): Promise<void> {
    if (!this.reconnectionManager || !this.circuitBreaker) return;

    // Prévention des reconnexions concurrentes
    if (this.isReconnecting) {
      console.log('[Reconnection] Tentative de reconnexion concurrente ignorée - une reconnexion est déjà en cours');
      return;
    }

    this.isReconnecting = true;

    try {
      // Le startReconnectionAttempt() a déjà été appelé dans le gestionnaire d'événement

      // Calculer le délai de backoff
      const delay = this.reconnectionManager.calculateReconnectionDelay(
        this.reconnectionManager.getConsecutiveFailedAttempts() + 1
      );

      console.log(`Reconnexion automatique planifiée dans ${delay}ms (raison: ${classification.description})`);

      // Attendre le délai
      await new Promise(resolve => setTimeout(resolve, delay));

      // Vérifier si on peut encore tenter (Circuit Breaker pas OPEN)
      if (!this.reconnectionManager.canAttemptReconnection(this.circuitBreaker)) {
        this.reconnectionManager.endReconnectionAttempt(false, 'circuit_breaker_open');
        this.reconnectionManager.setReconnectionState(ReconnectionState.DISCONNECTED, 'circuit_breaker_prevented_reconnection');
        return;
      }

      // Tenter la reconnexion
      this.reconnectionManager.setReconnectionState(ReconnectionState.CONNECTING, 'attempting_reconnection');

      try {
        await this.connect(this.correlationId);
        // La méthode connect() mettra à jour l'état si réussie
      } catch (error) {
        // Échec de reconnexion
        this.reconnectionManager.endReconnectionAttempt(false, error instanceof Error ? error.message : 'connection_failed');

        // Programmer une nouvelle tentative si possible
        if (this.reconnectionManager.canAttemptMoreReconnections()) {
          setTimeout(() => {
            this.scheduleAutomaticReconnection(classification);
          }, 1000); // Petit délai avant retry
        } else {
          this.reconnectionManager.setReconnectionState(ReconnectionState.DISCONNECTED, 'max_reconnection_attempts_exceeded');
        }
      }

      // Réinitialiser le flag de reconnexion
      this.isReconnecting = false;

    } catch (error) {
      console.error('Erreur lors de la reconnexion automatique:', error);
      this.reconnectionManager?.endReconnectionAttempt(false, 'unexpected_reconnection_error');
      this.reconnectionManager?.setReconnectionState(ReconnectionState.DISCONNECTED, 'reconnection_system_error');

      // Réinitialiser le flag de reconnexion même en cas d'erreur
      this.isReconnecting = false;
    }
  }
}

/**
 * Factory pour créer des instances de connecteur TikTok
 */
export class TikTokConnectorFactory {
  private static instances: Map<string, TikTokConnector> = new Map();

  /**
   * Crée ou récupère une instance de connecteur pour un ID unique
   */
  static getConnector(uniqueId: string): TikTokConnector {
    if (!this.instances.has(uniqueId)) {
      this.instances.set(uniqueId, new TikTokConnector(uniqueId));
    }

    return this.instances.get(uniqueId)!;
  }

  /**
   * Supprime une instance de connecteur
   */
  static removeConnector(uniqueId: string): void {
    const connector = this.instances.get(uniqueId);
    if (connector) {
      connector.cleanup();
      this.instances.delete(uniqueId);
    }
  }

  /**
   * Nettoie toutes les instances
   */
  static cleanupAll(): void {
    this.instances.forEach(connector => connector.cleanup());
    this.instances.clear();
  }
}