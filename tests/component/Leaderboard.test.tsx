/**
 * Tests de composant P1 - Leaderboard
 * Tests du comportement UI du composant de leaderboard
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { Leaderboard } from '@/components/overlay/Leaderboard';
import { createTop10, createLeaderboardEntry } from '../support/factories/leaderboard.factory';

test.describe('Leaderboard Component', () => {
  test('[P1] devrait afficher le top 5 correctement', async ({ mount }) => {
    // GIVEN: Leaderboard est monté avec des entrées
    const entries = createTop10();
    const component = await mount(
      <Leaderboard entries={entries} showAnimations={false} />
    );

    // THEN: Le top 5 est affiché (seulement les 5 premiers)
    const leaderboardEntries = component.locator('[data-testid="leaderboard-entry"]');
    await expect(leaderboardEntries).toHaveCount(5);

    // AND: Les rangs sont affichés correctement (1, 2, 3, 4, 5)
    for (let i = 0; i < 5; i++) {
      await expect(leaderboardEntries.nth(i).locator('[data-testid="rank-badge"]')).toContainText(String(i + 1));
    }

    // AND: Les usernames sont visibles
    await expect(leaderboardEntries.first().locator('[data-testid="username"]')).toContainText('User1');
  });

  test('[P1] devrait trier les entrées par points décroissants', async ({ mount }) => {
    // GIVEN: Leaderboard est monté avec des entrées non triées
    const entries = [
      createLeaderboardEntry({ rank: 3, username: 'User3', points: 500 }),
      createLeaderboardEntry({ rank: 1, username: 'User1', points: 1000 }),
      createLeaderboardEntry({ rank: 2, username: 'User2', points: 750 }),
    ];

    const component = await mount(
      <Leaderboard entries={entries} showAnimations={false} />
    );

    // THEN: Les entrées sont triées par points décroissants
    const leaderboardEntries = component.locator('[data-testid="leaderboard-entry"]');
    const firstPoints = await leaderboardEntries.first().locator('[data-testid="points"]').textContent();
    const secondPoints = await leaderboardEntries.nth(1).locator('[data-testid="points"]').textContent();
    const thirdPoints = await leaderboardEntries.nth(2).locator('[data-testid="points"]').textContent();

    expect(parseInt(firstPoints || '0')).toBeGreaterThan(parseInt(secondPoints || '0'));
    expect(parseInt(secondPoints || '0')).toBeGreaterThan(parseInt(thirdPoints || '0'));
  });

  test('[P1] devrait formater les points correctement', async ({ mount }) => {
    // GIVEN: Leaderboard est monté avec des points élevés
    const entries = [
      createLeaderboardEntry({ rank: 1, username: 'User1', points: 12345 }),
    ];

    const component = await mount(
      <Leaderboard entries={entries} showAnimations={false} />
    );

    // THEN: Les points sont formatés avec séparateurs de milliers
    await expect(component.locator('[data-testid="points"]').first()).toContainText('12,345');
  });

  test('[P1] devrait afficher l\'indicateur "NEW" pour les nouvelles entrées', async ({ mount }) => {
    // GIVEN: Leaderboard est monté avec une entrée marquée comme nouvelle
    const entries = [
      createLeaderboardEntry({ rank: 1, username: 'NewUser', points: 1000, isNew: true }),
    ];

    const component = await mount(
      <Leaderboard entries={entries} showAnimations={true} />
    );

    // THEN: L'indicateur "NEW" est visible
    await expect(component.getByText('NEW')).toBeVisible();

    // AND: L'animation de zoom-bounce est appliquée
    const newEntry = component.locator('[data-testid="leaderboard-entry"]').first();
    await expect(newEntry).toHaveClass(/animate-\[zoom-bounce/);
  });
});
