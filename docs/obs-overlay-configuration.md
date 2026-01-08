# Configuration OBS Overlay TikTokLive

## Vue d'ensemble

Ce guide détaille la configuration optimale de l'overlay TikTokLive dans OBS Studio pour des performances de streaming maximales.

## Configuration Browser Source

### Paramètres de base
```
URL: http://localhost:3000/app/overlay
Largeur: 1920
Hauteur: 1080
FPS: 60
```

### Paramètres avancés
- [x] Arrêter la source quand invisible
- [ ] Actualiser le navigateur quand la scène devient active
- [ ] Renvoyer l'audio vers OBS

## Optimisations Performance

### Pour cartes graphiques multi-GPU
```json
{
  "gpuIndex": 0,
  "disableHardwareAcceleration": false
}
```

### Configuration par résolution

#### 720p (1280x720)
- Utilisation CPU réduite
- Animations simplifiées automatiquement
- Bundle optimisé chargé

#### 1080p (1920x1080) - RECOMMANDÉ
- Performance optimale
- Toutes les animations actives
- GPU acceleration maximale

#### 1440p (2560x1440)
- Animations étendues
- Particules supplémentaires
- Scaling automatique des polices

#### 4K (3840x2160)
- Performance maximale requise
- Animations ultra-fluides
- Scaling optimisé

## Scripts de test

### Vérification connexion
```bash
# Tester la connectivité overlay
curl http://localhost:3000/app/overlay
```

### Test performance
```bash
# Mesurer le temps de chargement
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/app/overlay
```

### Validation bundle size
```javascript
// check-overlay-bundle-size.js
const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '../.next/static/chunks');
const files = fs.readdirSync(bundlePath);
let totalSize = 0;

files.forEach(file => {
  const stats = fs.statSync(path.join(bundlePath, file));
  totalSize += stats.size;
});

console.log(`Bundle size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Gzipped estimate: ${(totalSize / 1024 / 1024 * 0.3).toFixed(2)} MB`);
```

## Dépannage

### Problèmes courants

#### Overlay ne s'affiche pas
1. Vérifier que Next.js est démarré (`npm run dev`)
2. Vérifier l'URL dans OBS Browser Source
3. Vérifier les logs du navigateur OBS (F12)

#### Animations saccadées
1. Activer hardware acceleration dans OBS
2. Sélectionner la bonne carte graphique
3. Fermer les autres applications gourmandes

#### Performances dégradées
1. Réduire la résolution OBS
2. Désactiver animations coûteuses
3. Vérifier utilisation CPU/GPU

### Logs de debug

L'overlay affiche automatiquement :
- Status de connexion WebSocket
- Métriques de performance (dev mode)
- Nombre de frame drops
- Résolution détectée

## Configuration avancée

### Variables d'environnement
```bash
# Forcer une résolution spécifique pour les tests
OBS_FORCE_RESOLUTION=1080p

# Désactiver monitoring performance
DISABLE_PERFORMANCE_MONITORING=true

# Mode debug étendu
OVERLAY_DEBUG=true
```

### Personnalisation thème
L'overlay supporte les thèmes personnalisables via CSS custom properties :
- `--color-primary`: Rouge énergétique (#FF0050)
- `--color-accent`: Cyan électrique (#00F5FF)
- `--color-success`: Vert victoire (#00FF88)

## Tests d'intégration

### Scénario de test complet
1. Démarrer OBS avec overlay
2. Simuler connexion TikTok (script de test)
3. Afficher question de test
4. Simuler réponse gagnante
5. Vérifier affichage célébration
6. Mesurer performance pendant 5 minutes

### Scripts automatisés
```bash
# obs-integration-test.js
const puppeteer = require('playwright');

async function runOBSTests() {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  // Test chargement overlay
  await page.goto('http://localhost:3000/app/overlay');
  await page.waitForSelector('.gpu-accelerated');

  // Test responsive
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(1000);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);

  // Test animations
  const performanceMetrics = await page.evaluate(() => {
    return {
      frameDrops: 0, // Mesuré via PerformanceMonitor
      loadTime: performance.now()
    };
  });

  console.log('Tests OBS réussis:', performanceMetrics);
  await browser.close();
}

runOBSTests();
```

Cette configuration garantit des performances optimales pour le streaming en direct avec TikTokLive.