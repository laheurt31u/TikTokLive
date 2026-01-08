#!/usr/bin/env node

/**
 * Script de test d'intégration OBS pour l'overlay TikTokLive
 * Teste automatiquement la compatibilité et performance OBS
 */

const { chromium } = require('playwright');

const TEST_CONFIG = {
  resolutions: [
    { width: 1280, height: 720, name: '720p' },
    { width: 1920, height: 1080, name: '1080p' },
    { width: 2560, height: 1440, name: '1440p' },
    { width: 3840, height: 2160, name: '4K' }
  ],
  testDuration: 10000, // 10 secondes par résolution
  overlayUrl: 'http://localhost:3000/app/overlay'
};

class OBSTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🎬 Démarrage des tests d\'intégration OBS...\n');

    for (const resolution of TEST_CONFIG.resolutions) {
      await this.testResolution(resolution);
    }

    this.printSummary();
  }

  async testResolution(resolution) {
    console.log(`📺 Test résolution ${resolution.name} (${resolution.width}x${resolution.height})`);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      // Configurer la résolution
      await page.setViewportSize({
        width: resolution.width,
        height: resolution.height
      });

      // Mesurer le temps de chargement
      const startTime = Date.now();
      await page.goto(TEST_CONFIG.overlayUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      const loadTime = Date.now() - startTime;

      // Attendre que l'overlay soit prêt
      await page.waitForSelector('.gpu-accelerated', { timeout: 10000 });

      // Tests fonctionnels
      const testResults = await page.evaluate(async (config) => {
        const results = {
          elementsFound: false,
          responsiveClasses: false,
          performanceMetrics: null,
          errors: []
        };

        try {
          // Vérifier les éléments critiques
          const questionDisplay = document.querySelector('[data-testid="question-display"]') || document.querySelector('h1');
          const leaderboard = document.querySelector('[data-testid="leaderboard"]') || document.querySelector('h2');

          results.elementsFound = !!(questionDisplay && leaderboard);

          // Vérifier les classes responsive
          const bodyClasses = document.body.className;
          results.responsiveClasses = bodyClasses.includes(`obs-${config.name.toLowerCase()}`);

          // Mesurer les performances pendant quelques secondes
          const performanceMonitor = {
            frameDrops: 0,
            lastFrameTime: performance.now(),
            measurements: []
          };

          // Simuler des animations
          const animations = [];
          for (let i = 0; i < 10; i++) {
            const element = document.createElement('div');
            element.className = 'gpu-accelerated animate-pulse';
            element.style.cssText = 'position: absolute; width: 10px; height: 10px; background: red;';
            document.body.appendChild(element);
            animations.push(element);

            // Mesurer performance
            const start = performance.now();
            await new Promise(resolve => setTimeout(resolve, 100));
            const end = performance.now();
            performanceMonitor.measurements.push(end - start);
          }

          // Cleanup
          animations.forEach(el => el.remove());

          results.performanceMetrics = {
            averageFrameTime: performanceMonitor.measurements.reduce((a, b) => a + b, 0) / performanceMonitor.measurements.length,
            maxFrameTime: Math.max(...performanceMonitor.measurements),
            frameDrops: performanceMonitor.measurements.filter(t => t > 16.67).length
          };

        } catch (error) {
          results.errors.push(error.message);
        }

        return results;
      }, { name: resolution.name });

      // Évaluer les résultats
      const success = testResults.elementsFound && testResults.responsiveClasses;
      const performanceOk = testResults.performanceMetrics &&
                           testResults.performanceMetrics.averageFrameTime < 16.67;

      this.recordTest({
        name: `Overlay ${resolution.name}`,
        resolution: `${resolution.width}x${resolution.height}`,
        loadTime,
        success,
        performanceOk,
        details: testResults
      });

    } catch (error) {
      this.recordTest({
        name: `Overlay ${resolution.name}`,
        resolution: `${resolution.width}x${resolution.height}`,
        loadTime: 0,
        success: false,
        performanceOk: false,
        error: error.message
      });
    } finally {
      await browser.close();
    }
  }

  recordTest(test) {
    this.results.tests.push(test);

    if (test.success && test.performanceOk) {
      this.results.passed++;
      console.log(`  ✅ RÉUSSI - Chargement: ${test.loadTime}ms`);
    } else {
      this.results.failed++;
      console.log(`  ❌ ÉCHEC - ${test.error || 'Tests fonctionnels/performance échoués'}`);
    }

    if (test.details?.performanceMetrics) {
      console.log(`     Performance: ${test.details.performanceMetrics.averageFrameTime.toFixed(2)}ms/frame moyen`);
    }
  }

  printSummary() {
    console.log('\n📊 RÉSULTATS DES TESTS OBS\n');

    console.log(`Tests réussis: ${this.results.passed}`);
    console.log(`Tests échoués: ${this.results.failed}`);
    console.log(`Taux de succès: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%\n`);

    if (this.results.failed === 0) {
      console.log('🎉 Tous les tests OBS sont passés ! L\'overlay est prêt pour le streaming.');
    } else {
      console.log('⚠️ Certains tests ont échoué. Vérifiez la configuration OBS.');
    }

    console.log('\n📋 Recommandations pour OBS:');
    console.log('• Utilisez Browser Source avec les paramètres recommandés');
    console.log('• Activez hardware acceleration si disponible');
    console.log('• Testez sur la résolution cible avant le live');
    console.log('• Surveillez les performances pendant les tests');

    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Vérifier que Next.js est démarré
async function checkServer() {
  try {
    const response = await fetch(TEST_CONFIG.overlayUrl);
    if (!response.ok) throw new Error('Server not responding');
  } catch (error) {
    console.error('❌ Next.js server n\'est pas démarré sur localhost:3000');
    console.error('💡 Lancez `npm run dev` dans un autre terminal');
    process.exit(1);
  }
}

// Exécuter les tests
async function main() {
  await checkServer();

  const testRunner = new OBSTestRunner();
  await testRunner.runAllTests();
}

main().catch(console.error);