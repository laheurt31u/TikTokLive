/**
 * Tests E2E P0 - Détection des réponses aux questions et affichage du gagnant
 * Scénario critique pour la fonctionnalité de quiz interactive
 */

import { test, expect } from '@playwright/test';
import { waitForElement, waitForText } from '../support/helpers/wait-for';
import { assertWinnerDisplayed, assertQuestionDisplayed, assertCommentMetrics } from '../support/helpers/assertions';
import { createQuizComments, createCorrectAnswerComment } from '../support/factories/comment.factory';
import { TEST_TIMEOUTS } from '../support/constants/timeouts';

test.describe('Détection des Réponses au Quiz', () => {
  test('[P0] devrait détecter la première réponse correcte et afficher le gagnant', async ({ page }) => {
    // GIVEN: Un quiz est actif avec une question posée
    await page.goto('/quiz');
    await assertQuestionDisplayed(page, 'Quelle est la capitale de la France ?');

    // AND: Le système est connecté et reçoit des commentaires
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible();

    // WHEN: Plusieurs utilisateurs répondent dans le chat
    const comments = createQuizComments('Paris', 8, 0.25); // 8 commentaires, 25% corrects

    // Simuler l'arrivée des commentaires via WebSocket ou API
    // Pattern explicite: Configurer l'attente AVANT de déclencher les événements
    // pour éviter les race conditions
    const correctAnswerPromise = page.waitForFunction(() => {
      return document.querySelector('[data-testid="correct-answer-detected"]') !== null;
    }, { timeout: TEST_TIMEOUTS.NETWORK_RESPONSE });

    // Déclencher les événements après avoir configuré l'attente
    for (const comment of comments) {
      await page.evaluate((comment) => {
        // Simulation d'événement WebSocket
        window.dispatchEvent(new CustomEvent('tiktok-comment', { detail: comment }));
      }, comment);
    }

    // THEN: Le système détecte la première réponse correcte - attente explicite
    await correctAnswerPromise;

    // AND: Le gagnant est identifié et affiché
    const firstCorrectComment = comments.find(c => c.text === 'Paris');
    await assertWinnerDisplayed(page, firstCorrectComment!.username);

    // AND: Les points sont attribués au gagnant
    await expect(page.locator(`[data-testid="user-${firstCorrectComment!.username}-points"]`))
      .toHaveText('10'); // Points pour difficulté moyenne
  });

  test('[P0] devrait ignorer les réponses après la première correcte', async ({ page }) => {
    // GIVEN: Une question est posée et un gagnant a déjà été trouvé
    await page.goto('/quiz');
    await assertQuestionDisplayed(page, 'Quelle est la capitale de la France ?');

    // Simuler première réponse correcte
    const firstWinner = createCorrectAnswerComment('Paris', { username: 'user1' });
    await page.evaluate((comment) => {
      window.dispatchEvent(new CustomEvent('tiktok-comment', { detail: comment }));
    }, firstWinner);

    await assertWinnerDisplayed(page, 'user1');

    // WHEN: D'autres réponses correctes arrivent après
    const lateCorrectAnswer = createCorrectAnswerComment('Paris', { username: 'user2' });
    await page.evaluate((comment) => {
      window.dispatchEvent(new CustomEvent('tiktok-comment', { detail: comment }));
    }, lateCorrectAnswer);

    // THEN: Le gagnant reste user1 (premier arrivé)
    await assertWinnerDisplayed(page, 'user1');

    // AND: user2 ne reçoit pas de points supplémentaires pour cette question
    await expect(page.locator('[data-testid="user-user2-points"]')).toHaveText('0');
  });

  test('[P0] devrait gérer les réponses partielles et approximatives', async ({ page }) => {
    // GIVEN: Une question posée avec réponse attendue "Paris"
    await page.goto('/quiz');
    await assertQuestionDisplayed(page, 'Quelle est la capitale de la France ?');

    // WHEN: Un utilisateur répond "paris" en minuscules
    const lowercaseAnswer = createCorrectAnswerComment('paris', { username: 'user_lowercase' });
    await page.evaluate((comment) => {
      window.dispatchEvent(new CustomEvent('tiktok-comment', { detail: comment }));
    }, lowercaseAnswer);

    // THEN: La réponse est acceptée malgré la casse
    await assertWinnerDisplayed(page, 'user_lowercase');
  });

  test('[P0] devrait rejeter les réponses avec fautes de frappe si fuzzy matching est désactivé', async ({ page }) => {
    // GIVEN: Une question posée avec fuzzy matching désactivé (comportement par défaut)
    await page.goto('/quiz');
    await assertQuestionDisplayed(page, 'Quelle est la capitale de la France ?');

    // WHEN: Un utilisateur fait une faute mineure "Prais" (au lieu de "Paris")
    const typoAnswer = createCorrectAnswerComment('Prais', { username: 'user_typo' });
    await page.evaluate((comment) => {
      window.dispatchEvent(new CustomEvent('tiktok-comment', { detail: comment }));
    }, typoAnswer);

    // THEN: La réponse est rejetée car fuzzy matching n'est pas activé
    // Assertion explicite : aucun winner ne devrait être affiché
    await expect(page.locator('[data-testid="winner-username"]')).not.toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_VISIBILITY });
  });

  // Note: Test pour fuzzy matching activé - à implémenter quand la fonctionnalité sera disponible
  // Pour l'instant, le comportement par défaut (fuzzy matching désactivé) est testé ci-dessus
  test.skip('[P1] devrait accepter les réponses avec fautes de frappe si fuzzy matching est activé', async ({ page }) => {
    // GIVEN: Une question posée avec fuzzy matching activé
    // Note: Ce test nécessite que la fonctionnalité de fuzzy matching soit implémentée et activable
    await page.goto('/quiz');
    await assertQuestionDisplayed(page, 'Quelle est la capitale de la France ?');

    // Activer fuzzy matching si disponible (via paramètre ou configuration)
    await page.evaluate(() => {
      // Simuler activation du fuzzy matching si l'API existe
      if (window.localStorage) {
        window.localStorage.setItem('fuzzyMatchingEnabled', 'true');
      }
    });

    // WHEN: Un utilisateur fait une faute mineure "Prais" (au lieu de "Paris")
    const typoAnswer = createCorrectAnswerComment('Prais', { username: 'user_typo' });
    
    // Attendre explicitement que le winner soit détecté si fuzzy matching est actif
    const winnerPromise = page.waitForFunction(() => {
      const winnerElement = document.querySelector('[data-testid="winner-username"]');
      return winnerElement !== null && winnerElement.textContent === 'user_typo';
    }, { timeout: TEST_TIMEOUTS.ELEMENT_VISIBILITY });

    await page.evaluate((comment) => {
      window.dispatchEvent(new CustomEvent('tiktok-comment', { detail: comment }));
    }, typoAnswer);

    // THEN: Si fuzzy matching est activé et implémenté, la réponse est acceptée
    await winnerPromise;
    await expect(page.locator('[data-testid="winner-username"]')).toHaveText('user_typo');
  });

  test('[P0] devrait afficher les métriques de participation en temps réel', async ({ page }) => {
    // GIVEN: Un quiz est actif
    await page.goto('/quiz');
    await assertQuestionDisplayed(page, 'Quelle est la capitale de la France ?');

    // WHEN: Plusieurs commentaires arrivent
    const comments = createQuizComments('Paris', 15, 0.4); // 15 commentaires, 40% corrects

    // Attendre explicitement que les métriques soient mises à jour
    const metricsPromise = page.waitForFunction(() => {
      const countElement = document.querySelector('[data-testid="correct-answers-count"]');
      return countElement !== null && countElement.textContent === '6';
    }, { timeout: TEST_TIMEOUTS.METRICS_UPDATE });

    for (const comment of comments) {
      await page.evaluate((comment) => {
        window.dispatchEvent(new CustomEvent('tiktok-comment', { detail: comment }));
      }, comment);
    }

    // THEN: Les métriques de participation sont mises à jour - attente explicite
    await metricsPromise;
    await assertCommentMetrics(page, 15, { checkRate: true });

    // AND: Le nombre de bonnes réponses est affiché
    await expect(page.locator('[data-testid="correct-answers-count"]'))
      .toHaveText('6'); // 40% de 15 = 6
  });

  test('[P0] devrait gérer les réponses multiples du même utilisateur', async ({ page }) => {
    // GIVEN: Un quiz est actif
    await page.goto('/quiz');
    await assertQuestionDisplayed(page, 'Quelle est la capitale de la France ?');

    // WHEN: Le même utilisateur envoie plusieurs réponses
    const userId = 'user123';
    const answers = [
      createCorrectAnswerComment('London', { userId, username: 'sameuser', text: 'London' }),
      createCorrectAnswerComment('Paris', { userId, username: 'sameuser', text: 'Paris' }),
      createCorrectAnswerComment('Rome', { userId, username: 'sameuser', text: 'Rome' })
    ];

    // Attendre explicitement que le gagnant soit identifié
    const winnerPromise = page.waitForFunction(() => {
      const winnerElement = document.querySelector('[data-testid="winner-username"]');
      return winnerElement !== null && winnerElement.textContent === 'sameuser';
    }, { timeout: TEST_TIMEOUTS.NETWORK_RESPONSE });

    for (const answer of answers) {
      await page.evaluate((comment) => {
        window.dispatchEvent(new CustomEvent('tiktok-comment', { detail: comment }));
      }, answer);
    }

    // THEN: Seule la première réponse de l'utilisateur est considérée - attente explicite
    await winnerPromise;
    await expect(page.locator('[data-testid="winner-username"]')).toHaveText('sameuser');

    // AND: Les réponses suivantes du même utilisateur sont ignorées
    await expect(page.locator('[data-testid="duplicate-response-warning"]')).toBeVisible();
  });
});