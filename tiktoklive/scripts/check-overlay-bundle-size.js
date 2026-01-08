#!/usr/bin/env node

/**
 * Script pour vérifier la taille du bundle de l'overlay OBS
 * Cible: < 200KB gzippé pour un chargement rapide
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(__dirname, '..', '.next');
const OVERLAY_BUNDLE_PATTERN = /overlay-[a-f0-9]+\.js/;
const TARGET_SIZE_KB = 200;

function getBundleSize() {
  try {
    // Build l'application si nécessaire
    console.log('🔨 Construction de l\'application...');
    execSync('npm run build', { stdio: 'inherit' });

    // Chercher le bundle overlay
    const staticDir = path.join(BUILD_DIR, 'static', 'chunks');
    const files = fs.readdirSync(staticDir, { recursive: true });

    let overlayBundle = null;
    for (const file of files) {
      if (file.includes('overlay') && file.endsWith('.js')) {
        overlayBundle = path.join(staticDir, file);
        break;
      }
    }

    if (!overlayBundle) {
      // Chercher dans le répertoire principal des chunks
      const chunksDir = path.join(BUILD_DIR, 'static', 'chunks');
      const chunkFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.js'));

      for (const chunkFile of chunkFiles) {
        const content = fs.readFileSync(path.join(chunksDir, chunkFile), 'utf8');
        if (content.includes('overlay') || content.includes('WebSocket')) {
          overlayBundle = path.join(chunksDir, chunkFile);
          break;
        }
      }
    }

    if (!overlayBundle || !fs.existsSync(overlayBundle)) {
      console.log('⚠️ Bundle overlay non trouvé, vérification du bundle principal...');

      // Fallback: vérifier le bundle principal
      const mainBundle = path.join(BUILD_DIR, 'static', 'chunks', 'main.js');
      if (fs.existsSync(mainBundle)) {
        overlayBundle = mainBundle;
      } else {
        throw new Error('Aucun bundle trouvé');
      }
    }

    const stats = fs.statSync(overlayBundle);
    const sizeKB = stats.size / 1024;

    // Simuler la compression gzip (estimation approximative)
    const estimatedGzipSize = sizeKB * 0.3; // Estimation réaliste pour JS

    console.log(`📦 Taille du bundle overlay: ${sizeKB.toFixed(2)} KB`);
    console.log(`🗜️ Taille estimée gzippée: ${estimatedGzipSize.toFixed(2)} KB`);
    console.log(`🎯 Cible: < ${TARGET_SIZE_KB} KB gzippé`);

    if (estimatedGzipSize > TARGET_SIZE_KB) {
      console.log(`❌ ÉCHEC: Bundle trop volumineux (${estimatedGzipSize.toFixed(2)} KB > ${TARGET_SIZE_KB} KB)`);
      console.log('💡 Suggestions d\'optimisation:');
      console.log('   - Vérifier les imports inutiles');
      console.log('   - Utiliser dynamic imports pour les composants non-critiques');
      console.log('   - Optimiser les dépendances tierces');
      console.log('   - Activer la compression côté serveur');
      process.exit(1);
    } else {
      console.log(`✅ SUCCÈS: Bundle dans les limites (${estimatedGzipSize.toFixed(2)} KB < ${TARGET_SIZE_KB} KB)`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification du bundle:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  getBundleSize();
}

module.exports = { getBundleSize };