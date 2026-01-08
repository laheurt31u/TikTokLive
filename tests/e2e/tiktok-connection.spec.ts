/**
 * Tests E2E P0 - Connexion TikTok Live
 * Scénario critique pour la fonctionnalité de base du système
 */

import { test, expect } from '@playwright/test';
import { tiktokTest } from '../support/fixtures/auth.fixture';
import { waitForElement, waitForNetworkResponse } from '../support/helpers/wait-for';
import { assertTikTokConnectionError, assertWebSocketConnected } from '../support/helpers/assertions';

test.describe('Connexion TikTok Live', () => {
  test('[P0] devrait se connecter avec des credentials valides et recevoir des commentaires', async ({ page }) => {
    // GIVEN: L'application est chargée et prête pour la connexion TikTok
    await page.goto('/');
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();

    // WHEN: L'utilisateur saisit des credentials TikTok valides et se connecte
    await page.fill('[data-testid="session-id-input"]', 'valid-session-123');
    await page.fill('[data-testid="cookies-input"]', 'session-cookie=value123');
    await page.click('[data-testid="connect-button"]');

    // THEN: La connexion réussit et l'état de connexion indique "connecté"
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible();

    // AND: WebSocket est connecté pour les mises à jour temps réel
    await assertWebSocketConnected(page);

    // AND: L'indicateur de réception de commentaires est actif
    await expect(page.locator('[data-testid="comments-receiving"]')).toBeVisible();
  });

  test('[P0] devrait afficher une erreur pour des credentials invalides', async ({ page }) => {
    // GIVEN: L'application est chargée
    await page.goto('/');
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();

    // WHEN: L'utilisateur saisit des credentials invalides et tente de se connecter
    await page.fill('[data-testid="session-id-input"]', 'invalid-session');
    await page.fill('[data-testid="cookies-input"]', 'invalid-cookie');
    await page.click('[data-testid="connect-button"]');

    // THEN: Une erreur d'authentification est affichée
    await assertTikTokConnectionError(page, 'auth');

    // AND: L'état de connexion indique "déconnecté"
    await expect(page.locator('[data-testid="connection-status-disconnected"]')).toBeVisible();
  });

  test('[P0] devrait gérer la perte de connexion et se reconnecter automatiquement', async ({ page }) => {
    // GIVEN: L'utilisateur est connecté à TikTok Live
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'valid-session-123');
    await page.fill('[data-testid="cookies-input"]', 'session-cookie=value123');
    await page.click('[data-testid="connect-button"]');
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible();

    // WHEN: La connexion réseau est perdue (simulé)
    await page.route('**/tiktok.com/**', route => route.abort());
    await page.click('[data-testid="simulate-network-loss"]');

    // THEN: Le système détecte la perte de connexion
    await expect(page.locator('[data-testid="connection-status-reconnecting"]')).toBeVisible();

    // AND: Le système tente de se reconnecter automatiquement
    await expect(page.locator('[data-testid="reconnection-attempt"]')).toBeVisible();

    // AND: Après reconnexion réussie, l'état revient à "connecté"
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible({ timeout: 30000 });
  });

  test('[P0] devrait activer le mode dégradé en cas d\'erreur réseau persistante', async ({ page }) => {
    // GIVEN: L'utilisateur tente de se connecter
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'session-with-network-issues');
    await page.fill('[data-testid="cookies-input"]', 'cookie=value');

    // WHEN: Des erreurs réseau persistantes empêchent la connexion
    await page.route('**/tiktok.com/**', route => route.abort());
    await page.click('[data-testid="connect-button"]');

    // THEN: Après plusieurs tentatives, le mode dégradé s'active
    await expect(page.locator('[data-testid="degraded-mode-indicator"]')).toBeVisible();

    // AND: Les capacités disponibles en mode dégradé sont affichées
    await expect(page.locator('[data-testid="capability-leaderboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="capability-tts"]')).toBeVisible();
  });

  test('[P0] devrait afficher les métriques de connexion en temps réel', async ({ page }) => {
    // GIVEN: L'utilisateur est connecté
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'valid-session-123');
    await page.fill('[data-testid="cookies-input"]', 'session-cookie=value123');
    await page.click('[data-testid="connect-button"]');
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible();

    // WHEN: Le système reçoit des commentaires
    // (Simulation via mock ou vrai trafic)

    // THEN: Les métriques temps réel sont affichées
    await expect(page.locator('[data-testid="connection-uptime"]')).toBeVisible();
    await expect(page.locator('[data-testid="comments-per-minute"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
  });
});