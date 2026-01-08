/**
 * Fixtures WebSocket pour tests E2E - Mock WebSocket avec auto-cleanup
 * Utilise les patterns network-first pour éviter les race conditions
 */

import { test as base } from '@playwright/test';

interface WebSocketFixture {
  mockWebSocket: {
    emit: (event: string, data: unknown) => Promise<void>;
    disconnect: () => Promise<void>;
  };
}

/**
 * Fixture pour mock WebSocket avec auto-cleanup
 */
export const test = base.extend<WebSocketFixture>({
  /**
   * Mock WebSocket avec helpers pour émettre des événements
   */
  mockWebSocket: async ({ page }, use) => {
    // Setup: Créer un mock WebSocket dans le contexte de la page
    await page.addInitScript(() => {
      // Mock global WebSocket si nécessaire
      (window as any).mockWebSocketEvents = [];
    });

    const mockWebSocket = {
      /**
       * Émet un événement WebSocket simulé
       */
      emit: async (event: string, data: unknown) => {
        await page.evaluate(({ event, data }) => {
          // Simuler l'événement WebSocket via CustomEvent
          window.dispatchEvent(new CustomEvent(`websocket-${event}`, {
            detail: data
          }));

          // Également via l'API native si disponible
          if ((window as any).socket) {
            (window as any).socket.emit(event, data);
          }
        }, { event, data });
      },

      /**
       * Déconnecte le WebSocket mocké
       */
      disconnect: async () => {
        await page.evaluate(() => {
          if ((window as any).socket) {
            (window as any).socket.disconnect();
          }
        });
      }
    };

    // Utiliser dans le test
    await use(mockWebSocket);

    // Cleanup: Déconnecter automatiquement après le test
    await mockWebSocket.disconnect();
  },
});
