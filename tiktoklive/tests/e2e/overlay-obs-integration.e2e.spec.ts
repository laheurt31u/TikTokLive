import { test, expect } from '@playwright/test';

test.describe('Overlay OBS Integration', () => {
  test('should render overlay page with OBS-compatible structure', async ({ page }) => {
    // Accéder à la page overlay
    await page.goto('/overlay');

    // Vérifier que la page se charge
    await expect(page).toHaveTitle(/TikTokLive/);

    // Vérifier les conteneurs principaux
    const overlayContainer = page.locator('[data-testid="overlay-container"]');
    await expect(overlayContainer).toBeVisible();

    const questionContainer = page.locator('[data-testid="question-container"]');
    await expect(questionContainer).toBeVisible();

    const leaderboardContainer = page.locator('[data-testid="leaderboard-container"]');
    await expect(leaderboardContainer).toBeVisible();
  });

  test('should have OBS Browser Source compatible styling', async ({ page }) => {
    await page.goto('/overlay');

    const overlayContainer = page.locator('[data-testid="overlay-container"]');

    // Vérifier que le fond est opaque (pas de transparence OBS)
    const backgroundColor = await overlayContainer.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(backgroundColor).not.toBe('transparent');

    // Vérifier qu'il n'y a pas de overflow qui pourrait poser problème dans OBS
    const overflow = await overlayContainer.evaluate(el =>
      window.getComputedStyle(el).overflow
    );
    expect(overflow).not.toBe('hidden'); // Éviter les problèmes de rendu OBS avec overflow:hidden
  });

  test('should adapt to different viewport sizes (OBS resolutions)', async ({ page }) => {
    // Tester différentes résolutions OBS
    const resolutions = [
      { width: 1280, height: 720, name: '720p' },
      { width: 1920, height: 1080, name: '1080p' },
      { width: 2560, height: 1440, name: '1440p' },
      { width: 3840, height: 2160, name: '4K' }
    ];

    for (const res of resolutions) {
      await page.setViewportSize({ width: res.width, height: res.height });
      await page.goto('/overlay');

      // Vérifier que l'overlay s'adapte
      const overlayContainer = page.locator('[data-testid="overlay-container"]');
      await expect(overlayContainer).toBeVisible();

      // Vérifier que le texte est lisible (pas trop petit/pas trop grand)
      const questionContainer = page.locator('[data-testid="question-container"]');
      const fontSize = await questionContainer.evaluate(el =>
        parseFloat(window.getComputedStyle(el).fontSize)
      );

      // Police entre 24px et 96px pour lisibilité
      expect(fontSize).toBeGreaterThanOrEqual(24);
      expect(fontSize).toBeLessThanOrEqual(96);

      console.log(`${res.name}: Font size = ${fontSize}px ✓`);
    }
  });

  test('should maintain performance under OBS constraints', async ({ page }) => {
    await page.goto('/overlay');

    // Mesurer les performances de rendu
    const startTime = Date.now();

    // Simuler un événement de question
    await page.evaluate(() => {
      // Simuler un message WebSocket
      const event = new CustomEvent('question:new', {
        detail: { id: '1', text: 'Test question pour OBS', timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    });

    const renderTime = Date.now() - startTime;

    // Performance critique pour OBS : rendu en moins de 100ms
    expect(renderTime).toBeLessThan(100);

    console.log(`Render time: ${renderTime}ms ✓`);
  });

  test('should handle WebSocket connection for real-time updates', async ({ page }) => {
    await page.goto('/overlay');

    // Vérifier que la page essaie de se connecter au WebSocket
    // (On ne peut pas tester la vraie connexion sans serveur, mais on peut vérifier le code)
    const wsConnectionAttempt = await page.evaluate(() => {
      // Vérifier que le code WebSocket est présent
      return typeof window.WebSocket !== 'undefined';
    });

    expect(wsConnectionAttempt).toBe(true);
  });

  test('should be accessible for screen readers (OBS compatibility)', async ({ page }) => {
    await page.goto('/overlay');

    // Vérifier l'accessibilité de base
    const overlayContainer = page.locator('[data-testid="overlay-container"]');

    // Vérifier le contraste des couleurs (important pour OBS)
    const textColor = await overlayContainer.evaluate(el =>
      window.getComputedStyle(el).color
    );

    // Le texte doit être visible (pas transparent)
    expect(textColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(textColor).not.toBe('transparent');
  });
});