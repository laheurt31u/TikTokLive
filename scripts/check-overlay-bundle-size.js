#!/usr/bin/env node

/**
 * Script de validation de la taille du bundle overlay
 * Vérifie que le bundle JavaScript reste < 200KB gzippé
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BUNDLE_SIZE_LIMIT = 200 * 1024; // 200KB en bytes
const OVERLAY_PATH = path.join(__dirname, '../.next/static/chunks');

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function analyzeBundle() {
  try {
    // Vérifier si le build existe
    if (!fs.existsSync(OVERLAY_PATH)) {
      console.error('❌ Build Next.js non trouvé. Lancez `npm run build` d\'abord.');
      process.exit(1);
    }

    const files = fs.readdirSync(OVERLAY_PATH);
    let totalSize = 0;
    let totalGzippedSize = 0;
    const fileDetails = [];

    console.log('📦 Analyse du bundle overlay...\n');

    files.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(OVERLAY_PATH, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath);
        const gzipped = zlib.gzipSync(content);

        totalSize += stats.size;
        totalGzippedSize += gzipped.length;

        fileDetails.push({
          name: file,
          size: stats.size,
          gzippedSize: gzipped.length
        });
      }
    });

    // Trier par taille décroissante
    fileDetails.sort((a, b) => b.size - a.size);

    console.log('📊 Détail des chunks:');
    fileDetails.slice(0, 10).forEach(file => {
      console.log(`  ${file.name}: ${formatBytes(file.size)} (${formatBytes(file.gzippedSize)} gzippé)`);
    });

    if (fileDetails.length > 10) {
      console.log(`  ... et ${fileDetails.length - 10} autres fichiers`);
    }

    console.log('\n📈 Résumé:');
    console.log(`  Taille totale: ${formatBytes(totalSize)}`);
    console.log(`  Taille gzippée: ${formatBytes(totalGzippedSize)}`);
    console.log(`  Limite autorisée: ${formatBytes(BUNDLE_SIZE_LIMIT)}`);

    // Vérification du seuil
    if (totalGzippedSize > BUNDLE_SIZE_LIMIT) {
      console.error(`\n❌ ÉCHEC: Bundle trop volumineux (${formatBytes(totalGzippedSize)} > ${formatBytes(BUNDLE_SIZE_LIMIT)})`);
      console.error('💡 Optimisations recommandées:');
      console.error('   - Activer code splitting');
      console.error('   - Lazy load des composants non-critiques');
      console.error('   - Optimiser les dépendances');
      console.error('   - Utiliser des images optimisées');
      process.exit(1);
    } else {
      const remaining = BUNDLE_SIZE_LIMIT - totalGzippedSize;
      console.log(`\n✅ SUCCÈS: Bundle dans les limites (${formatBytes(remaining)} restant)`);

      // Calcul du ratio de compression
      const compressionRatio = ((totalSize - totalGzippedSize) / totalSize * 100).toFixed(1);
      console.log(`   Ratio de compression: ${compressionRatio}%`);
    }

    // Métriques de performance estimées
    console.log('\n⚡ Métriques de performance:');
    console.log(`   Temps de chargement estimé (4G): ~${Math.round(totalGzippedSize / 1024 / 50)}s`);
    console.log(`   Temps de chargement estimé (WiFi): ~${Math.round(totalGzippedSize / 1024 / 200)}s`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse du bundle:', error.message);
    process.exit(1);
  }
}

// Exécuter l'analyse
analyzeBundle();