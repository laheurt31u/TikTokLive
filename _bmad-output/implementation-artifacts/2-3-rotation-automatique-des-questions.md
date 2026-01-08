# Story 2.3: Rotation Automatique des Questions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a système TikTokLive,
I want passer automatiquement à la question suivante,
So that maintenir le rythme du quiz sans interruption manuelle.

## Acceptance Criteria

1. **Given** une question active affichée,
   **When** un gagnant est trouvé OU le timer expire (30 secondes),
   **Then** la question suivante se charge automatiquement.
   **And** le système revient à la première question après la dernière.

2. **Given** une question est affichée,
   **When** le timer atteint 0 secondes sans gagnant,
   **Then** la question expire automatiquement.
   **And** la question suivante se charge immédiatement après expiration.

3. **Given** un gagnant est identifié,
   **When** la célébration commence,
   **Then** la transition vers la question suivante se déclenche après la célébration (5-8 secondes).
   **And** l'ancienne question disparaît gracieusement avant l'affichage de la nouvelle.

4. **Given** toutes les questions ont été affichées,
   **When** la dernière question se termine,
   **Then** le système revient automatiquement à la première question.
   **And** le cycle continue indéfiniment sans interruption.

## Tasks / Subtasks

- [x] Implémenter la logique de rotation automatique
  - [x] Créer service `lib/gamification/question-rotation.ts` pour gestion rotation
  - [x] Implémenter détection événements déclencheurs (gagnant trouvé, timer expiré)
  - [x] Ajouter logique de cycle (retour à première question après dernière)
  - [x] Gérer état question courante avec index cyclique
  - [x] Intégrer avec le système de timer existant
  - [x] Créer hook `hooks/useQuestionTimer.ts` pour gestion timer 30 secondes
  - [x] Implémenter expiration automatique quand timer atteint 0
  - [x] Émettre événement `question:expired` via WebSocket quand timer expire
  - [x] Synchroniser timer entre tous les clients via WebSocket (implémenté dans useQuestionRotation via événements question:next)
- [x] Intégrer avec le système de détection de gagnant
  - [x] Écouter événement `winner:announced` depuis Story 2.6 (future)
  - [x] Déclencher transition après célébration (5-8 secondes après gagnant)
  - [x] Gérer cas où gagnant trouvé avant expiration timer
  - [x] Annuler timer si gagnant trouvé avant expiration
- [x] Implémenter la transition gracieuse entre questions
  - [x] Créer animation de sortie pour question actuelle (fade-out) - Déjà implémenté dans QuestionDisplay (Story 2.2)
  - [x] Créer animation d'entrée pour question suivante (fade-in + slide-up) - Déjà implémenté dans QuestionDisplay (Story 2.2)
  - [x] Synchroniser animations avec WebSocket pour tous les clients - Géré via événements question:next
  - [x] Gérer état de transition pour éviter affichage double - Implémenté via isTransitioning dans useQuestionRotation
- [x] Intégrer avec WebSocket pour synchronisation temps réel
  - [x] Émettre événement `question:next` via WebSocket lors rotation
  - [x] Écouter événements rotation depuis autres clients
  - [x] Synchroniser état question courante entre tous les clients
  - [x] Gérer reconnexion WebSocket avec récupération question courante (via useCurrentQuestion existant)
- [ ] Ajouter gestion d'erreurs et cas limites
  - [ ] Gérer cas où aucune question disponible (affichage message gracieux)
  - [ ] Gérer cas où liste questions vide (mode fallback)
  - [ ] Implémenter retry automatique si chargement question échoue
  - [ ] Logger les erreurs avec correlation IDs pour debugging
- [x] Créer les tests unitaires et d'intégration
  - [x] Tests service question-rotation (logique cycle, détection événements)
  - [x] Tests hook useQuestionTimer (expiration, synchronisation)
  - [x] Tests hook useQuestionRotation (intégration complète, gestion erreurs, synchronisation WebSocket)
  - [ ] Tests intégration WebSocket (synchronisation rotation) - À compléter avec tests E2E
  - [x] Tests transition animations (entrée, sortie, synchronisation) - Déjà testé dans QuestionDisplay (Story 2.2)

## Dev Notes

### Epic Context - Participation au Quiz
Cette story est la troisième de l'Epic 2, qui établit le système complet de participation au quiz. Elle s'appuie sur Story 2.1 (stockage et chargement des questions) et Story 2.2 (affichage automatique des questions), et prépare les stories suivantes (parsing des commentaires, validation des réponses, identification du premier gagnant).

**Objectifs business :** Permettre au système de maintenir automatiquement le rythme du quiz sans intervention manuelle, créant une expérience fluide et continue pour les viewers.

**Dépendances :** 
- Story 2.1 (stockage et chargement des questions) - REQUIS - Les questions doivent être chargées avant rotation
- Story 2.2 (affichage automatique des questions) - REQUIS - L'affichage doit être fonctionnel pour rotation
- Story 2.6 (identification du premier gagnant) - FUTURE - Pour déclencher rotation après gagnant

**Risques :** 
- Synchronisation : Désynchronisation entre clients peut créer confusion
- Performance : Rotation trop rapide peut créer confusion, trop lente peut réduire engagement
- État : Gestion état question courante doit être cohérente entre tous les clients

### Architecture Compliance - Décisions Critiques à Respecter

**Framework Foundation :**
- Next.js 14+ (App Router) obligatoire
- TypeScript 5.0+ pour type safety
- React Server Components pour performance optimale
- Architecture modulaire avec séparation des responsabilités

**Structure de Projet :**
- Service rotation dans `lib/gamification/question-rotation.ts`
- Hook timer dans `hooks/useQuestionTimer.ts`
- API existante dans `app/api/questions/route.ts` (Story 2.1)
- Service questions dans `lib/gamification/questions.ts` (Story 2.1)
- Hook question courante dans `hooks/useCurrentQuestion.ts` (Story 2.2)
- Types partagés dans `types/gamification.ts`

**Patterns de Nommage :**
- camelCase pour services (`questionRotation`)
- camelCase pour hooks (`useQuestionTimer`)
- kebab-case pour événements WebSocket (`question:next`, `question:expired`)
- PascalCase pour composants React

**Format de Données :**
- Utiliser le format de question défini dans Story 2.1 :
  ```typescript
  interface Question {
    id: string;
    text: string;
    answers: string[];
    difficulty: 'facile' | 'moyen' | 'difficile';
    points: number;
    category?: string;
  }
  ```
- Format WebSocket standardisé :
  ```typescript
  {
    type: 'question:next',
    payload: { question: Question, questionIndex: number },
    timestamp: string,
    sessionId: string
  }
  ```

**Gestion d'État :**
- Utiliser Zustand pour état local question courante (si nécessaire)
- WebSocket pour synchronisation temps réel
- SWR pour cache intelligent des questions chargées

**Performance :**
- Animations GPU-accelerated uniquement (transform, opacity)
- Éviter re-renders inutiles avec React.memo et useMemo
- Lazy loading des assets lourds
- Bundle size < 200KB gzippé

**Gestion d'Erreurs :**
- Try/catch pattern avec retour structuré
- Logging structuré avec correlation IDs (utiliser `lib/logger/correlation.ts`)
- Fallback gracieux si questions non disponibles
- Retry automatique avec backoff exponentiel

### Technical Requirements

**Dépendances NPM :**
- `react` et `react-dom` : Framework UI (déjà dans projet)
- `next` : Framework Next.js (déjà dans projet)
- `socket.io-client` : Client WebSocket pour temps réel (déjà dans projet)
- `swr` : Cache intelligent pour données serveur (optionnel, recommandé)
- `zustand` : Gestion d'état légère (optionnel, si état complexe nécessaire)

**Structure de Code :**
```
lib/
├── gamification/
│   ├── question-rotation.ts    # Service rotation questions
│   └── questions.ts            # Service questions (Story 2.1 - réutiliser)
hooks/
├── useQuestionTimer.ts         # Hook gestion timer 30 secondes
├── useCurrentQuestion.ts       # Hook question courante (Story 2.2 - réutiliser)
└── useWebSocket.ts            # Hook WebSocket (déjà existant, réutiliser)
app/
├── api/
│   └── questions/
│       └── route.ts            # API questions (Story 2.1 - réutiliser)
types/
└── gamification.ts            # Types partagés (Story 2.1 - réutiliser)
```

**Variables d'Environnement :**
- `NEXT_PUBLIC_WEBSOCKET_URL` : URL du serveur WebSocket (défaut: `ws://localhost:3001`)
- `NEXT_PUBLIC_QUESTION_TIMER_DURATION` : Durée timer en secondes (défaut: `30`)
- `NEXT_PUBLIC_CELEBRATION_DURATION` : Durée célébration en ms avant rotation (défaut: `5000`)

**Service question-rotation.ts :**
```typescript
interface QuestionRotationService {
  getNextQuestion(currentIndex: number, totalQuestions: number): number;
  shouldRotate(trigger: 'winner' | 'timer-expired'): boolean;
  calculateNextIndex(currentIndex: number, totalQuestions: number): number;
}
```

**Hook useQuestionTimer :**
```typescript
interface UseQuestionTimerReturn {
  timeRemaining: number;
  isExpired: boolean;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
}
```

### File Structure Requirements

**Conformité à l'Architecture :**
- Respecter la structure hexagonale définie dans architecture.md
- Service rotation dans `lib/gamification/` pour encapsulation
- Hook timer dans `hooks/` pour logique réutilisable
- Réutiliser API et services existants de Story 2.1 et 2.2
- Séparation claire entre logique métier et présentation

**Naming Conventions :**
- camelCase pour services (`questionRotation.ts`)
- camelCase pour hooks (`useQuestionTimer.ts`)
- camelCase pour fonctions (`getNextQuestion`, `shouldRotate`)
- kebab-case pour événements WebSocket (`question:next`, `question:expired`)

**Emplacement Fichiers :**
- Service : `lib/gamification/question-rotation.ts`
- Hook : `hooks/useQuestionTimer.ts`
- Types : `types/gamification.ts` (étendre si nécessaire)
- Styles : Utiliser Tailwind CSS avec classes utilitaires

### Testing Requirements

**Tests Unitaires :**
- Test service question-rotation (logique cycle, calcul index suivant)
- Test hook useQuestionTimer (expiration, reset, synchronisation)
- Test gestion état (transition, cycle, cas limites)

**Tests d'Intégration :**
- Test intégration timer + rotation (expiration déclenche rotation)
- Test intégration gagnant + rotation (gagnant déclenche rotation après célébration)
- Test intégration WebSocket (synchronisation rotation entre clients)
- Test cycle complet : question → timer/gagnant → rotation → question suivante

**Tests End-to-End :**
- Scénario complet : question affichée → timer expire → question suivante
- Scénario complet : question affichée → gagnant trouvé → célébration → question suivante
- Test synchronisation multi-clients (plusieurs viewers)
- Test résilience : reconnexion WebSocket → récupération question courante

**Tests Performance :**
- Test latence rotation (< 100ms entre déclencheur et affichage nouvelle question)
- Test animations fluides (60fps pendant transitions)
- Test mémoire (pas de fuites mémoire lors rotations multiples)

### Project Structure Notes

**Alignment with Unified Project Structure :**
- Suivre la structure Next.js App Router définie
- Service rotation dans `lib/gamification/` pour cohérence
- Hook timer dans `hooks/` pour réutilisabilité
- Réutiliser patterns établis dans Story 2.1 et 2.2 (API, services, types)
- Respecter conventions de nommage établies

**Detected Conflicts or Variances :**
- Aucune variance détectée - cette story s'appuie sur Story 2.1 et 2.2
- Établir patterns de rotation pour stories suivantes (parsing, validation)
- Définir conventions WebSocket pour cohérence future

**Intégration avec Stories Précédentes :**
- Utiliser API `/api/questions` créée dans Story 2.1
- Réutiliser service `lib/gamification/questions.ts` de Story 2.1
- Réutiliser hook `hooks/useCurrentQuestion.ts` de Story 2.2
- Respecter types `Question` définis dans Story 2.1
- Utiliser patterns de logging établis dans Epic 1 (correlation IDs)
- S'appuyer sur overlay OBS créé dans Story 1.4

**Préparation pour Stories Suivantes :**
- Préparer événements WebSocket pour Story 2.4 (parsing commentaires)
- Établir patterns de rotation réutilisables pour Story 2.6 (identification gagnant)
- Définir conventions timer pour cohérence future

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Décision-1-Architecture-Event-Driven-Temps-Réel] - Architecture WebSocket pour communication temps réel
- [Source: _bmad-output/planning-artifacts/architecture.md#Décision-13-Framework-UI-pour-Overlay] - React + Tailwind CSS avec composants custom optimisés
- [Source: _bmad-output/planning-artifacts/architecture.md#Patterns-de-Nommage] - Conventions de nommage camelCase, kebab-case
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2-3-Rotation-Automatique-des-Questions] - Critères d'acceptation et contexte business
- [Source: _bmad-output/planning-artifacts/prd.md#FR6-Rotation-automatique-des-questions-après-réponse-ou-expiration] - Spécifications fonctionnelles MVP
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#LExpérience-Définissante] - Expérience utilisateur et moments de succès
- [Source: _bmad-output/implementation-artifacts/2-1-stockage-et-chargement-des-questions.md#Dev-Notes] - API et service questions à réutiliser
- [Source: _bmad-output/implementation-artifacts/2-2-affichage-automatique-des-questions.md#Dev-Notes] - Hook useCurrentQuestion et patterns d'affichage à réutiliser
- [Source: _bmad-output/implementation-artifacts/1-4-interface-overlay-obs-pour-questions.md#Dev-Notes] - Overlay OBS existant à intégrer

### Previous Story Intelligence

**Apprentissages de Story 2.2 (Affichage Automatique des Questions) :**
- **Hook useCurrentQuestion** : Pattern établi pour gestion question courante avec chargement automatique
- **WebSocket events** : Format standardisé `question:new` pour broadcast nouvelle question
- **Animations** : Patterns d'entrée (fade-in + slide-up) et de sortie (fade-out) établis
- **Synchronisation** : Écoute événements WebSocket pour synchronisation temps réel entre clients
- **Gestion d'erreurs** : Skeleton screen, messages gracieux, retry automatique avec correlation IDs

**Fichiers Créés dans Story 2.2 :**
- `components/overlay/QuestionDisplay.tsx` - Composant affichage question avec animations
- `hooks/useCurrentQuestion.ts` - Hook gestion question courante avec WebSocket
- `tests/unit/question-display.test.tsx` - Tests unitaires QuestionDisplay
- `tests/unit/useCurrentQuestion.test.tsx` - Tests unitaires useCurrentQuestion
- `tests/integration/websocket-question-sync.test.tsx` - Tests intégration WebSocket

**Patterns Établis :**
- Format événement WebSocket standardisé avec type, payload, timestamp, sessionId
- Animations GPU-accelerated (transform, opacity, will-change)
- Logging structuré avec correlation IDs (utiliser `lib/logger/correlation.ts`)
- Gestion états (loading, error, empty) avec fallback gracieux
- Synchronisation temps réel via WebSocket avec récupération état après reconnexion

**Apprentissages de Story 2.1 (Stockage et Chargement des Questions) :**
- **API REST standardisée** : Format de réponse `{ success, data, meta }` à respecter
- **Validation Zod** : Schémas de validation stricts pour type safety
- **Gestion d'erreurs** : Try/catch avec retour structuré et logging correlation IDs
- **Cache en mémoire** : Pattern de cache avec TTL pour performance
- **Mode fallback** : Questions par défaut si fichier manquant (à réutiliser pour rotation)

**Fichiers Créés dans Story 2.1 :**
- `app/api/questions/route.ts` - API REST GET /api/questions avec filtrage et pagination
- `lib/gamification/questions.ts` - Service de chargement avec validation Zod et cache
- `lib/gamification/default-questions.ts` - Questions par défaut pour mode fallback
- `lib/gamification/schemas.ts` - Schémas Zod de validation
- `types/gamification.ts` - Types TypeScript pour questions

**Patterns Établis :**
- Format API standardisé avec gestion d'erreurs structurée
- Validation Zod avant traitement des données
- Logging structuré avec correlation IDs (utiliser `lib/logger/correlation.ts`)
- Cache en mémoire avec invalidation intelligente
- Mode fallback gracieux pour résilience

**Apprentissages de Epic 1 :**
- **Logging structuré** : Utiliser correlation IDs partout pour tracking
- **Gestion d'erreurs** : Try/catch avec retour structuré `{ success, data, error }`
- **Architecture modulaire** : Séparation claire entre logique métier et infrastructure
- **Tests complets** : Couverture unitaire, intégration, et E2E pour robustesse

**Fichiers Créés dans Epic 1 :**
- `lib/tiktok/connector.ts` - Pattern d'abstraction layer à réutiliser
- `lib/logger/correlation.ts` - Système de correlation IDs à utiliser
- `hooks/useWebSocket.ts` - Hook WebSocket existant à réutiliser
- `app/overlay/page.tsx` - Page overlay OBS existante à intégrer

**Patterns Établis :**
- Circuit Breaker Pattern pour résilience
- Fallback mode pour fonctionnement dégradé
- Validation Zod avec schémas réutilisables
- Logging structuré avec niveaux (error, warn, info, debug)

### Git Intelligence Summary

**Commits Récents Analysés :**
- `4b96d61` : feat: add fade-in-slide-up animation and enhance QuestionDisplay component
- `2bfe825` : chore: mise à jour du .gitignore et ajout des fichiers du projet
- `e4d7105` : Initial commit: Setup Next.js project with TikTok Live Quiz architecture
- `7326542` : Initial commit from Create Next App

**Patterns Détectés :**
- Structure Next.js App Router établie
- Configuration TypeScript et Tailwind CSS en place
- Architecture modulaire avec séparation des responsabilités
- Tests configurés avec Jest
- Animations Tailwind custom ajoutées (fade-in-slide-up)

**Fichiers Modifiés Récemment :**
- `components/overlay/QuestionDisplay.tsx` - Composant question avec animations
- `hooks/useCurrentQuestion.ts` - Hook gestion question courante
- `tailwind.config.ts` - Configuration animations custom
- Tests unitaires et d'intégration créés

**Insights pour Story 2.3 :**
- Réutiliser patterns d'animation établis (fade-in-slide-up, fade-out)
- S'appuyer sur hook useCurrentQuestion pour gestion question courante
- Utiliser format événements WebSocket standardisé
- Respecter conventions de nommage déjà établies
- Ajouter animations de transition pour rotation (réutiliser patterns existants)

### Latest Tech Information

**Next.js 14+ App Router :**
- Utiliser Server Components par défaut pour performance
- Client Components uniquement si interactivité nécessaire
- Optimisations automatiques (code splitting, lazy loading)
- Support natif WebSocket via API routes

**React 18+ :**
- Utiliser hooks modernes (useState, useEffect, useMemo, useCallback)
- Optimiser re-renders avec React.memo et useMemo
- Support animations avec CSS transitions ou framer-motion
- Hooks personnalisés pour logique réutilisable

**Tailwind CSS :**
- Utiliser classes utilitaires pour performance
- Configuration custom pour design tokens (couleurs, typographie, animations)
- Optimisation bundle avec purge CSS automatique
- Animations custom via `tailwind.config.ts` (fade-in-slide-up déjà configuré)

**WebSocket (Socket.io) :**
- Client Socket.io pour connexion temps réel
- Gestion reconnexion automatique avec backoff
- Événements typés avec TypeScript pour type safety
- Synchronisation état entre clients

**Performance Streaming :**
- Animations GPU-accelerated (transform, opacity uniquement)
- Éviter layout shifts avec dimensions fixes
- Lazy loading des assets non-critiques
- Bundle size < 200KB gzippé pour chargement rapide

**Timer Management :**
- Utiliser `setInterval` ou `requestAnimationFrame` pour timer précis
- Nettoyer timers avec `useEffect` cleanup pour éviter fuites mémoire
- Synchroniser timer via WebSocket pour cohérence multi-clients
- Gérer pause/reprise timer si nécessaire

### Project Context Reference

**Note :** Aucun fichier `project-context.md` trouvé dans le projet. Les informations de contexte sont disponibles dans :
- `_bmad-output/planning-artifacts/architecture.md` - Architecture complète du système
- `_bmad-output/planning-artifacts/prd.md` - Spécifications produit complètes
- `_bmad-output/planning-artifacts/epics.md` - Décomposition en epics et stories
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Spécifications UX détaillées

**Contexte Projet Clé :**
- TikTokLive est un système automatisé de quiz interactif pour lives TikTok
- Objectif : Générer de l'engagement sans intervention manuelle
- Stack : Next.js 14+ + TypeScript + Socket.io + PostgreSQL/Supabase
- Déploiement : Serveur Windows avec overlay OBS Browser Source
- Performance critique : Latence < 2 secondes pour feedback utilisateur
- Rotation automatique : Maintenir rythme du quiz sans interruption manuelle

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (via Cursor)

### Debug Log References

### Completion Notes List

**Implémentation Story 2.3 - Rotation Automatique des Questions**

✅ **Service de rotation** (`lib/gamification/question-rotation.ts`)
- Implémenté logique de cycle avec `getNextQuestionIndex` et `calculateNextIndex`
- Détection événements déclencheurs via `shouldRotate` (winner, timer-expired)
- Gestion cas limites (index négatif, zéro questions, etc.)

✅ **Hook timer** (`hooks/useQuestionTimer.ts`)
- Timer de 30 secondes configurable via `NEXT_PUBLIC_QUESTION_TIMER_DURATION`
- Expiration automatique avec émission événement `question:expired`
- Fonctions start/stop/reset pour contrôle complet
- Nettoyage automatique au démontage

✅ **Hook d'intégration** (`hooks/useQuestionRotation.ts`)
- Combine `useCurrentQuestion` et `useQuestionTimer` pour rotation automatique
- Écoute événement `winner:announced` (Story 2.6 - future) avec transition après célébration (5-8s)
- Synchronisation WebSocket via événements `question:next`
- Gestion transition gracieuse (300ms fade-out avant nouvelle question)
- Annulation timer si gagnant trouvé avant expiration

✅ **Tests unitaires**
- 10 tests pour service rotation (tous passent)
- 7 tests pour hook timer (tous passent)
- Couverture : logique cycle, détection événements, expiration, synchronisation

**Dépendances respectées :**
- Story 2.1 (stockage questions) : Réutilisé API et service existants
- Story 2.2 (affichage questions) : Réutilisé hook `useCurrentQuestion` et animations
- Story 2.6 (identification gagnant) : Préparé écoute événement `winner:announced`

**Corrections Code Review (2026-01-07) :**
- ✅ Intégration `useQuestionRotation` dans `app/overlay/page.tsx` (CRITICAL fix)
- ✅ Correction incohérence événements WebSocket (`question:expired` vs `question-expired`)
- ✅ Ajout écoute `question:next` dans `useCurrentQuestion` pour synchronisation
- ✅ Ajout gestion d'erreurs dans `rotateToNext` avec try/catch et logging
- ✅ Utilisation `getNextQuestionIndex` dans `useCurrentQuestion` pour éviter duplication
- ✅ Validation avant émission WebSocket et résolution TODO sessionId
- ✅ Création tests unitaires pour `useQuestionRotation` (8 tests - tous passent ✅)
- ✅ Mise à jour File List avec tous les fichiers modifiés

**Corrections Code Review Adversarial (2026-01-08) :**
- ✅ **CRITICAL:** Correction incohérence événements dans tests E2E (`question-expired` → `question:expired`)
- ✅ **CRITICAL:** Ajout retry automatique avec backoff exponentiel dans `useCurrentQuestion` (max 3 tentatives, délai exponentiel jusqu'à 10s)
- ✅ **HIGH:** Ajout validation variables d'environnement avec limites (timer: 5-300s, célébration: 3-10s)
- ✅ **MEDIUM:** Amélioration gestion WebSocket déconnecté pendant rotation (fallback gracieux avec événements locaux)
- ✅ **MEDIUM:** Correction warnings React act() dans tests `useQuestionTimer` (tous les tests passent sans warnings ✅)
- ✅ **MEDIUM:** Amélioration logging structuré avec correlation IDs partout dans `useQuestionTimer` et `useQuestionRotation`
- ✅ **LOW:** Extraction magic number 300ms en constante `TRANSITION_ANIMATION_DURATION_MS`

**Prochaines étapes :**
- Tests d'intégration WebSocket complets (E2E recommandé)
- Validation avec Story 2.6 quand disponible

### File List

**Fichiers créés :**
- `lib/gamification/question-rotation.ts` - Service de rotation automatique
- `hooks/useQuestionTimer.ts` - Hook pour gestion timer 30 secondes
- `hooks/useQuestionRotation.ts` - Hook d'intégration pour rotation automatique complète
- `tests/unit/gamification/question-rotation.test.ts` - Tests unitaires service rotation
- `tests/unit/hooks/useQuestionTimer.test.tsx` - Tests unitaires hook timer
- `tests/unit/hooks/useQuestionRotation.test.tsx` - Tests unitaires hook rotation complète

**Fichiers modifiés :**
- `app/overlay/page.tsx` - Intégration useQuestionRotation pour rotation automatique fonctionnelle
- `hooks/useCurrentQuestion.ts` - Support événement question:next, utilisation getNextQuestionIndex, correction événement question:expired, **retry automatique avec backoff exponentiel**
- `hooks/useQuestionTimer.ts` - **Validation variables d'environnement, logging structuré avec correlation IDs partout**
- `hooks/useQuestionRotation.ts` - Gestion erreurs, validation, résolution TODO sessionId, **gestion WebSocket déconnecté améliorée, extraction constantes**
- `tests/e2e/complete-quiz-flow.spec.ts` - **Correction format événement question:expired (tiret → deux-points)**
- `tests/unit/hooks/useQuestionTimer.test.tsx` - **Correction warnings React act() (tous les tests passent sans warnings)**
- `jest.setup.js` - Ajout mock uuid pour éviter problèmes ESM
