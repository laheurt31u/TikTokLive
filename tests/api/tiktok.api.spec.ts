/**
 * Tests d'intégration pour l'API REST /api/tiktok
 * Couvre les endpoints: POST /connect, GET /status, DELETE /disconnect
 * Priorité: P0 (connexion critique) et P1 (gestion de l'état)
 */

import { test, expect } from '@playwright/test';

test.describe('API TikTok - Connexion', () => {
  test('[P0] POST /api/tiktok/connect - devrait se connecter avec des credentials valides', async ({ request }) => {
    // GIVEN: Des credentials TikTok valides
    const credentials = {
      sessionId: 'test-session-123',
      cookies: 'session-cookie=value123; other-cookie=value456',
    };

    // WHEN: Connexion via API
    const response = await request.post('/api/tiktok/connect', {
      data: credentials,
    });

    // THEN: Retourne 200 avec statut "connecting"
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      status: 'connecting',
      message: 'Connexion TikTok initiée',
    });
    expect(body.data.correlationId).toBeTruthy();
  });

  test('[P0] POST /api/tiktok/connect - devrait retourner 400 pour sessionId manquant', async ({ request }) => {
    // GIVEN: Credentials incomplets (sessionId manquant)
    const credentials = {
      cookies: 'session-cookie=value123',
    };

    // WHEN: Tentative de connexion
    const response = await request.post('/api/tiktok/connect', {
      data: credentials,
    });

    // THEN: Retourne 400 avec erreur de validation
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('invalides');
  });

  test('[P0] POST /api/tiktok/connect - devrait retourner 400 pour cookies manquant', async ({ request }) => {
    // GIVEN: Credentials incomplets (cookies manquant)
    const credentials = {
      sessionId: 'test-session-123',
    };

    // WHEN: Tentative de connexion
    const response = await request.post('/api/tiktok/connect', {
      data: credentials,
    });

    // THEN: Retourne 400 avec erreur de validation
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('[P1] POST /api/tiktok/connect - devrait accepter des paramètres optionnels (timeout, retryAttempts, retryDelay)', async ({ request }) => {
    // GIVEN: Credentials avec paramètres optionnels
    const credentials = {
      sessionId: 'test-session-123',
      cookies: 'session-cookie=value123',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 5000,
    };

    // WHEN: Connexion avec paramètres optionnels
    const response = await request.post('/api/tiktok/connect', {
      data: credentials,
    });

    // THEN: Retourne 200 (paramètres optionnels acceptés)
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('[P1] POST /api/tiktok/connect - devrait utiliser les variables d\'environnement si credentials non fournis', async ({ request }) => {
    // GIVEN: Requête sans credentials (doit utiliser env vars)
    // Note: Ce test nécessite que les env vars soient configurées dans le test
    const credentials = {};

    // WHEN: Tentative de connexion sans credentials explicites
    const response = await request.post('/api/tiktok/connect', {
      data: credentials,
    });

    // THEN: Retourne 400 si env vars non configurées, sinon 200
    // (Le comportement exact dépend de la configuration du test)
    expect([400, 200]).toContain(response.status());
    const body = await response.json();
    if (response.status() === 400) {
      expect(body.error.code).toBe('MISSING_CREDENTIALS');
    }
  });
});

test.describe('API TikTok - Statut', () => {
  test('[P0] GET /api/tiktok/status - devrait retourner disconnected quand aucune connexion active', async ({ request }) => {
    // GIVEN: Aucune connexion TikTok active

    // WHEN: Récupération du statut
    const response = await request.get('/api/tiktok/status');

    // THEN: Retourne 200 avec statut "disconnected"
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      connected: false,
      status: 'disconnected',
    });
    expect(body.data.message).toContain('Aucune connexion');
  });

  test('[P1] GET /api/tiktok/status - devrait retourner le statut de connexion après connexion', async ({ request }) => {
    // GIVEN: Connexion TikTok établie
    await request.post('/api/tiktok/connect', {
      data: {
        sessionId: 'test-session-123',
        cookies: 'session-cookie=value123',
      },
    });

    // WHEN: Récupération du statut
    const response = await request.get('/api/tiktok/status');

    // THEN: Retourne 200 avec informations de statut
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('connected');
    expect(body.data).toHaveProperty('status');
    expect(body.data.correlationId).toBeTruthy();
  });

  test('[P1] GET /api/tiktok/status - devrait inclure les métriques de connexion (lastConnected, retryCount)', async ({ request }) => {
    // GIVEN: Connexion TikTok établie
    await request.post('/api/tiktok/connect', {
      data: {
        sessionId: 'test-session-123',
        cookies: 'session-cookie=value123',
      },
    });

    // WHEN: Récupération du statut
    const response = await request.get('/api/tiktok/status');

    // THEN: Retourne les métriques de connexion
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('lastConnected');
    expect(body.data).toHaveProperty('retryCount');
  });
});

test.describe('API TikTok - Déconnexion', () => {
  test('[P0] DELETE /api/tiktok/disconnect - devrait fermer la connexion active', async ({ request }) => {
    // GIVEN: Connexion TikTok établie
    await request.post('/api/tiktok/connect', {
      data: {
        sessionId: 'test-session-123',
        cookies: 'session-cookie=value123',
      },
    });

    // WHEN: Déconnexion via API
    const response = await request.delete('/api/tiktok/disconnect');

    // THEN: Retourne 200 avec statut "disconnected"
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      status: 'disconnected',
      message: 'Connexion TikTok fermée',
    });
    expect(body.data.correlationId).toBeTruthy();
  });

  test('[P1] DELETE /api/tiktok/disconnect - devrait retourner success même si aucune connexion active', async ({ request }) => {
    // GIVEN: Aucune connexion TikTok active

    // WHEN: Tentative de déconnexion
    const response = await request.delete('/api/tiktok/disconnect');

    // THEN: Retourne 200 avec message approprié
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('Aucune connexion active');
  });

  test('[P1] GET /api/tiktok/status - devrait retourner disconnected après déconnexion', async ({ request }) => {
    // GIVEN: Connexion puis déconnexion
    await request.post('/api/tiktok/connect', {
      data: {
        sessionId: 'test-session-123',
        cookies: 'session-cookie=value123',
      },
    });
    await request.delete('/api/tiktok/disconnect');

    // WHEN: Vérification du statut
    const response = await request.get('/api/tiktok/status');

    // THEN: Retourne disconnected
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.connected).toBe(false);
    expect(body.data.status).toBe('disconnected');
  });
});
