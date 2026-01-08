/**
 * Assertions personnalisées pour les tests TikTokLive
 * Fournit des assertions métier spécifiques au domaine
 */

import { expect, Page } from '@playwright/test';

/**
 * Assertions pour les commentaires TikTok
 */
export const assertCommentDisplayed = async (
  page: Page,
  username: string,
  text: string,
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = 5000 } = options;

  await expect(page.locator(`[data-testid="comment-${username}"]`)).toBeVisible({ timeout });
  await expect(page.locator(`[data-testid="comment-${username}"] [data-testid="comment-text"]`))
    .toHaveText(text, { timeout });
};

/**
 * Assertions pour le système de points
 */
export const assertUserPoints = async (
  page: Page,
  username: string,
  expectedPoints: number,
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = 5000 } = options;

  await expect(page.locator(`[data-testid="user-${username}-points"]`))
    .toHaveText(expectedPoints.toString(), { timeout });
};

/**
 * Assertions pour le leaderboard
 */
export const assertLeaderboardPosition = async (
  page: Page,
  position: number,
  username: string,
  points: number,
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = 5000 } = options;

  const positionSelector = `[data-testid="leaderboard-position-${position}"]`;

  await expect(page.locator(`${positionSelector} [data-testid="leaderboard-username"]`))
    .toHaveText(username, { timeout });

  await expect(page.locator(`${positionSelector} [data-testid="leaderboard-points"]`))
    .toHaveText(points.toString(), { timeout });
};

/**
 * Assertions pour l'affichage du gagnant
 */
export const assertWinnerDisplayed = async (
  page: Page,
  username: string,
  options: { timeout?: number; checkAvatar?: boolean } = {}
): Promise<void> => {
  const { timeout = 5000, checkAvatar = true } = options;

  // Vérifier que le message de victoire est affiché
  await expect(page.locator('[data-testid="winner-message"]')).toBeVisible({ timeout });
  await expect(page.locator('[data-testid="winner-username"]')).toHaveText(username, { timeout });

  // Vérifier que l'avatar du gagnant est affiché (optionnel)
  if (checkAvatar) {
    await expect(page.locator('[data-testid="winner-avatar"]')).toBeVisible({ timeout });
  }
};

/**
 * Assertions pour les questions du quiz
 */
export const assertQuestionDisplayed = async (
  page: Page,
  questionText: string,
  options: { timeout?: number; checkTimer?: boolean } = {}
): Promise<void> => {
  const { timeout = 5000, checkTimer = true } = options;

  await expect(page.locator('[data-testid="current-question"]')).toHaveText(questionText, { timeout });

  if (checkTimer) {
    await expect(page.locator('[data-testid="question-timer"]')).toBeVisible({ timeout });
  }
};

/**
 * Assertions pour les connexions WebSocket
 */
export const assertWebSocketConnected = async (
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = 10000 } = options;

  // Vérifier qu'un indicateur de connexion est visible
  await expect(page.locator('[data-testid="websocket-status-connected"]')).toBeVisible({ timeout });
};

/**
 * Assertions pour les métriques de performance
 */
export const assertResponseTime = async (
  startTime: number,
  maxDuration: number,
  operation: string
): Promise<void> => {
  const duration = Date.now() - startTime;

  if (duration > maxDuration) {
    throw new Error(`Opération "${operation}" trop lente: ${duration}ms (max: ${maxDuration}ms)`);
  }

  console.log(`✅ ${operation}: ${duration}ms`);
};

/**
 * Assertions pour les erreurs de connexion TikTok
 */
export const assertTikTokConnectionError = async (
  page: Page,
  errorType: 'auth' | 'network' | 'rate-limit' | 'generic',
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = 5000 } = options;

  const errorSelectors = {
    auth: '[data-testid="error-auth"]',
    network: '[data-testid="error-network"]',
    'rate-limit': '[data-testid="error-rate-limit"]',
    generic: '[data-testid="error-generic"]'
  };

  await expect(page.locator(errorSelectors[errorType])).toBeVisible({ timeout });
};

/**
 * Assertions pour le mode dégradé
 */
export const assertDegradedModeActive = async (
  page: Page,
  capabilities: string[],
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = 5000 } = options;

  // Vérifier que le mode dégradé est indiqué
  await expect(page.locator('[data-testid="degraded-mode-indicator"]')).toBeVisible({ timeout });

  // Vérifier que les capacités disponibles sont affichées
  for (const capability of capabilities) {
    await expect(page.locator(`[data-testid="capability-${capability}"]`)).toBeVisible({ timeout });
  }
};

/**
 * Assertions pour les métriques de commentaires
 */
export const assertCommentMetrics = async (
  page: Page,
  expectedCount: number,
  options: { timeout?: number; checkRate?: boolean } = {}
): Promise<void> => {
  const { timeout = 5000, checkRate = false } = options;

  await expect(page.locator('[data-testid="comment-count"]'))
    .toHaveText(expectedCount.toString(), { timeout });

  if (checkRate) {
    // Vérifier qu'un taux de commentaires par minute est affiché
    await expect(page.locator('[data-testid="comment-rate"]')).toBeVisible({ timeout });
  }
};