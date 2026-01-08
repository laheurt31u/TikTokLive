/**
 * Tests pour le serveur WebSocket TikTokLive
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { TikTokWebSocketServer } from '../../../lib/websocket/server';

// Mock des dépendances
jest.mock('../../../lib/logger/correlation', () => ({
  CorrelationManager: {
    generateId: () => 'test-ws-correlation-id'
  }
}));

jest.mock('../../../lib/logger/metrics', () => ({
  MetricsCollector: {
    recordMetric: jest.fn(),
    recordConnection: jest.fn(),
    recordError: jest.fn()
  }
}));

describe('TikTokWebSocketServer', () => {
  let httpServer: HTTPServer;
  let wsServer: TikTokWebSocketServer;
  let clientSocket: ClientSocket;
  const PORT = 3001;
  const SERVER_URL = `http://localhost:${PORT}`;

  beforeAll((done) => {
    // Créer un serveur HTTP de test
    httpServer = new HTTPServer();
    httpServer.listen(PORT, () => {
      wsServer = new TikTokWebSocketServer();
      wsServer.initialize(httpServer);
      done();
    });
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    await wsServer.close();
    httpServer.close();
  });

  beforeEach((done) => {
    clientSocket = Client(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  describe('Connexion client', () => {
    test('devrait accepter les connexions WebSocket', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    test('devrait diffuser les événements TikTok aux clients connectés', (done) => {
      const testEvent = {
        type: 'tiktok:reconnection:started',
        timestamp: new Date(),
        correlationId: 'test-correlation',
        data: {
          reason: 'test_disconnection',
          attempt: 1
        }
      };

      // Écouter l'événement sur le client
      clientSocket.on('tiktok:reconnection:started', (receivedEvent) => {
        expect(receivedEvent.reason).toBe('test_disconnection');
        expect(receivedEvent.attempt).toBe(1);
        done();
      });

      // Simuler l'émission d'un événement depuis le connecteur
      // (Dans un vrai scénario, cela viendrait du TikTokConnector)
      const mockEventEmitter = {
        emit: (event: any) => {
          // Simuler l'appel interne au WebSocket server
          if (wsServer && typeof (wsServer as any).broadcastTikTokEvent === 'function') {
            (wsServer as any).broadcastTikTokEvent(event);
          }
        }
      };

      mockEventEmitter.emit(testEvent);
    });

    test('devrait gérer la déconnexion des clients', (done) => {
      clientSocket.on('disconnect', () => {
        // Le serveur devrait avoir nettoyé la connexion
        const stats = (wsServer as any).getStats();
        expect(stats.connectedClients).toBe(0);
        done();
      });

      clientSocket.disconnect();
    });
  });

  describe('Gestion des événements', () => {
    test('devrait diffuser plusieurs types d\'événements de reconnexion', (done) => {
      let eventsReceived = 0;
      const expectedEvents = [
        'tiktok:reconnection:started',
        'tiktok:reconnection:success',
        'tiktok:reconnection:failed'
      ];

      expectedEvents.forEach(eventType => {
        clientSocket.on(eventType, () => {
          eventsReceived++;
          if (eventsReceived === expectedEvents.length) {
            done();
          }
        });
      });

      // Simuler l'émission des événements
      const mockEventEmitter = {
        emit: (event: any) => {
          if (wsServer && typeof (wsServer as any).broadcastTikTokEvent === 'function') {
            (wsServer as any).broadcastTikTokEvent(event);
          }
        }
      };

      expectedEvents.forEach(eventType => {
        mockEventEmitter.emit({
          type: eventType,
          timestamp: new Date(),
          correlationId: 'test-correlation',
          data: { test: true }
        });
      });
    });
  });

  describe('Statistiques du serveur', () => {
    test('devrait fournir des statistiques de connexion', () => {
      const stats = (wsServer as any).getStats();

      expect(typeof stats.connectedClients).toBe('number');
      expect(typeof stats.totalClients).toBe('number');
      expect(typeof stats.uptime).toBe('number');
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });
});