/**
 * Tests end-to-end pour l'intégration OBS de l'overlay
 */

import { test, expect } from '@playwright/test';
import { TEST_TIMEOUTS } from '../support/constants/timeouts';

test.describe('Overlay OBS Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Simuler une résolution OBS typique
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Aller à la page overlay
    await page.goto('/app/overlay');

    // Attendre que l'overlay soit chargé
    await page.waitForSelector('.gpu-accelerated');
  });

  test('should load overlay successfully', async ({ page }) => {
    // Vérifier que les éléments principaux sont présents
    await expect(page.locator('[data-testid="question-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="leaderboard"]')).toBeVisible();
  });

  test('should display connection status', async ({ page }) => {
    // Vérifier l'indicateur de connexion
    const statusIndicator = page.locator('.w-3.h-3');
    await expect(statusIndicator).toBeVisible();

    // Devrait devenir vert après connexion simulée
    await expect(statusIndicator).toHaveClass(/bg-green-400/);
  });

  test('should be responsive across OBS resolutions', async ({ page }) => {
    const resolutions = [
      { width: 1280, height: 720, name: '720p' },
      { width: 1920, height: 1080, name: '1080p' },
      { width: 2560, height: 1440, name: '1440p' }
    ];

    for (const resolution of resolutions) {
      await page.setViewportSize(resolution);

      // Vérifier que le layout s'adapte
      await expect(page.locator('.container')).toBeVisible();

      // Vérifier que les classes responsive sont appliquées
      const bodyClasses = await page.getAttribute('body', 'class');
      expect(bodyClasses).toContain(`obs-${resolution.name.toLowerCase()}`);
    }
  });

  test('should handle GPU acceleration', async ({ page }) => {
    // Vérifier que les éléments critiques ont GPU acceleration
    const acceleratedElements = page.locator('.gpu-accelerated');
    await expect(acceleratedElements.first()).toBeVisible();

    // Vérifier que les animations sont fluides (pas de blocage)
    const startTime = Date.now();

    // Déclencher une animation
    const elementHandle = await page.evaluateHandle(() => {
      const element = document.createElement('div');
      element.className = 'gpu-accelerated animate-pulse';
      element.style.cssText = 'position: absolute; width: 100px; height: 100px; background: red;';
      document.body.appendChild(element);
      return element;
    });

    // Attendre explicitement que l'animation soit visible
    await expect(page.locator('.gpu-accelerated.animate-pulse')).toBeVisible({ timeout: TEST_TIMEOUTS.ANIMATION });

    // Cleanup après test - attendre explicitement que l'élément soit supprimé
    await page.evaluate((element) => {
      element.remove();
    }, elementHandle);
    
    // Attendre que l'élément soit effectivement supprimé
    await expect(page.locator('.gpu-accelerated.animate-pulse')).not.toBeVisible({ timeout: TEST_TIMEOUTS.ANIMATION });

    const endTime = Date.now();
    const animationTime = endTime - startTime;

    // L'animation ne devrait pas bloquer plus de 100ms
    expect(animationTime).toBeLessThan(100);
  });

  test('should prevent user interactions', async ({ page }) => {
    // Vérifier que les interactions utilisateur sont désactivées
    const body = page.locator('body');

    // Vérifier les styles CSS qui désactivent les interactions
    const userSelect = await body.evaluate(el => getComputedStyle(el).userSelect);
    expect(userSelect).toBe('none');

    const touchCallout = await body.evaluate(el => getComputedStyle(el).webkitTouchCallout);
    expect(touchCallout).toBe('none');
  });

  test('should optimize for streaming performance', async ({ page }) => {
    // Mesurer les performances de rendu
    const performanceMetrics = await page.evaluate(() => {
      const metrics = {
        frameDrops: 0,
        averageFrameTime: 0,
        memoryUsage: 0
      };

      // Simuler un monitoring de performance
      let frameCount = 0;
      const frameTimes: number[] = [];

      const measureFrame = () => {
        const start = performance.now();

        // Simuler du travail de rendu
        for (let i = 0; i < 1000; i++) {
          document.createElement('div');
        }

        const end = performance.now();
        frameTimes.push(end - start);
        frameCount++;

        if (frameCount < 10) {
          requestAnimationFrame(measureFrame);
        } else {
          metrics.averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          metrics.frameDrops = frameTimes.filter(time => time > 16.67).length;

          // @ts-ignore - performance.memory existe dans Chrome
          if (performance.memory) {
            metrics.memoryUsage = performance.memory.usedJSHeapSize;
          }
        }
      };

      requestAnimationFrame(measureFrame);

      return new Promise(resolve => {
        // Attendre explicitement que toutes les frames soient mesurées
        const checkComplete = () => {
          if (frameCount >= 10 && metrics.averageFrameTime > 0) {
            resolve(metrics);
          } else {
            requestAnimationFrame(checkComplete);
          }
        };
        checkComplete();
      });
    });

    // Vérifier que les performances sont acceptables pour le streaming
    expect(performanceMetrics.averageFrameTime).toBeLessThan(16.67); // 60fps
    expect(performanceMetrics.frameDrops).toBeLessThan(5);
  });

  test('should handle dynamic content updates', async ({ page }) => {
    // Simuler une mise à jour temps réel
    await page.evaluate(() => {
      // Simuler WebSocket event
      const event = new CustomEvent('question:new', {
        detail: {
          id: 'test-q1',
          text: 'Test question pour OBS',
          difficulty: 'easy',
          timeLimit: 30
        }
      });

      window.dispatchEvent(event);
    });

    // Vérifier que l'overlay réagit
    await expect(page.locator('text=Test question pour OBS')).toBeVisible();
  });

  test('should work with OBS Browser Source settings', async ({ page }) => {
    // Simuler les paramètres OBS Browser Source
    await page.evaluate(() => {
      // Définir les variables CSS comme OBS le ferait
      document.documentElement.style.setProperty('--obs-width', '1920px');
      document.documentElement.style.setProperty('--obs-height', '1080px');
    });

    // Vérifier que l'overlay s'adapte
    const container = page.locator('.container');
    await expect(container).toHaveCSS('max-width', '1920px');
  });

  test('should handle OBS refresh scenarios', async ({ page }) => {
    // Simuler un refresh OBS (rechargement de page)
    await page.reload();

    // Vérifier que tout se recharge correctement
    await page.waitForSelector('.gpu-accelerated');
    await expect(page.locator('[data-testid="question-display"]')).toBeVisible();
  });

  test('should minimize resource usage for streaming', async ({ page }) => {
    // Vérifier qu'il n'y a pas de ressources bloquantes
    const blockingResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources.filter((resource: any) =>
        resource.transferSize === 0 || resource.decodedBodySize === 0
      ).length;
    });

    expect(blockingResources).toBe(0);
  });

  test('should handle multi-GPU OBS setups', async ({ page }) => {
    // Vérifier que l'accélération GPU est configurée
    const gpuAcceleration = await page.evaluate(() => {
      const testElement = document.createElement('div');
      testElement.style.transform = 'translateZ(0)';
      document.body.appendChild(testElement);

      const styles = getComputedStyle(testElement);
      const hasHardwareAcceleration = styles.transform !== 'none';

      document.body.removeChild(testElement);
      return hasHardwareAcceleration;
    });

    expect(gpuAcceleration).toBe(true);
  });
});