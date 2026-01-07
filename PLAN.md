# Plan d'Implémentation - TikTok Live Quiz

## Phase 1 : Setup Initial (Base)

### Étape 1.1 : Initialisation Projet
- [ ] Créer projet Next.js avec TypeScript
- [ ] Configurer Tailwind CSS
- [ ] Setup structure dossiers (backend/, frontend/, etc.)
- [ ] Configurer ESLint/Prettier
- [ ] Créer `.env.example` avec variables nécessaires

### Étape 1.2 : Configuration Base de Données
- [ ] Créer compte Supabase
- [ ] Créer tables PostgreSQL (questions, scores)
- [ ] Setup migrations SQL
- [ ] Configurer client Supabase dans projet
- [ ] Créer types TypeScript depuis schema DB

### Étape 1.3 : Configuration Redis
- [ ] Créer compte Upstash Redis (ou self-hosted)
- [ ] Configurer client Redis
- [ ] Créer helpers pour leaderboard cache

**Livrable Phase 1** : Projet Next.js fonctionnel avec DB connectée

---

## Phase 2 : Backend Core

### Étape 2.1 : API Questions
- [ ] Route `/api/questions/active` - Récupérer question active
- [ ] Route `/api/questions/:id` - Détails question
- [ ] Route `/api/questions/expire` - Marquer expirées (cron)
- [ ] Validation données avec Zod

### Étape 2.2 : Service TikTok
- [ ] Installer `tiktok-live-connector`
- [ ] Créer service `TikTokService` avec connexion
- [ ] Écouter événements `comment`
- [ ] Gérer reconnexion automatique
- [ ] Logger événements pour debug

### Étape 2.3 : Service Quiz Logic
- [ ] Parser réponses (masquer lettres/chiffres)
- [ ] Fonction match exact/partial
- [ ] Validation première réponse correcte
- [ ] Attribution points
- [ ] Rate limiting (1 réponse/user/question)

### Étape 2.4 : WebSocket (Socket.io)
- [ ] Setup Socket.io server
- [ ] Émettre événements :
  - `question:new` - Nouvelle question
  - `answer:update` - Réponse partielle reçue
  - `answer:correct` - Bonne réponse trouvée
  - `leaderboard:update` - Mise à jour scores
- [ ] Gérer connexions/déconnexions

**Livrable Phase 2** : Backend connecté TikTok, logique quiz fonctionnelle

---

## Phase 3 : Frontend Overlay

### Étape 3.1 : Page Overlay OBS
- [ ] Créer `/overlay` page Next.js
- [ ] Design fullscreen pour OBS
- [ ] Composant Question (grande taille)
- [ ] Composant Timer (countdown)
- [ ] Styling avec Tailwind (dark theme)

### Étape 3.2 : Affichage Réponses Progressives
- [ ] Composant `Answers.tsx`
- [ ] Logique masquage lettres/chiffres
- [ ] Animation révélation progressive
- [ ] Affichage username qui répond

### Étape 3.3 : Leaderboard Live
- [ ] Composant `Leaderboard.tsx`
- [ ] Top 10 scores
- [ ] Animation updates
- [ ] Highlight user actif

### Étape 3.4 : WebSocket Client
- [ ] Hook `useWebSocket` (Socket.io-client)
- [ ] Écouter événements backend
- [ ] Update state React
- [ ] Gérer reconnexion

**Livrable Phase 3** : Interface OBS fonctionnelle avec updates temps réel

---

## Phase 4 : TTS & Audio

### Étape 4.1 : Text-to-Speech
- [ ] Option 1 : Web Speech API (browser)
- [ ] Option 2 : ElevenLabs API (backend)
- [ ] Service TTS dans backend
- [ ] Lecture question + indices (timed)
- [ ] Gestion audio queue

### Étape 4.2 : Synchronisation
- [ ] Sync TTS avec affichage question
- [ ] Émettre événement WebSocket quand TTS fini
- [ ] Timer démarre après TTS

**Livrable Phase 4** : Questions lues automatiquement

---

## Phase 5 : n8n Workflow

### Étape 5.1 : Setup n8n
- [ ] Installer n8n (Docker ou cloud)
- [ ] Configurer credentials OpenAI
- [ ] Configurer credentials Supabase/PostgreSQL

### Étape 5.2 : Workflow Génération
- [ ] Noeud Cron (00:00 quotidien)
- [ ] Noeud OpenAI (prompt génération questions)
- [ ] Noeud Parse JSON
- [ ] Noeud Validation format
- [ ] Noeud Insert PostgreSQL
- [ ] Noeud HTTP (webhook backend reload)

### Étape 5.3 : Workflow Expiration
- [ ] Cron (00:10) ou trigger DB
- [ ] Marquer questions expirées
- [ ] Reset leaderboard
- [ ] Notification backend

**Livrable Phase 5** : Génération automatique questions quotidiennes

---

## Phase 6 : Améliorations & Polish

### Étape 6.1 : Gestion Erreurs
- [ ] Error boundaries React
- [ ] Retry logic TikTok connexion
- [ ] Fallback si WebSocket fail
- [ ] Logging structuré (Winston/Pino)

### Étape 6.2 : Performance
- [ ] Optimisation Redis queries
- [ ] Debounce updates leaderboard
- [ ] Lazy loading composants
- [ ] Cache questions actives

### Étape 6.3 : Features Bonus
- [ ] Export CSV scores fin live
- [ ] API modération (ban users)
- [ ] Statistiques (taux réussite, etc.)
- [ ] Thèmes configurables
- [ ] Mode multi-questions simultanées

### Étape 6.4 : Tests
- [ ] Tests unitaires services
- [ ] Tests intégration API
- [ ] Tests E2E overlay
- [ ] Tests TikTok mock

**Livrable Phase 6** : Système robuste et production-ready

---

## Phase 7 : Déploiement

### Étape 7.1 : Préparation
- [ ] Variables d'environnement production
- [ ] Build optimisé Next.js
- [ ] Tests pré-déploiement

### Étape 7.2 : Déploiement
- [ ] Backend/Frontend → Vercel
- [ ] Database → Supabase (production)
- [ ] Redis → Upstash (production)
- [ ] n8n → Self-hosted ou cloud

### Étape 7.3 : Configuration OBS
- [ ] Guide setup OBS Browser Source
- [ ] Test stream TikTok dev
- [ ] Documentation utilisateur

**Livrable Phase 7** : Système déployé et fonctionnel

---

## Ordre Recommandé d'Implémentation

1. **Phase 1** (Setup) - Base solide
2. **Phase 2** (Backend Core) - Cœur fonctionnel
3. **Phase 3** (Frontend) - Interface visible
4. **Phase 4** (TTS) - Expérience complète
5. **Phase 5** (n8n) - Automatisation
6. **Phase 6** (Polish) - Qualité
7. **Phase 7** (Deploy) - Production

## Notes Importantes

- **TikTok-Live-Connector** : Peut avoir des issues de connexion, prévoir fallback polling
- **Rate Limiting** : TikTok peut limiter, gérer gracieusement
- **WebSocket** : Prévoir fallback HTTP polling si WS fail
- **TTS** : Web Speech API gratuit mais limité, ElevenLabs meilleur qualité
- **n8n** : Alternative Make.com si préférence, mais n8n meilleur pour self-hosted

## Prochaines Étapes

Commencer par **Phase 1 - Étape 1.1** : Initialisation du projet Next.js.
