/**
 * Tests E2E P1 - Synchronisation WebSocket Temps Réel
 * Tests de la synchronisation temps réel via WebSocket
 */

import { test, expect } from '@playwright/test';
import { test as websocketTest } from '../support/fixtures/websocket.fixture';

websocketTest.describe('Synchronisation WebSocket Temps Réel', () => {
  websocketTest('[P1] devrait mettre à jour la question en temps réel via WebSocket', async ({ page, mockWebSocket }) => {
    // GIVEN: L'utilisateur est sur la page overlay
    await page.goto('/overlay');

    // Network-first: Intercepter la route API questions AVANT l'événement WebSocket
    const questionPromise = page.waitForResponse((resp) => 
      resp.url().includes('/api/questions') && resp.status() === 200
    );

    // WHEN: Un événement WebSocket 'question:new' est reçu
    await mockWebSocket.emit('question:new', {
      question: {
        id: 'q2',
        text: 'Quelle est la capitale de l\'Espagne ?',
        answers: ['Madrid'],
        difficulty: 'facile',
        points: 10,
        category: 'geographie'
      },
      timestamp: Date.now()
    });

    // Attendre la mise à jour de l'API
    await questionPromise;

    // THEN: La nouvelle question est affichée sur l'overlay
    await expect(page.locator('[data-testid="question-text"]')).toContainText('Quelle est la capitale de l\'Espagne ?');

    // AND: Le timer est réinitialisé
    const timerValue = await page.locator('[data-testid="timer-value"]').textContent();
    expect(timerValue).toMatch(/\d+/);
    expect(parseInt(timerValue || '0')).toBeGreaterThan(0);
  });

  websocketTest('[P1] devrait mettre à jour le leaderboard en temps réel via WebSocket', async ({ page, mockWebSocket }) => {
    // GIVEN: L'utilisateur est sur la page overlay avec un leaderboard initial
    await page.goto('/overlay');
    await expect(page.locator('[data-testid="leaderboard"]')).toBeVisible();

    // Network-first: Intercepter la route API leaderboard AVANT l'événement WebSocket
    const leaderboardPromise = page.waitForResponse((resp) => 
      resp.url().includes('/api/leaderboard') && resp.status() === 200
    );

    // WHEN: Un événement WebSocket 'leaderboard:update' est reçu
    await mockWebSocket.emit('leaderboard:update', {
      leaderboard: [
        { rank: 1, username: 'NewChampion', points: 5000, avatar: '', isNew: true },
        { rank: 2, username: 'User2', points: 4500, avatar: '', isNew: false },
        { rank: 3, username: 'User3', points: 4000, avatar: '', isNew: false },
      ],
      timestamp: Date.now()
    });

    // Attendre la mise à jour de l'API
    await leaderboardPromise;

    // THEN: Le leaderboard affiche les nouveaux scores
    await expect(page.locator('[data-testid="leaderboard-entry"]').first()).toContainText('NewChampion');
    await expect(page.locator('[data-testid="points"]').first()).toContainText('5,000');

    // AND: Les positions sont mises à jour en temps réel
    const firstRank = await page.locator('[data-testid="rank-badge"]').first().textContent();
    expect(firstRank).toBe('1');
  });
});
