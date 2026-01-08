#!/usr/bin/env node

/**
 * Script de test d'intégration OBS pour l'overlay TikTokLive
 * Teste automatiquement la compatibilité et performance avec OBS
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  total: 0
};

function log(message, status = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    info: '\x1b[36m',
    reset: '\x1b[0m'
  };

  console.log(`${colors[status]}[${timestamp}] ${message}${colors.reset}`);
}

function runTest(testName, testFn) {
  TEST_RESULTS.total++;
  try {
    log(`🔍 Exécution du test: ${testName}`, 'info');
    const result = testFn();

    if (result) {
      TEST_RESULTS.passed++;
      log(`✅ Test réussi: ${testName}`, 'success');
      return true;
    } else {
      TEST_RESULTS.failed++;
      log(`❌ Test échoué: ${testName}`, 'error');
      return false;
    }
  } catch (error) {
    TEST_RESULTS.failed++;
    log(`❌ Erreur dans le test ${testName}: ${error.message}`, 'error');
    return false;
  }
}

function testBundleSize() {
  const scriptPath = path.join(__dirname, 'check-overlay-bundle-size.js');

  try {
    execSync(`node ${scriptPath}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function testOBSConfiguration() {
  const configPath = path.join(__dirname, '..', 'docs', 'obs-overlay-configuration.md');

  if (!fs.existsSync(configPath)) {
    return false;
  }

  const content = fs.readFileSync(configPath, 'utf8');

  const requiredSections = [
    'Configuration Recommandée',
    'Remote Debugging',
    'Tests d\'Intégration',
    'Dépannage'
  ];

  return requiredSections.every(section => content.includes(section));
}

function testNextConfig() {
  const configPath = path.join(__dirname, '..', 'next.config.ts');

  if (!fs.existsSync(configPath)) {
    return false;
  }

  const content = fs.readFileSync(configPath, 'utf8');

  const requiredOptimizations = [
    'splitChunks',
    'overlay',
    'Cache-Control',
    'optimizePackageImports'
  ];

  return requiredOptimizations.every(opt => content.includes(opt));
}

function testLazyLoading() {
  const overlayPagePath = path.join(__dirname, '..', 'app', 'overlay', 'page.tsx');

  if (!fs.existsSync(overlayPagePath)) {
    return false;
  }

  const content = fs.readFileSync(overlayPagePath, 'utf8');

  return content.includes('lazy(() => import(') && content.includes('Suspense');
}

function testGPUOptimizations() {
  const questionDisplayPath = path.join(__dirname, '..', 'components', 'overlay', 'QuestionDisplay.tsx');

  if (!fs.existsSync(questionDisplayPath)) {
    return false;
  }

  const content = fs.readFileSync(questionDisplayPath, 'utf8');

  const gpuOptimizations = [
    'translateZ(0)',
    'backfaceVisibility',
    'will-change'
  ];

  return gpuOptimizations.every(opt => content.includes(opt));
}

function testResponsiveDesign() {
  const utilsPath = path.join(__dirname, '..', 'lib', 'overlay-utils.ts');

  if (!fs.existsSync(utilsPath)) {
    return false;
  }

  const content = fs.readFileSync(utilsPath, 'utf8');

  return content.includes('detectOBSResolution') &&
         content.includes('getAdaptiveFontSize') &&
         content.includes('COMMON_OBS_RESOLUTIONS');
}

function runAllTests() {
  log('🚀 Démarrage des tests d\'intégration OBS pour TikTokLive Overlay', 'info');
  log('=' .repeat(60), 'info');

  // Tests de performance
  runTest('Taille du bundle < 200KB gzippé', testBundleSize);

  // Tests de configuration
  runTest('Configuration Next.js optimisée', testNextConfig);
  runTest('Documentation OBS complète', testOBSConfiguration);

  // Tests de code
  runTest('Lazy loading des composants', testLazyLoading);
  runTest('Optimisations GPU activées', testGPUOptimizations);
  runTest('Design responsive pour OBS', testResponsiveDesign);

  // Résultats finaux
  log('=' .repeat(60), 'info');
  log(`📊 Résultats: ${TEST_RESULTS.passed}/${TEST_RESULTS.total} tests réussis`, 'info');

  if (TEST_RESULTS.failed === 0) {
    log('🎉 Tous les tests d\'intégration OBS sont passés !', 'success');
    log('💡 L\'overlay est prêt pour l\'intégration OBS Studio', 'success');
  } else {
    log(`⚠️ ${TEST_RESULTS.failed} test(s) ont échoué`, 'warning');
    log('🔧 Veuillez corriger les problèmes avant l\'intégration OBS', 'warning');
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, TEST_RESULTS };