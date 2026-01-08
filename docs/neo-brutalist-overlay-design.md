# 🎮 Neo-Brutalist Arcade Overlay Design

## Vue d'ensemble

L'overlay TikTokLive a été complètement redesigné avec une esthétique **Neo-Brutalist Gaming Arcade** - une fusion audacieuse de bornes d'arcade rétro-futuristes et de brutalisme numérique.

## Direction artistique

### Concept
- **Inspiration**: Bornes d'arcade années 80/90 rencontrant le design brutaliste numérique
- **Énergie**: Agressif, électrique, impossible à ignorer
- **Public cible**: Audiences TikTok jeunes, gamers, culture street

### Caractéristiques distinctives
- Asymétrie prononcée (rotations -2deg / +2deg)
- Bordures épaisses et doubles avec effets néon
- Typographies techniques et display angulaires
- Palette néon électrique sur fond noir profond
- Effets CRT et glitches intentionnels

## Design System

### Palette de couleurs

```css
--neon-magenta: #ff0080    /* Magenta laser - Urgence, énergie */
--neon-cyan: #00fff9       /* Cyan acidulé - Principal, info */
--neon-yellow: #ffff00     /* Jaune arc - Accent, importance */
--neon-green: #39ff14      /* Vert néon - Succès, live */
--neon-orange: #ff6600     /* Orange laser - Progression */
--neon-purple: #bf00ff     /* Violet néon - Secondaire */

--black-deep: #0a0a0a      /* Noir profond - Background */
--black-void: #000000      /* Noir pur - Cards */
```

### Typographie

**Display (Titres principaux)**
- Font: `Russo One`
- Usage: Scores, chiffres importants, badges
- Caractère: Gras, impactant, arcade

**Headings (Titres secondaires)**
- Font: `Orbitron`
- Usage: Titres de sections, questions
- Caractère: Futuriste, technique, monospace

**Body (Texte courant)**
- Font: `Rajdhani`
- Usage: Noms d'utilisateur, descriptions
- Caractère: Moderne, lisible, technique

**Condensed (Labels, métadonnées)**
- Font: `Barlow Condensed`
- Usage: Labels, statuts, métadonnées
- Caractère: Compact, uppercase, tracking large

### Effets visuels

#### 1. Glows néon
```css
.glow-magenta {
  text-shadow:
    0 0 10px var(--neon-magenta),
    0 0 20px var(--neon-magenta),
    0 0 40px var(--neon-magenta);
}
```

#### 2. Bordures brutales
```css
.border-brutal {
  border: 4px solid currentColor;
}

/* Double border effect */
outer-border: translate(1px, 1px) + box-glow
main-border: border-brutal
```

#### 3. Scanlines CRT
- Lignes horizontales répétées (2px)
- Animation de défilement lent (8s)
- Opacité subtile (0.15)

#### 4. Film grain
- Texture SVG noise générée
- Mix-blend-mode: overlay
- Opacité: 0.05

## Composants

### QuestionDisplay
**app/overlay/page.tsx (ligne 37)**

**Caractéristiques:**
- Rotation: -2deg (asymétrie)
- Timer circulaire avec glow néon
- Coins décorés avec bordures en L
- 2 états: Normal (cyan) / Urgent (magenta)
- Animation shake-intense quand urgent
- Barre de progression au bottom

**États visuels:**
```
Normal (>10s):  Cyan glow, calm animations
Urgent (<10s):  Magenta glow, shake, glitch effect
```

### Leaderboard
**components/overlay/Leaderboard.tsx**

**Caractéristiques:**
- Rotation: +2deg (asymétrie opposée)
- Top 5 avec système de couleurs gradué
- Médailles animées pour top 3 (👑🥈🥉)
- Badges "NEW" pour nouveaux joueurs
- Barres de progression colorées

**Hiérarchie visuelle:**
```
Rank 1: Yellow glow + Champion badge + 100% progress bar
Rank 2: Cyan glow + Runner-up badge + 80% progress bar
Rank 3: Magenta glow + Bronze badge + 60% progress bar
Rank 4-5: White/subtle + no badges
```

### Animations

#### Entrée de page
```
Question card:  slide-in-top (0.6s, delay 0.1s)
Leaderboard:    slide-in-bottom (0.7s, delay 0.3s)
Branding:       zoom-bounce (0.5s, delay 0.6s)
```

#### Micro-interactions
```
Timer urgent:   shake-intense (0.5s infinite)
Trophy emoji:   neon-pulse (2s ease-in-out)
Live indicator: pulse (standard)
Medal emojis:   wiggle (2s with stagger)
New entries:    slide-in-left (0.4s)
Points update:  rotate-cw + scale + glow
```

#### Effets d'arrière-plan
```
Ambient glows:  2 blurred circles (magenta + cyan)
Scanlines:      continuous scroll (8s linear)
Grain:          static overlay
```

## Optimisations

### Performance OBS
- GPU acceleration via `transform: translateZ(0)`
- Will-change sur éléments animés
- Animations CSS pures (pas de JS)
- Splitchunks optimisé pour overlay

### Accessibilité
- Contraste élevé (néons sur noir)
- Tailles de police lisibles
- Animations respectent prefers-reduced-motion

### Bundle size
```
/overlay route:     170 B
First Load JS:      137 kB
Status:             ✓ Optimized
```

## Utilisation

### Mode développement
```bash
npm run dev
# Visiter: http://localhost:3000/overlay
```

### Production
```bash
npm run build
npm start
# Overlay optimisé pour OBS
```

### Intégration OBS
1. Ajouter source "Navigateur"
2. URL: `http://localhost:3000/overlay`
3. Largeur: 420px (format TikTok mobile)
4. Hauteur: 100% écran
5. Activer "Actualiser le navigateur..."
6. FPS personnalisé: 60

### Variables de test

La page inclut des données de test par défaut:
```typescript
{
  question: "Quelle est la capitale de la France ?",
  timeLeft: 15,  // Change to <10 for urgent state
  leaderboard: [5 entries with mixed states]
}
```

## Fichiers modifiés

### Design System
- `app/overlay/layout.tsx` - Fonts, CSS variables, animations

### Pages
- `app/overlay/page.tsx` - Main overlay avec composition asymétrique

### Composants
- `components/overlay/QuestionDisplay.tsx` - Question card redesignée
- `components/overlay/Leaderboard.tsx` - Leaderboard néo-brutaliste

### Configuration
- `next.config.js` - Optimisations webpack pour overlay
- `tsconfig.json` - Exclusions de dossiers dev

## Notes techniques

### Classes utilitaires clés
```css
.font-display      /* Russo One */
.font-heading      /* Orbitron */
.font-body         /* Rajdhani */
.font-condensed    /* Barlow Condensed */

.neon-magenta      /* Couleur magenta */
.neon-cyan         /* Couleur cyan */
.neon-yellow       /* Couleur yellow */

.glow-magenta      /* Text glow magenta */
.glow-cyan         /* Text glow cyan */
.glow-yellow       /* Text glow yellow */

.box-glow-magenta  /* Box shadow glow magenta */
.box-glow-cyan     /* Box shadow glow cyan */

.border-brutal     /* 4px solid border */
.scanlines         /* CRT scanline effect */
.grain             /* Film grain overlay */
```

### Animations disponibles
```css
glitch             /* Position glitch */
glitch-skew        /* Skew glitch */
neon-pulse         /* Glow pulsation */
scanline-move      /* Scanline scroll */
flicker            /* CRT flicker */
slide-in-top       /* Slide + rotate from top */
slide-in-bottom    /* Slide + rotate from bottom */
slide-in-left      /* Slide from left */
zoom-bounce        /* Zoom with bounce */
rotate-cw          /* Rotate clockwise */
shake-intense      /* Intense shake */
```

## Évolutions futures

### Phase 2 - Interactivité avancée
- [ ] Confettis lors des victoires
- [ ] Screen flash sur nouvelles questions
- [ ] Particle effects sur rank changes
- [ ] Glitch transitions entre questions

### Phase 3 - Personnalisation
- [ ] Thèmes de couleurs alternatifs
- [ ] Mode "Retro CRT" vs "Modern Neon"
- [ ] Animations configurables
- [ ] Taille d'overlay ajustable

### Phase 4 - Analytics
- [ ] Tracking des performances visuelles
- [ ] A/B testing des animations
- [ ] Métriques d'engagement viewer

---

**Créé le**: 2026-01-08
**Design par**: Claude Sonnet 4.5 (Frontend Design Specialist)
**Style**: Neo-Brutalist Gaming Arcade
**Status**: ✅ Production Ready
