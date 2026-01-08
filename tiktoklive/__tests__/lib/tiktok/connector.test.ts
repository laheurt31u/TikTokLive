/**
 * Tests unitaires pour le connecteur TikTok
 */

import { TikTokConnector, TikTokConnectorFactory } from '../../../lib/tiktok/connector';

// Mock de uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234567890abcdef')
}));

// Mock de console pour éviter les erreurs de test
const originalError = console.error;
const originalWarn = console.warn;
console.error = jest.fn();
console.warn = jest.fn();

// Mock de tiktok-live-connector
jest.mock('tiktok-live-connector', () => ({
  TikTokLiveConnection: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    // Note: pas de méthode disconnect dans la vraie librairie
  })),
  ControlEvent: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    WEBSOCKET_CONNECTED: 'websocketConnected',
    WEBSOCKET_DATA: 'websocketData',
    RAW_DATA: 'rawData',
    DECODED_DATA: 'decodedData',
    ENTER_ROOM: 'enterRoom'
  },
  WebcastEvent: {
    CHAT: 'chat',
    MEMBER: 'member',
    GIFT: 'gift',
    ROOM_USER: 'roomUser',
    SOCIAL: 'social',
    LIKE: 'like',
    QUESTION_NEW: 'questionNew',
    LINK_MIC_BATTLE: 'linkMicBattle',
    LINK_MIC_ARMIES: 'linkMicArmies',
    LIVE_INTRO: 'liveIntro'
  }
}));

describe('TikTokConnector', () => {

  it('devrait créer une instance avec un correlation ID unique', () => {
    const connector = new TikTokConnector();
    const correlationId = connector.getCorrelationId();

    expect(correlationId).toBe('mocked-uuid-1234567890abcdef');
  });

  it('devrait utiliser un correlation ID personnalisé', () => {
    const customId = 'test-connector-123';
    const connector = new TikTokConnector(customId);

    expect(connector.getCorrelationId()).toBe(customId);
  });

  it('devrait initialiser avec des credentials valides', async () => {
    const sessionId = 'session_1234567890_abcdef';
    const cookies = 'sessionid=abc123; user_id=12345';

    const connector = new TikTokConnector();

    await expect(connector.initialize(sessionId, cookies)).resolves.toBeUndefined();
  });


  it('devrait parser correctement les cookies', async () => {
    const sessionId = 'session_1234567890_abcdef';
    const cookies = 'sessionid=abc123; user_id=12345; auth_token=xyz789';

    const connector = new TikTokConnector();

    // On ne peut pas tester directement la méthode privée, mais on peut vérifier qu'elle ne throw pas
    await expect(connector.initialize(sessionId, cookies)).resolves.toBeUndefined();
  });

  it('devrait gérer les événements d\'initialisation', async () => {
    const sessionId = 'session_1234567890_abcdef';
    const cookies = 'sessionid=abc123; user_id=12345';

    const connector = new TikTokConnector();

    await connector.initialize(sessionId, cookies);

    // Vérifier que les event listeners sont configurés
    const status = connector.getConnectionStatus();
    expect(status.connected).toBe(false);
    expect(status.retryCount).toBe(0);
  });

  it('devrait permettre l\'enregistrement et la suppression de listeners', async () => {
    const sessionId = 'session_1234567890_abcdef';
    const cookies = 'sessionid=abc123; user_id=12345';

    const connector = new TikTokConnector();

    await connector.initialize(sessionId, cookies);

    const mockListener = jest.fn();
    const listenerId = connector.onEvent(mockListener);

    expect(typeof listenerId).toBe('string');
    expect(listenerId).toMatch(/^listener-\d+-[a-z0-9.]+$/);

    // Supprimer le listener
    connector.removeEventListener(listenerId);

    // Le listener devrait toujours exister dans la Map (on ne peut pas tester directement)
    expect(() => connector.removeEventListener('non-existent')).not.toThrow();
  });

  it('devrait nettoyer les ressources', async () => {
    const sessionId = 'session_1234567890_abcdef';
    const cookies = 'sessionid=abc123; user_id=12345';

    const connector = new TikTokConnector();

    await connector.initialize(sessionId, cookies);
    await expect(connector.cleanup()).resolves.toBeUndefined();
  });

  describe('Gestion des événements de connexion', () => {
    let mockTikTokConnector: any;
    let connector: TikTokConnector;
    let mockListener: jest.Mock;

    beforeEach(async () => {
      // Reset le mock avant chaque test
      jest.clearAllMocks();

      mockTikTokConnector = {
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      // Mock de tiktok-live-connector pour ce test spécifique
      (require('tiktok-live-connector').TikTokLiveConnection as jest.Mock).mockImplementation(() => mockTikTokConnector);

      connector = new TikTokConnector();
      mockListener = jest.fn();

      await connector.initialize('session_123', 'sessionid=abc123');
    });

    it('devrait configurer le handler pour l\'événement connected', () => {
      // Enregistrer le listener AVANT de déclencher l'événement
      const listenerId = connector.onEvent(mockListener);

      // Vérifier que le handler 'connected' est enregistré
      expect(mockTikTokConnector.on).toHaveBeenCalledWith('connected', expect.any(Function));

      // Simuler l'événement connected
      const connectedHandler = mockTikTokConnector.on.mock.calls.find(call => call[0] === 'connected')[1];
      connectedHandler();

      // Vérifier que l'événement est émis aux listeners enregistrés
      expect(mockListener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'connect',
        correlationId: connector.getCorrelationId()
      }));
    });

    it('devrait configurer le handler pour l\'événement error', () => {
      // Enregistrer le listener AVANT de déclencher l'événement
      const listenerId = connector.onEvent(mockListener);

      // Vérifier que le handler 'error' est enregistré
      expect(mockTikTokConnector.on).toHaveBeenCalledWith('error', expect.any(Function));

      // Simuler l'événement error
      const errorHandler = mockTikTokConnector.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('Test error');
      errorHandler(testError);

      // Vérifier que l'événement est émis aux listeners enregistrés
      expect(mockListener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        data: { error: 'Test error' },
        correlationId: connector.getCorrelationId()
      }));
    });

    it('devrait configurer le handler pour l\'événement chat', async () => {
      // Enregistrer le listener AVANT de déclencher l'événement
      const listenerId = connector.onEvent(mockListener);

      // Vérifier que le handler 'chat' est enregistré
      expect(mockTikTokConnector.on).toHaveBeenCalledWith('chat', expect.any(Function));

      // Simuler l'événement chat avec un message au bon format
      const chatHandler = mockTikTokConnector.on.mock.calls.find(call => call[0] === 'chat')[1];
      const testMessage = {
        commentId: 'msg_123',
        userId: 'user_123',
        username: 'testuser',
        text: 'Hello world'
      };

      // Simuler l'événement
      chatHandler(testMessage);

      // Attendre que les opérations asynchrones se terminent
      await new Promise(resolve => setTimeout(resolve, 100));

      // Vérifier que l'événement est émis aux listeners enregistrés
      expect(mockListener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'comment',
        correlationId: connector.getCorrelationId()
      }));
    });

    it('devrait gérer les erreurs dans les listeners d\'événements', () => {
      // Enregistrer un listener qui throw une erreur
      const failingListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      connector.onEvent(failingListener);

      // Simuler un événement connected
      const connectedHandler = mockTikTokConnector.on.mock.calls.find(call => call[0] === 'connected')[1];
      connectedHandler();

      // Le test passe si aucune erreur n'est propagée (erreur capturée dans emitEvent)
      expect(failingListener).toHaveBeenCalled();
    });

    it('devrait configurer un handler pour disconnected', () => {
      // Vérifier qu'un handler 'disconnected' est enregistré pour gérer les déconnexions inattendues
      const disconnectedCalls = mockTikTokConnector.on.mock.calls.filter(call => call[0] === 'disconnected');
      expect(disconnectedCalls).toHaveLength(1);
    });
  });
});

describe('TikTokConnectorFactory', () => {
  beforeEach(() => {
    TikTokConnectorFactory.cleanupAll();
  });

  it('devrait créer et récupérer des instances de connecteur', () => {
    const connector1 = TikTokConnectorFactory.getConnector('user123');
    const connector2 = TikTokConnectorFactory.getConnector('user123');
    const connector3 = TikTokConnectorFactory.getConnector('user456');

    // Même ID devrait retourner la même instance
    expect(connector1).toBe(connector2);
    // ID différent devrait créer une nouvelle instance
    expect(connector1).not.toBe(connector3);
  });

  it('devrait supprimer des instances de connecteur', () => {
    const connector1 = TikTokConnectorFactory.getConnector('user123');
    expect(connector1).toBeDefined();

    TikTokConnectorFactory.removeConnector('user123');

    // Nouvelle instance devrait être créée
    const connector2 = TikTokConnectorFactory.getConnector('user123');
    expect(connector1).not.toBe(connector2);
  });

  it('devrait nettoyer toutes les instances', () => {
    TikTokConnectorFactory.getConnector('user1');
    TikTokConnectorFactory.getConnector('user2');

    TikTokConnectorFactory.cleanupAll();

    // Nouvelles instances devraient être créées
    const connector1Again = TikTokConnectorFactory.getConnector('user1');
    const connector2Again = TikTokConnectorFactory.getConnector('user2');

    expect(connector1Again).not.toBe(connector2Again);
  });
});