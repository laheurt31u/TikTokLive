# TikTokLive Test Suite

Suite de tests automatisés pour TikTokLive utilisant Playwright et Jest.

## Vue d'ensemble

Cette suite de tests couvre tous les aspects fonctionnels de TikTokLive :
- **Tests E2E** : Parcours utilisateur complets avec Playwright (connexion, quiz, messages)
- **Tests d'API** : Tests des endpoints backend et validation des paramètres
- **Tests de performance** : Tests de charge, performance et résilience API
- **Tests unitaires** : Tests des fonctions métier, configuration et métriques avec Jest

## Structure des tests

```
tests/
├── e2e/                          # Tests end-to-end
│   ├── tiktok-live-connection.spec.ts    # Tests de connexion complète
│   ├── tiktok-connection.spec.ts         # Tests de connexion de base
│   ├── performance-load.spec.ts          # Tests de performance API
│   └── [fichiers existants]
├── api/                          # Tests d'API
│   ├── tiktok-connector.api.spec.ts      # Tests du connecteur API
│   └── [fichiers existants]
├── component/                    # Tests de composants (à développer)
│   └── [fichiers à venir]
├── unit/                         # Tests unitaires
│   ├── config-validation.unit.spec.ts    # Tests de validation config
│   ├── correlation-manager.unit.spec.ts  # Tests du gestionnaire de corrélation
│   ├── metrics-correlation.unit.spec.ts  # Tests des métriques
│   └── circuit-breaker.unit.spec.ts       # Tests du circuit breaker
└── support/                      # Infrastructure de test
    ├── fixtures/                 # Fixtures de test (améliorées)
    │   ├── index.ts             # Fixtures principales + nouvelles
    │   └── [fichiers existants]
    ├── factories/               # Générateurs de données (étendus)
    │   ├── user-factory.ts      # Factory utilisateurs
    │   ├── tiktok-live-factory.ts # Factory données TikTok (améliorée)
    │   └── [fichiers existants]
    └── helpers/                 # Utilitaires de test (étendus)
        ├── wait-helpers.ts      # Helpers d'attente (améliorés)
        ├── assertion-helpers.ts # Helpers d'assertion
        └── [fichiers existants]
```

## Exécution des tests

### Tous les tests

```bash
npm run test:e2e          # Tests E2E uniquement
npm test                  # Tests unitaires uniquement
```

### Tests par priorité

```bash
npm run test:e2e:p0       # Tests critiques uniquement (P0)
npm run test:e2e:p1       # Tests P0 + P1 (prêt pour merge)
npm run test:e2e:p2       # Tests de performance et charge (P2)
```

### Tests par type

```bash
npm run test:api          # Tests d'API uniquement
npm test                  # Tests unitaires uniquement (Jest)
```

### Tests par navigateur

```bash
npm run test:e2e:chromium # Chrome uniquement
npm run test:e2e:firefox  # Firefox uniquement
npm run test:e2e:webkit   # Safari uniquement
```

### Mode debug/développement

```bash
npm run test:e2e:ui       # Interface Playwright pour debug
npm run test:e2e:debug    # Mode debug pas à pas
npm run test:e2e:headed   # Mode visible (non headless)
```

## Fixtures et factories

### Fixtures disponibles

```typescript
// Utilisateur authentifié avec nettoyage automatique
test('example', async ({ authenticatedUser }) => {
  // authenticatedUser est créé automatiquement
  // et nettoyé après le test
});

// Salle TikTok de test
test('example', async ({ tiktokRoom }) => {
  // Salle créée avec données de test
});

// Session de quiz complète
test('example', async ({ quizSession }) => {
  // Session avec questions, participants, etc.
});
```

### Factories de données

```typescript
import { UserFactory, TikTokLiveFactory } from '../support/factories';

// Créer un utilisateur de test
const user = UserFactory.createUser({
  name: 'Test User',
  email: 'test@example.com'
});

// Créer une salle TikTok
const room = await TikTokLiveFactory.createTestRoom({
  name: 'Test Room',
  viewerCount: 100
});

// Créer des messages de chat simulés
const messages = TikTokLiveFactory.createChatMessages(10);
```

## Helpers utilitaires

### Attentes personnalisées

```typescript
import { WaitHelpers } from '../support/helpers/wait-helpers';

// Attendre qu'un nombre de viewers soit atteint
await WaitHelpers.waitForViewerCount(page, 50);

// Attendre l'apparition d'une question
await WaitHelpers.waitForQuestion(page, 'Quelle est la capitale de la France?');

// Attendre une annonce de gagnant
await WaitHelpers.waitForWinnerAnnouncement(page, 'Alice');
```

### Assertions personnalisées

```typescript
import { AssertionHelpers } from '../support/helpers/assertion-helpers';

// Vérifier qu'un utilisateur est dans le leaderboard
await AssertionHelpers.expectUserInLeaderboard(page, 'Alice', 1);

// Vérifier qu'une question s'affiche correctement
await AssertionHelpers.expectQuestionDisplayed(page, 'Question?', ['A', 'B', 'C', 'D']);

// Vérifier l'annonce d'un gagnant
await AssertionHelpers.expectWinnerAnnouncement(page, 'Alice');
```

## Tests de performance et charge

### Nouveaux tests de performance (P2)

Les tests de performance valident la résilience et les performances de l'API sous charge :

- **Connexion API** : Tests de tentatives de connexion rapides et validation de paramètres
- **Performance du statut** : Tests de requêtes fréquentes sur l'endpoint de statut
- **Gestion d'erreurs** : Tests de JSON malformé, payloads volumineux, requêtes concurrentes
- **Cycle de vie des ressources** : Tests du cycle complet connexion/déconnexion
- **Temps de réponse** : Validation des limites de temps de réponse

### Exécution des tests de performance

```bash
# Tests de performance uniquement
npm run test:e2e:p2

# Avec rapport détaillé
npm run test:e2e:p2 -- --reporter=html
```

## Marquage des priorités

Tous les tests sont marqués par priorité dans leur nom :

- **[P0]** : Tests critiques (connexion, quiz winners, données utilisateur)
- **[P1]** : Tests importants (fonctionnalités core, gestion d'erreurs)
- **[P2]** : Tests moyens (performance, edge cases, résilience)
- **[P3]** : Tests faibles (nice-to-have, non critique)

```typescript
test('[P0] should login with valid credentials', async ({ page }) => {
  // Test critique
});

test('[P1] should display error for invalid credentials', async ({ page }) => {
  // Test important
});
```

## Environnements de test

### Configuration locale

1. Copiez le fichier d'exemple :
   ```bash
   cp tests/test-environment-setup.md .env.test
   ```

2. Configurez les variables :
   ```bash
   BASE_URL=http://localhost:3000
   TEST_USER_EMAIL=test@example.com
   # ... autres variables
   ```

3. Démarrez l'application :
   ```bash
   npm run dev
   ```

4. Exécutez les tests :
   ```bash
   npm run test:e2e
   ```

### CI/CD

Les tests sont configurés pour s'exécuter automatiquement dans GitHub Actions avec :
- Tests parallèles sur tous les navigateurs
- Retry automatique en cas d'échec
- Rapports de couverture
- Captures d'écran et vidéos en cas d'échec

## Bonnes pratiques

### Écriture de tests

1. **Un test = une assertion** : Chaque test ne vérifie qu'un seul comportement
2. **Given-When-Then** : Structure claire pour chaque test
3. **Data-testid** : Utilisez des sélecteurs de test stables
4. **Nettoyage automatique** : Utilisez les fixtures pour le nettoyage
5. **Pas de sleeps** : Utilisez des attentes explicites

### Exemple de test bien écrit

```typescript
test('[P0] should display winner when correct answer is given', async ({ quizSession }) => {
  // GIVEN: Quiz session is active with a question
  await page.goto(`/room/${quizSession.roomId}`);

  // WHEN: Correct answer is submitted via chat simulation
  await simulateChatMessage(quizSession.currentQuestion.answers[quizSession.currentQuestion.correctAnswer]);

  // THEN: Winner is announced and profile picture is displayed
  await AssertionHelpers.expectWinnerAnnouncement(page, 'Alice');
  await AssertionHelpers.expectWinnerProfilePicture(page, 'Alice');
});
```

### Debugging

1. **Mode UI** : `npm run test:e2e:ui` pour interface visuelle
2. **Traces** : Vérifiez `test-results/` pour captures et vidéos
3. **Console** : Utilisez `console.log()` dans les tests
4. **Pause** : Ajoutez `await page.pause()` pour debug

## Métriques et rapports

### Résultats de test

- **Rapports HTML** : `test-results/html/index.html`
- **Rapports JUnit** : `test-results/junit.xml`
- **Captures d'écran** : `test-results/screenshots/`
- **Vidéos** : `test-results/videos/`

### Métriques de qualité

- **Taux de réussite** : > 95% en moyenne
- **Temps d'exécution** : < 3 minutes pour la suite complète
- **Fiabilité** : < 5% de tests flaky
- **Couverture** : > 80% des fonctionnalités critiques

## Contribution

### Ajout de nouveaux tests

1. Choisissez le bon niveau (E2E/API/Component/Unit)
2. Utilisez les fixtures et factories appropriées
3. Suivez les bonnes pratiques de marquage
4. Ajoutez des assertions claires et explicites
5. Testez localement avant commit

### Maintenance

- **Review régulière** : Supprimez les tests obsolètes
- **Mise à jour** : Gardez les sélecteurs à jour
- **Performance** : Optimisez les temps d'attente
- **Fiabilité** : Corrigez rapidement les tests flaky

## Dépannage

### Tests qui échouent

1. Vérifiez les captures d'écran dans `test-results/`
2. Utilisez le mode debug : `npm run test:e2e:debug`
3. Vérifiez les logs de console de l'application
4. Validez que l'environnement de test est correctement configuré

### Problèmes courants

- **Sélecteurs cassés** : Utilisez data-testid au lieu de classes CSS
- **Conditions de course** : Ajoutez des attentes explicites
- **Données de test** : Utilisez les factories au lieu de données en dur
- **État partagé** : Chaque test doit être indépendant

---

*Documentation générée automatiquement - Dernière mise à jour : [Date]*