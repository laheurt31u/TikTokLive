/**
 * Tests E2E P0 - Reconnexion automatique et résilience
 * Scénario critique pour la disponibilité du système
 */

import { test, expect } from '@playwright/test';
import { waitForElement } from '../support/helpers/wait-for';
import { assertDegradedModeActive, assertWebSocketConnected } from '../support/helpers/assertions';
import { TEST_TIMEOUTS } from '../support/constants/timeouts';

test.describe('Reconnexion Automatique', () => {
  test('[P0] devrait se reconnecter automatiquement après une déconnexion temporaire', async ({ page }) => {
    // GIVEN: L'utilisateur est connecté à TikTok Live
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'valid-session-123');
    await page.fill('[data-testid="cookies-input"]', 'session-cookie=value123');
    await page.click('[data-testid="connect-button"]');

    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible();
    await assertWebSocketConnected(page);

    // WHEN: Une déconnexion temporaire se produit (réseau instable)
    await page.route('**/tiktok.com/**', route => route.abort());
    await page.click('[data-testid="simulate-temporary-disconnect"]');

    // THEN: Le système détecte la déconnexion
    await expect(page.locator('[data-testid="connection-status-disconnected"]')).toBeVisible();

    // AND: Le système commence les tentatives de reconnexion
    await expect(page.locator('[data-testid="reconnection-attempt"]')).toBeVisible();

    // AND: Après reconnexion réussie, l'état revient à connecté
    await page.route('**/tiktok.com/**', route => route.fulfill({ status: 200, body: '{}' }));
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible({ timeout: TEST_TIMEOUTS.RECONNECTION });
  });

  test('[P0] devrait activer le Circuit Breaker après plusieurs échecs de reconnexion', async ({ page }) => {
    // GIVEN: L'utilisateur est connecté
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'session-circuit-breaker-test');
    await page.fill('[data-testid="cookies-input"]', 'cookie=value');
    await page.click('[data-testid="connect-button"]');
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible();

    // WHEN: De multiples déconnexions se produisent en séquence
    for (let i = 0; i < 5; i++) {
      await page.route('**/tiktok.com/**', route => route.abort());
      await page.click('[data-testid="simulate-disconnect"]');
      await expect(page.locator('[data-testid="connection-status-disconnected"]')).toBeVisible();

      // Attendre que la reconnexion échoue - attente explicite de l'état
      await expect(page.locator('[data-testid="reconnection-attempt"]')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_VISIBILITY });
      // Attendre que la tentative échoue avant de continuer
      await expect(page.locator('[data-testid="connection-status-disconnected"]')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_VISIBILITY });
    }

    // THEN: Le Circuit Breaker s'active - attente explicite de l'état
    await expect(page.locator('[data-testid="circuit-breaker-open"]')).toBeVisible({ timeout: TEST_TIMEOUTS.CIRCUIT_BREAKER });

    // AND: Les tentatives de reconnexion sont stoppées temporairement
    await expect(page.locator('[data-testid="reconnection-paused"]')).toBeVisible();
  });

  test('[P0] devrait maintenir les données utilisateur pendant les reconnexions', async ({ page }) => {
    // GIVEN: Un quiz est en cours avec des participants actifs
    await page.goto('/quiz');

    // Simuler des utilisateurs avec des points
    const leaderboardData = [
      { username: 'user1', points: 25 },
      { username: 'user2', points: 18 },
      { username: 'user3', points: 12 }
    ];

    await page.evaluate((data) => {
      window.dispatchEvent(new CustomEvent('update-leaderboard', { detail: data }));
    }, leaderboardData);

    // Vérifier que le leaderboard est affiché
    await expect(page.locator('[data-testid="leaderboard-position-1"]')).toContainText('user1');
    await expect(page.locator('[data-testid="leaderboard-position-1"]')).toContainText('25');

    // WHEN: Une reconnexion se produit
    await page.route('**/tiktok.com/**', route => route.abort());
    await page.click('[data-testid="simulate-reconnect"]');

    // THEN: Les données du leaderboard sont préservées
    await expect(page.locator('[data-testid="leaderboard-position-1"]')).toContainText('user1');
    await expect(page.locator('[data-testid="leaderboard-position-1"]')).toContainText('25');

    // AND: Un indicateur montre que les données sont en cache
    await expect(page.locator('[data-testid="cached-data-indicator"]')).toBeVisible();
  });

  test('[P0] devrait passer en mode dégradé avec fonctionnalités limitées', async ({ page }) => {
    // GIVEN: Le système est connecté
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'session-degraded-test');
    await page.fill('[data-testid="cookies-input"]', 'cookie=value');
    await page.click('[data-testid="connect-button"]');
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible();

    // WHEN: Des erreurs persistantes empêchent la reconnexion
    await page.route('**/tiktok.com/**', route => route.abort());
    await page.click('[data-testid="simulate-persistent-failure"]');

    // THEN: Le mode dégradé s'active
    await assertDegradedModeActive(page, ['leaderboard', 'tts', 'question-display']);

    // AND: Certaines fonctionnalités sont désactivées
    await expect(page.locator('[data-testid="live-comments-disabled"]')).toBeVisible();
    await expect(page.locator('[data-testid="real-time-updates-paused"]')).toBeVisible();

    // AND: L'utilisateur est informé des capacités disponibles
    await expect(page.locator('[data-testid="degraded-capabilities-list"]')).toBeVisible();
  });

  test('[P0] devrait récupérer automatiquement du mode dégradé', async ({ page }) => {
    // GIVEN: Le système est en mode dégradé
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'session-recovery-test');
    await page.fill('[data-testid="cookies-input"]', 'cookie=value');
    await page.click('[data-testid="connect-button"]');

    // Simuler passage en mode dégradé
    await page.route('**/tiktok.com/**', route => route.abort());
    await page.click('[data-testid="force-degraded-mode"]');
    await assertDegradedModeActive(page, ['leaderboard', 'tts']);

    // WHEN: La connexion est restaurée
    await page.route('**/tiktok.com/**', route => route.fulfill({ status: 200, body: '{}' }));
    await page.click('[data-testid="simulate-connection-restored"]');

    // THEN: Le système quitte le mode dégradé
    await expect(page.locator('[data-testid="degraded-mode-indicator"]')).not.toBeVisible();

    // AND: Toutes les fonctionnalités sont restaurées
    await expect(page.locator('[data-testid="live-comments-active"]')).toBeVisible();
    await expect(page.locator('[data-testid="real-time-updates-active"]')).toBeVisible();

    // AND: Un message confirme la récupération
    await expect(page.locator('[data-testid="recovery-success-message"]')).toBeVisible();
  });

  test('[P0] devrait afficher les métriques de stabilité de connexion', async ({ page }) => {
    // GIVEN: Le système a eu plusieurs cycles de connexion/déconnexion
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'session-metrics-test');
    await page.fill('[data-testid="cookies-input"]', 'cookie=value');
    await page.click('[data-testid="connect-button"]');

    // Simuler plusieurs cycles
    for (let i = 0; i < 3; i++) {
      await page.route('**/tiktok.com/**', route => route.abort());
      await page.click('[data-testid="simulate-disconnect"]');
      // Attendre explicitement l'état déconnecté
      await expect(page.locator('[data-testid="connection-status-disconnected"]')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_VISIBILITY });

      await page.route('**/tiktok.com/**', route => route.fulfill({ status: 200, body: '{}' }));
      await page.click('[data-testid="simulate-reconnect"]');
      // Attendre explicitement l'état reconnecté
      await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible({ timeout: TEST_TIMEOUTS.RECONNECTION });
    }

    // WHEN: L'utilisateur consulte les métriques
    await page.click('[data-testid="show-connection-metrics"]');

    // THEN: Les métriques de stabilité sont affichées
    await expect(page.locator('[data-testid="uptime-percentage"]')).toBeVisible();
    await expect(page.locator('[data-testid="reconnection-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-reconnection-time"]')).toBeVisible();

    // AND: Un score de stabilité de connexion est calculé
    await expect(page.locator('[data-testid="connection-stability-score"]')).toBeVisible();
  });
});