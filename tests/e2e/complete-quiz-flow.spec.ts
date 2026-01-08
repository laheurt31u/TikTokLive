/**
 * Tests E2E P0 - Parcours complet du quiz TikTok Live
 * Scénarios critiques pour le fonctionnement core de l'application
 */

import { test, expect } from '@playwright/test';

test.describe('Parcours Complet Quiz', () => {
  test('[P0] devrait compléter le parcours complet : Connexion → Question → Réponse → Points → Leaderboard', async ({ page }) => {
    // GIVEN: L'application est chargée et prête
    await page.goto('/');

    // Network-first: Intercepter les routes WebSocket et API AVANT navigation
    const questionPromise = page.waitForResponse((resp) => 
      resp.url().includes('/api/questions') && resp.status() === 200
    );
    const leaderboardPromise = page.waitForResponse((resp) => 
      resp.url().includes('/api/leaderboard') && resp.status() === 200
    );

    // WHEN: L'utilisateur se connecte à TikTok Live
    await page.fill('[data-testid="session-id-input"]', 'test-session-123');
    await page.fill('[data-testid="cookies-input"]', 'session-cookie=value123');
    await page.click('[data-testid="connect-button"]');

    // THEN: La connexion réussit
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible();

    // AND: Une question est chargée et affichée sur l'overlay
    await questionPromise;
    await page.goto('/overlay');
    await expect(page.locator('[data-testid="question-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="question-text"]')).toContainText(/Quelle est/);

    // AND: Le timer est actif
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
    const initialTime = await page.locator('[data-testid="timer-value"]').textContent();
    expect(initialTime).toMatch(/\d+/);

    // WHEN: Un commentaire avec la bonne réponse est détecté dans le chat TikTok
    // Simuler la réception d'un commentaire via WebSocket
    await page.evaluate(() => {
      // Simuler l'événement WebSocket 'comment:received'
      window.dispatchEvent(new CustomEvent('tiktok-comment', {
        detail: {
          username: 'TestUser123',
          text: 'Paris',
          timestamp: Date.now()
        }
      }));
    });

    // THEN: La réponse est validée et le gagnant est identifié
    await expect(page.locator('[data-testid="winner-overlay"]')).toBeVisible();
    await expect(page.locator('[data-testid="winner-username"]')).toContainText('TestUser123');

    // AND: Les points sont attribués
    await expect(page.locator('[data-testid="points-awarded"]')).toBeVisible();
    const pointsText = await page.locator('[data-testid="points-value"]').textContent();
    expect(pointsText).toMatch(/\d+/);

    // AND: Le leaderboard est mis à jour en temps réel
    await leaderboardPromise;
    await expect(page.locator('[data-testid="leaderboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="leaderboard-entry"]').first()).toContainText('TestUser123');
  });

  test('[P0] devrait faire tourner automatiquement les questions après expiration', async ({ page }) => {
    // GIVEN: L'utilisateur est connecté et une question est active
    await page.goto('/');
    await page.fill('[data-testid="session-id-input"]', 'test-session-123');
    await page.fill('[data-testid="cookies-input"]', 'session-cookie=value123');
    await page.click('[data-testid="connect-button"]');
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible();

    // Network-first: Intercepter la route de nouvelle question
    const newQuestionPromise = page.waitForResponse((resp) => 
      resp.url().includes('/api/questions') && resp.status() === 200
    );

    await page.goto('/overlay');
    await expect(page.locator('[data-testid="question-display"]')).toBeVisible();

    // Capturer le texte de la première question
    const firstQuestionText = await page.locator('[data-testid="question-text"]').textContent();

    // WHEN: Le timer expire (simuler expiration après timeout)
    // Simuler l'expiration du timer
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('question-expired', {
        detail: {
          questionId: 'q1',
          timestamp: Date.now()
        }
      }));
    });

    // Attendre la nouvelle question
    await newQuestionPromise;

    // THEN: Une nouvelle question est affichée automatiquement
    await expect(page.locator('[data-testid="question-display"]')).toBeVisible();
    const secondQuestionText = await page.locator('[data-testid="question-text"]').textContent();
    expect(secondQuestionText).not.toBe(firstQuestionText);

    // AND: Le timer est réinitialisé
    const timerValue = await page.locator('[data-testid="timer-value"]').textContent();
    expect(timerValue).toMatch(/\d+/);
    expect(parseInt(timerValue || '0')).toBeGreaterThan(0);
  });
});
