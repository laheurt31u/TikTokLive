# TikTokLive Test Suite

Suite de tests automatisés pour TikTokLive utilisant Playwright et Jest.

## Vue d'ensemble

Cette suite de tests couvre tous les aspects fonctionnels de TikTokLive :
- **Tests E2E** : Parcours utilisateur complets avec Playwright (connexion, quiz, messages)
- **Tests d'API** : Tests des endpoints backend et validation des paramètres
- **Tests de composants** : Tests des composants React overlay avec Playwright CT
- **Tests unitaires** : Tests des fonctions métier, configuration et métriques avec Jest

## Structure des tests

```
tests/
├── e2e/                          # Tests end-to-end
│   ├── complete-quiz-flow.spec.ts    # Parcours complet quiz (P0)
│   ├── websocket-sync.spec.ts        # Synchronisation WebSocket (P1)
│   ├── tiktok-connection.spec.ts     # Tests de connexion TikTok
│   ├── quiz-response-detection.spec.ts
│   └── reconnection-resilience.spec.ts
├── api/                          # Tests d'API
│   ├── questions.api.spec.ts         # Tests API questions
│   ├── tiktok.api.spec.ts            # Tests API TikTok (connect, status, disconnect) [P0-P1]
│   ├── points-leaderboard.api.spec.ts
│   └── user-management.api.spec.ts
├── component/                    # Tests de composants React
│   ├── QuestionDisplay.test.tsx      # Composant affichage question (P1)
│   ├── Leaderboard.test.tsx          # Composant leaderboard (P1)
│   └── TimePressure.test.tsx          # Composant pression temporelle (P1)
├── unit/                         # Tests unitaires
│   ├── overlay-utils.test.ts         # Utilitaires overlay (P2)
│   ├── gamification/
│   │   └── question-rotation.test.ts  # Service rotation questions (P1)
│   ├── logger/
│   │   └── correlation-manager.test.ts # Gestionnaire correlation IDs (P2)
│   └── overlay/
└── support/                      # Infrastructure de test
    ├── fixtures/                      # Fixtures Playwright
    │   ├── auth.fixture.ts
    │   └── websocket.fixture.ts
    ├── factories/                     # Factories de données
    │   ├── user.factory.ts
    │   ├── question.factory.ts
    │   ├── leaderboard.factory.ts
    │   └── comment.factory.ts
    └── helpers/                       # Fonctions utilitaires
        ├── assertions.ts
        └── wait-for.ts
```

## Exécution des tests

### Tests E2E (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run by priority
npm run test:e2e:p0  # Critical paths only (P0)
npm run test:e2e:p1  # P0 + P1 tests (core functionality)

# Run specific file
npm run test:e2e -- tests/e2e/complete-quiz-flow.spec.ts

# Run in headed mode (with browser)
npm run test:e2e -- --headed

# Debug specific test
npm run test:e2e -- tests/e2e/complete-quiz-flow.spec.ts --debug
```

### Tests de composants (Playwright CT)

```bash
# Run all component tests
npm run test:component

# Run specific component test
npm run test:component -- tests/component/QuestionDisplay.test.tsx
```

### Tests unitaires (Jest)

```bash
# Run all unit tests
npm run test:unit

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Tags de priorité

Les tests sont tagués avec des priorités pour permettre l'exécution sélective :

- **[P0]** : Critical paths, run every commit
  - Parcours utilisateur critiques
  - Fonctionnalités revenue-impacting
  - Tests de sécurité

- **[P1]** : High priority, run on PR to main
  - Fonctionnalités importantes avec impact utilisateur élevé
  - Points d'intégration entre systèmes
  - Gestion d'erreurs pour échecs communs

- **[P2]** : Medium priority, run nightly
  - Cas limites avec impact modéré
  - Variations de fonctionnalités moins critiques
  - Tests de performance/charge

- **[P3]** : Low priority, run on-demand
  - Validations nice-to-have
  - Fonctionnalités rarement utilisées
  - Scénarios de test exploratoires

## Utilisation des fixtures

### Fixture authenticatedUser

```typescript
import { test } from '../support/fixtures/auth.fixture';

test('example with authenticated user', async ({ authenticatedUser, page }) => {
  // authenticatedUser est automatiquement créé et nettoyé
  await page.goto('/dashboard');
  await expect(page.getByText(authenticatedUser.name)).toBeVisible();
});
```

### Fixture mockWebSocket

```typescript
import { test } from '../support/fixtures/websocket.fixture';

test('example with WebSocket mock', async ({ mockWebSocket, page }) => {
  await page.goto('/overlay');
  await mockWebSocket.emit('question:new', { question: {...} });
  // WebSocket est automatiquement déconnecté après le test
});
```

## Utilisation des factories

### Factory createQuestion

```typescript
import { createQuestion, createEasyQuestion } from '../support/factories/question.factory';

const question = createQuestion({ text: 'Custom question?' });
const easyQuestion = createEasyQuestion();
```

### Factory createLeaderboardEntry

```typescript
import { createTop10, createLeaderboardEntry } from '../support/factories/leaderboard.factory';

const top10 = createTop10();
const entry = createLeaderboardEntry({ rank: 1, points: 5000 });
```

## Patterns de test

### Network-First Pattern

Toujours intercepter les routes AVANT la navigation pour éviter les race conditions :

```typescript
// ✅ CORRECT: Intercepter AVANT navigation
const responsePromise = page.waitForResponse('**/api/questions');
await page.goto('/overlay');
await responsePromise;

// ❌ WRONG: Intercepter APRÈS navigation (race condition)
await page.goto('/overlay');
await page.waitForResponse('**/api/questions');
```

### Given-When-Then Format

Tous les tests suivent le format Given-When-Then :

```typescript
test('[P0] should complete quiz flow', async ({ page }) => {
  // GIVEN: Setup initial
  await page.goto('/');

  // WHEN: Action utilisateur
  await page.click('[data-testid="connect-button"]');

  // THEN: Assertions
  await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
});
```

### Self-Cleaning Tests

Tous les tests utilisent des fixtures avec auto-cleanup :

```typescript
// ✅ CORRECT: Fixture avec auto-cleanup
test('example', async ({ authenticatedUser }) => {
  // authenticatedUser est automatiquement supprimé après le test
});

// ❌ WRONG: Cleanup manuel (peut être oublié)
test('example', async ({ page }) => {
  const user = await createUser();
  // ... test logic ...
  // Oubli de cleanup !
});
```

## Anti-patterns à éviter

- ❌ **Hard waits** : `await page.waitForTimeout(2000)` → Utiliser `waitForResponse()` ou `waitForSelector()`
- ❌ **Conditional flow** : `if (await element.isVisible())` → Tests doivent être déterministes
- ❌ **Try-catch pour logique de test** : Utiliser seulement pour cleanup
- ❌ **Données hardcodées** : Utiliser factories avec faker
- ❌ **Page objects** : Garder les tests simples et directs
- ❌ **État partagé entre tests** : Chaque test doit être isolé

## Qualité des tests

Tous les tests doivent respecter :

- ✅ Format Given-When-Then avec commentaires clairs
- ✅ Tags de priorité dans le nom du test ([P0], [P1], [P2], [P3])
- ✅ Selectors data-testid pour stabilité (E2E)
- ✅ Auto-cleanup via fixtures
- ✅ Pas de hard waits ou patterns flaky
- ✅ Fichiers de tests < 300 lignes
- ✅ Tests < 1.5 minutes d'exécution
- ✅ Assertions explicites dans le corps du test

## Intégration CI/CD

Les tests sont configurés pour s'exécuter dans le pipeline CI :

```yaml
# Exemple GitHub Actions
- name: Run P0 tests
  run: npm run test:e2e:p0

- name: Run component tests
  run: npm run test:component

- name: Run unit tests
  run: npm run test:unit
```

## Prochaines étapes

1. **Révision des tests générés** avec l'équipe
2. **Exécution des tests dans le pipeline CI**
3. **Monitoring des tests flaky** dans une boucle de burn-in
4. **Intégration avec quality gate** : `bmad tea *gate`
5. **Expansion future** : Tests pour nouveaux endpoints API si ajoutés

---

**Généré par :** TEA Agent (Test Engineering Architect)
**Workflow :** `testarch-automate`
**Date :** 2026-01-07
