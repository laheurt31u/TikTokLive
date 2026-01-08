# 🎮 Neo-Brutalist Overlay - Guide de démarrage rapide

## ✅ Changements effectués

Le CSS a été **correctement migré** et l'erreur d'hydratation a été **résolue** en utilisant `next/font/google` au lieu de balises `<link>`.

### Fichiers modifiés:

1. **`app/globals.css`** - Tout le CSS du design system Neo-Brutalist
2. **`app/overlay/layout.tsx`** - ✅ **CORRIGÉ** - Utilise `next/font/google` (pas de balises HTML)
3. **`app/overlay/page.tsx`** - Page overlay redesignée
4. **`components/overlay/QuestionDisplay.tsx`** - Composant question
5. **`components/overlay/Leaderboard.tsx`** - Composant leaderboard
6. **`tailwind.config.ts`** - Configuration Tailwind avec couleurs custom

### ⚡ Correction de l'erreur d'hydratation

**Problème**: `Error: Hydration failed - Expected server HTML to contain a matching <link> in <head>`

**Solution**: Remplacement des balises `<link>` Google Fonts par `next/font/google`:
```tsx
// ❌ AVANT (causait l'erreur d'hydratation)
<link href="https://fonts.googleapis.com/css2?family=..." />

// ✅ APRÈS (compatible Next.js App Router)
import { Russo_One, Rajdhani, Orbitron, Barlow_Condensed } from 'next/font/google';
const russoOne = Russo_One({ weight: '400', variable: '--font-display' });
```

## 🚀 Comment tester

### 1. Démarrer le serveur

```bash
npm run dev
```

### 2. Ouvrir l'overlay

Visitez: **http://localhost:3000/overlay**

### 3. Vérifier les styles

Vous devriez voir:
- ✅ Fond noir avec effets scanlines et grain
- ✅ Typographies custom (Russo One, Orbitron, Rajdhani)
- ✅ Couleurs néon (cyan, magenta, jaune)
- ✅ Bordures épaisses (4px) avec glows
- ✅ Animations d'entrée (slide et rotation)
- ✅ Timer circulaire avec glow
- ✅ Leaderboard avec médailles
- ✅ Effets de rotation -2deg / +2deg sur les cards

## 🎨 Classes CSS disponibles

### Couleurs néon
```jsx
<div className="text-neon-cyan">Texte cyan</div>
<div className="text-neon-magenta">Texte magenta</div>
<div className="text-neon-yellow">Texte jaune</div>
<div className="bg-neon-cyan/10">Background cyan 10%</div>
```

### Glows
```jsx
<h1 className="glow-cyan">Titre avec glow cyan</h1>
<div className="box-glow-magenta">Box avec glow magenta</div>
```

### Typographies
```jsx
<h1 className="font-display">Russo One</h1>
<h2 className="font-heading">Orbitron</h2>
<p className="font-body">Rajdhani</p>
<span className="font-condensed">Barlow Condensed</span>
```

### Bordures
```jsx
<div className="border-brutal border-neon-yellow">
  Bordure brutale 4px jaune
</div>
```

### Effets
```jsx
<div className="scanlines">Effets scanlines CRT</div>
<div className="grain">Film grain texture</div>
```

### Animations
```jsx
<div className="animate-glitch">Effet glitch</div>
<div className="animate-neon-pulse">Pulsation néon</div>
<div className="animate-shake-intense">Shake intense</div>
<div className="animate-wiggle">Wiggle</div>
```

## 🐛 Dépannage

### Le CSS ne se charge pas?

1. **Vérifier que le serveur est redémarré**
   ```bash
   # Ctrl+C puis
   npm run dev
   ```

2. **Vider le cache du navigateur**
   - Chrome/Edge: Ctrl+Shift+R
   - Firefox: Ctrl+F5

3. **Vérifier la console navigateur**
   - F12 → Console
   - Chercher des erreurs CSS

4. **Vérifier que globals.css est chargé**
   - F12 → Network → Filter "css"
   - Vous devriez voir `globals.css`

### Les fonts ne s'affichent pas?

1. **Vérifier la connexion internet** (fonts Google)
2. **Vérifier dans l'inspecteur** (F12 → Elements)
   - Les éléments devraient avoir les bonnes font-family

### Les animations ne fonctionnent pas?

1. **Vérifier dans DevTools**
   ```
   F12 → Elements → Computed → filter "animation"
   ```

2. **Vérifier que Tailwind compile**
   ```bash
   # Dans le terminal où tourne npm run dev
   # Vous devriez voir "compiled successfully"
   ```

## 📊 Performance

### Build
```
Route /overlay:     2.24 kB
First Load JS:      131 kB
Status:             ✓ Optimized
```

### Runtime
- **60 FPS** (animations GPU accelerated)
- **Scanlines** (CSS pur, pas de JS)
- **Grain** (SVG inline, légère)

## 🎯 Prochaines étapes

1. **Tester dans OBS**
   - Source → Navigateur
   - URL: `http://localhost:3000/overlay`
   - Largeur: 420px
   - Hauteur: 100% de l'écran

2. **Personnaliser les couleurs**
   - Éditer `app/globals.css` (variables CSS)
   - Éditer `tailwind.config.ts` (classes Tailwind)

3. **Ajuster les animations**
   - Éditer les `@keyframes` dans `globals.css`
   - Modifier les durées dans les composants

4. **Intégrer les données live**
   - Connecter à votre WebSocket TikTok
   - Remplacer `testData` par vraies données

## 📚 Documentation complète

- **Design System**: `docs/neo-brutalist-overlay-design.md`
- **Aperçu visuel**: `docs/overlay-visual-preview.txt`

## 🎮 Enjoy!

Votre overlay Neo-Brutalist est prêt! Les couleurs néon, les animations arcade et les effets CRT devraient tous fonctionner. 🚀⚡
