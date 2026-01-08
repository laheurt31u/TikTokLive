# Configuration de l'Environnement de Test

## Variables d'Environnement Requises

Créez un fichier `.env.test` à la racine du projet avec les variables suivantes :

```bash
# Configuration de l'environnement de test
TEST_ENV=local
BASE_URL=http://localhost:3000
API_URL=http://localhost:3001/api

# Authentification (si applicable)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=

# Flags de fonctionnalités (si applicable)
FEATURE_FLAG_NEW_UI=true

# Clés API (si applicable)
TEST_API_KEY=

# Configuration TikTok Live
TIKTOK_ROOM_ID=test_room
TIKTOK_SESSION_ID=

# Base de données (si applicable)
DATABASE_URL=postgresql://localhost:5432/tiktoklive_test
```

## Configuration de la Base de Données de Test

Pour les tests nécessitant une base de données :

1. Créez une base de données PostgreSQL dédiée aux tests
2. Exécutez les migrations de test
3. Configurez `DATABASE_URL` pour pointer vers cette base

## Démarrage de l'Application en Mode Test

```bash
# Terminal 1: Démarrer l'application
npm run dev

# Terminal 2: Exécuter les tests
npm run test:e2e
```