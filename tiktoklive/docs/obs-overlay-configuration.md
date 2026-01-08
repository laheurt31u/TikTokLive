# Configuration OBS Browser Source pour Overlay TikTokLive

## 🎯 Objectif

Optimiser la configuration OBS Studio pour une performance maximale avec l'overlay TikTokLive, assurant une intégration fluide sans impact sur le streaming.

## ⚙️ Configuration Recommandée

### 1. Ajout de la Browser Source

1. **Dans OBS Studio**, clic droit dans les Sources → "Ajouter" → "Source Navigateur"
2. **Nom de la source** : `TikTokLive Overlay`
3. **URL** : `http://localhost:3000/overlay` (ou votre domaine de production)
4. **Largeur** : 1920 (ou résolution de votre stream)
5. **Hauteur** : 1080 (ou résolution de votre stream)

### 2. Paramètres de Performance

#### ✅ Réglages Recommandés
```yaml
# Dans les propriétés de la Browser Source
Largeur: 1920
Hauteur: 1080
FPS: 60
Désactiver quand pas visible: ✅
Actualiser le navigateur au démarrage: ✅
```

#### 🔧 Paramètres Avancés
```yaml
# Onglet "Avancé" dans OBS
Accélération matérielle: ❌ DÉSACTIVÉ (pour compatibilité)
Isolation du site: ❌ DÉSACTIVÉ
Page de démarrage personnalisée: ✅ http://localhost:3000/overlay
```

### 3. Configuration selon la Résolution

| Résolution OBS | Largeur Overlay | Hauteur Overlay | Notes |
|----------------|-----------------|-----------------|-------|
| 720p (1280x720) | 1280 | 720 | Streaming léger |
| 1080p (1920x1080) | 1920 | 1080 | **Recommandé** |
| 1440p (2560x1440) | 2560 | 1440 | Haute qualité |
| 4K (3840x2160) | 3840 | 2160 | Ultra haute qualité |

## 🔍 Remote Debugging pour Développement

### Activation du Remote Debugging

1. **Lancer OBS Studio** avec le paramètre de debug :
   ```bash
   obs --remote-debugging-port=9222
   ```

2. **Dans Chrome/Chromium**, accéder à :
   ```
   chrome://inspect/#devices
   ```

3. **Configurer le port personnalisé** :
   - Aller dans les propriétés de la Browser Source OBS
   - Onglet "Avancé"
   - Activer "Port de débogage personnalisé"
   - Port : `9222`

### Debugging en Action

- **Inspecter l'overlay** : Clic droit sur la source → "Interagir"
- **Console JavaScript** : Pour déboguer les WebSocket et animations
- **Network** : Pour vérifier les connexions temps réel
- **Performance** : Pour mesurer les FPS et l'utilisation CPU

## 🧪 Tests d'Intégration OBS

### Test 1: Performance de Base
```bash
# Vérifier que l'overlay ne dépasse pas 5% CPU
# pendant le streaming actif
```

### Test 2: Résolutions Multiples
- [ ] 720p : Vérifier adaptation automatique des polices
- [ ] 1080p : Performance optimale attendue
- [ ] 1440p : Adaptation des animations
- [ ] 4K : Gestion mémoire optimisée

### Test 3: Stabilité du Streaming
- [ ] Démarrage/arrêt OBS sans crash
- [ ] Changement de scène avec overlay
- [ ] Streaming de 1h+ sans dégradation
- [ ] Reconnexion automatique après coupure

### Test 4: Synchronisation Temps Réel
- [ ] Questions apparaissent instantanément (< 100ms)
- [ ] Animations fluides à 60 FPS
- [ ] Leaderboard mis à jour en temps réel
- [ ] Pas de délai visible entre action et affichage

## 🚨 Dépannage Courant

### Problème : Overlay noir/transparent
**Solution** :
- Vérifier que l'URL est accessible
- Désactiver l'accélération matérielle OBS
- Redémarrer OBS Studio

### Problème : Animations saccadées
**Solution** :
- Forcer le FPS à 60 dans OBS
- Désactiver l'accélération matérielle
- Vérifier la configuration GPU

### Problème : Délai dans l'affichage
**Solution** :
- Vérifier la connexion WebSocket
- Optimiser le bundle (< 200KB gzippé)
- Activer la compression côté serveur

### Problème : Haute utilisation CPU
**Solution** :
- Désactiver les animations non-essentielles
- Optimiser les images/fonds
- Utiliser CSS transforms au lieu de propriétés layout

## 📊 Métriques de Performance

### Cibles à Atteindre
- **Bundle JavaScript** : < 200KB gzippé
- **Premier rendu** : < 500ms
- **Utilisation CPU** : < 5% pendant streaming
- **Mémoire** : < 50MB pour overlay seul
- **FPS** : 60 FPS constant

### Monitoring Continu
```javascript
// Code pour mesurer les performances en temps réel
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 16.67) { // > 1 frame à 60 FPS
      console.warn(`Frame drop détecté: ${entry.duration}ms`);
    }
  }
});
performanceObserver.observe({ entryTypes: ['measure'] });
```

## 🎯 Checklist de Validation Finale

- [ ] Overlay s'affiche correctement dans OBS
- [ ] Animations fluides à toutes les résolutions
- [ ] WebSocket connecté et fonctionnel
- [ ] Bundle optimisé (< 200KB gzippé)
- [ ] Remote debugging opérationnel
- [ ] Tests de performance passés
- [ ] Streaming stable pendant 1h+
- [ ] Intégration complète validée

## 📚 Ressources Supplémentaires

- [Documentation OBS Browser Source](https://obsproject.com/wiki/Sources-Guide#browser-source)
- [Guide de Performance Web](https://web.dev/performance/)
- [Optimisation React](https://react.dev/learn/render-and-commit)