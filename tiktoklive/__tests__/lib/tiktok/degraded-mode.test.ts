/**
 * Tests pour le mode dégradé pendant les reconnexions
 */

import { DegradedModeManager } from '../../../lib/tiktok/degraded-mode-manager';

// Mock des dépendances
jest.mock('../../../lib/logger/correlation', () => ({
  CorrelationManager: {
    generateId: () => 'test-correlation-id',
    getElapsedTime: () => 1000
  }
}));

jest.mock('../../../lib/logger/metrics', () => ({
  MetricsCollector: {
    recordMetric: jest.fn(),
    recordConnection: jest.fn(),
    recordError: jest.fn()
  }
}));

describe('DegradedModeManager - Mode dégradé pendant reconnexion', () => {
  let degradedModeManager: DegradedModeManager;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockEventEmitter = {
      emit: jest.fn()
    };

    degradedModeManager = new DegradedModeManager(mockEventEmitter, 'test-correlation-id');
  });

  describe('Activation automatique du mode dégradé pendant reconnexion', () => {
    test('devrait activer le mode dégradé automatiquement lors du début de reconnexion', () => {
      degradedModeManager.activateDegradedMode('tiktok_server_error');

      expect(degradedModeManager.isDegradedModeActive()).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tiktok:degraded-mode:activated',
          data: expect.objectContaining({
            reason: 'tiktok_server_error',
            capabilities: expect.any(Array)
          })
        })
      );
    });

    test('devrait exposer les capacités disponibles en mode dégradé', () => {
      degradedModeManager.activateDegradedMode('network_timeout');

      const capabilities = degradedModeManager.getAvailableCapabilities();

      expect(capabilities).toContain('comment-history');
      expect(capabilities).toContain('cached-leaderboard');
      expect(capabilities).toContain('offline-analytics');
      expect(capabilities).not.toContain('live-comments'); // Not available in degraded mode
    });

    test('devrait notifier les clients des capacités réduites', () => {
      degradedModeManager.activateDegradedMode('connection_lost');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tiktok:degraded-mode:capabilities',
          data: expect.objectContaining({
            available: expect.any(Array),
            unavailable: expect.any(Array),
            estimatedRecoveryTime: expect.any(Number)
          })
        })
      );
    });
  });

  describe('Gestion des données en mode dégradé', () => {
    test('devrait permettre l\'accès aux commentaires mis en cache', () => {
      degradedModeManager.activateDegradedMode('reconnection_attempt');

      // Simuler des commentaires mis en cache
      const cachedComments = [
        { id: '1', text: 'Hello cached', timestamp: new Date() },
        { id: '2', text: 'World cached', timestamp: new Date() }
      ];

      degradedModeManager.setCachedComments(cachedComments);

      expect(degradedModeManager.getCachedComments()).toEqual(cachedComments);
      expect(degradedModeManager.getCachedCommentsCount()).toBe(2);
    });

    test('devrait maintenir un leaderboard mis en cache', () => {
      degradedModeManager.activateDegradedMode('network_issue');

      const cachedLeaderboard = [
        { userId: 'user1', username: 'Alice', score: 100 },
        { userId: 'user2', username: 'Bob', score: 80 }
      ];

      degradedModeManager.setCachedLeaderboard(cachedLeaderboard);

      expect(degradedModeManager.getCachedLeaderboard()).toEqual(cachedLeaderboard);
    });

    test('devrait estimer le temps de récupération basé sur l\'historique', () => {
      // Simuler plusieurs périodes de dégradation avec différents temps de récupération
      degradedModeManager.activateDegradedMode('test1');

      // Simuler une récupération après 5 secondes
      (degradedModeManager as any).recoveryHistory = [5000];
      degradedModeManager.deactivateDegradedMode();

      // Activer à nouveau et vérifier l'estimation
      degradedModeManager.activateDegradedMode('test2');
      const recoveryEstimate = degradedModeManager.getEstimatedRecoveryTime();

      expect(recoveryEstimate).toBeGreaterThan(0);
      expect(recoveryEstimate).toBeLessThanOrEqual(300000); // Max 5 minutes
    });
  });

  describe('Récupération transparente lors de la reconnexion réussie', () => {
    test('devrait désactiver le mode dégradé lors de la reconnexion réussie', () => {
      degradedModeManager.activateDegradedMode('connection_lost');
      expect(degradedModeManager.isDegradedModeActive()).toBe(true);

      degradedModeManager.deactivateDegradedMode();

      expect(degradedModeManager.isDegradedModeActive()).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tiktok:degraded-mode:deactivated',
          data: expect.objectContaining({
            recoverySuccessful: true,
            totalDowntime: expect.any(Number)
          })
        })
      );
    });

    test('devrait synchroniser les données après récupération', () => {
      degradedModeManager.activateDegradedMode('reconnection');

      // Simuler des données accumulées pendant le mode dégradé
      const missedComment = { id: 'missed1', text: 'Missed during outage', timestamp: new Date() };

      degradedModeManager.addMissedComment(missedComment);

      // Récupération
      degradedModeManager.deactivateDegradedMode();

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'tiktok:degraded-mode:sync',
            data: expect.objectContaining({
              comments: [missedComment],
              totalEvents: 1
            })
          })
        );
    });

    test('devrait mesurer et reporter le temps d\'indisponibilité total', () => {
      degradedModeManager.activateDegradedMode('test_downtime');

      // Simuler un délai en manipulant directement les timestamps
      (degradedModeManager as any).activationTime = new Date(Date.now() - 5000); // 5 seconds ago

      degradedModeManager.deactivateDegradedMode();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tiktok:degraded-mode:deactivated',
          data: expect.objectContaining({
            totalDowntime: expect.any(Number)
          })
        })
      );
    });
  });

  describe('Synchronisation des données manquées pendant l\'indisponibilité', () => {
    test('devrait accumuler les commentaires manqués pendant l\'indisponibilité', () => {
      degradedModeManager.activateDegradedMode('connection_down');

      const missedComment1 = { id: 'm1', text: 'Missed 1', timestamp: new Date() };
      const missedComment2 = { id: 'm2', text: 'Missed 2', timestamp: new Date() };

      degradedModeManager.addMissedComment(missedComment1);
      degradedModeManager.addMissedComment(missedComment2);

      expect(degradedModeManager.getMissedComments()).toHaveLength(2);
      expect(degradedModeManager.getMissedComments()).toContain(missedComment1);
      expect(degradedModeManager.getMissedComments()).toContain(missedComment2);
    });

    test('devrait synchroniser automatiquement lors de la récupération', () => {
      degradedModeManager.activateDegradedMode('sync_test');

      degradedModeManager.addMissedComment({ id: 'sync1', text: 'Sync test', timestamp: new Date() });

      degradedModeManager.deactivateDegradedMode();

      // Vérifier que la synchronisation a été déclenchée
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tiktok:degraded-mode:sync'
        })
      );
    });

    test('devrait gérer la priorité des données synchronisées', () => {
      degradedModeManager.activateDegradedMode('priority_test');

      // Ajouter différents types de données manquées
      degradedModeManager.addMissedComment({ id: 'c1', text: 'Comment' });
      degradedModeManager.addMissedEvent('gift', { id: 'g1', amount: 100 });
      degradedModeManager.addMissedEvent('follow', { id: 'f1', follower: 'user123' });

      const syncData = degradedModeManager.getSynchronizationData();

      expect(syncData).toHaveProperty('comments');
      expect(syncData).toHaveProperty('gifts');
      expect(syncData).toHaveProperty('follows');
      expect(syncData.comments).toHaveLength(1);
      expect(syncData.gifts).toHaveLength(1);
      expect(syncData.follows).toHaveLength(1);
    });
  });
});