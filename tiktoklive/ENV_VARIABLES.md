# Variables d'Environnement TikTokLive

## Variables Obligatoires

### Credentials TikTok
```bash
TIKTOK_SESSION_ID=your_session_id_here
TIKTOK_COOKIES=sessionid=abc123; user_id=12345
```

### Configuration Circuit Breaker
```bash
CIRCUIT_BREAKER_TIMEOUT=30000  # Timeout en millisecondes (30 secondes par défaut)
```

## Variables Optionnelles

### Logging
```bash
LOG_LEVEL=debug  # Valeurs possibles: debug, info, warn, error
```

### Reconnexion Automatique
```bash
RECONNECTION_MAX_ATTEMPTS=10        # Nombre maximum de tentatives de reconnexion
RECONNECTION_BASE_DELAY=5000        # Délai de base en millisecondes (5 secondes)
RECONNECTION_MAX_DELAY=300000       # Délai maximum en millisecondes (5 minutes)
RECONNECTION_BACKOFF_MULTIPLIER=2   # Multiplicateur pour le backoff exponentiel
```

### Base de Données (pour versions futures)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/tiktoklive
```

### Redis (pour versions futures)
```bash
REDIS_URL=redis://localhost:6379
```

## Configuration

1. Copiez les variables nécessaires dans votre fichier `.env.local`
2. Remplissez les valeurs appropriées pour votre environnement
3. Les variables `TIKTOK_SESSION_ID` et `TIKTOK_COOKIES` peuvent aussi être passées directement via l'API

## Sécurité

- Ne commitez jamais de vraies credentials dans le code
- Utilisez des valeurs différentes pour développement/production
- Les credentials sont sensibles - stockez-les de manière sécurisée