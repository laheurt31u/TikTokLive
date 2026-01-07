# Architecture TikTok Live Quiz

## Vue d'ensemble

Système de quiz interactif en direct sur TikTok avec génération automatique de questions via IA, gestion temps réel des réponses, et leaderboard.

## Architecture Technique

```
┌─────────────────┐
│   n8n Workflow  │  Génération quotidienne questions (00:00)
│   (Cron + IA)   │  → Stockage PostgreSQL/Supabase
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL/   │  Base de données questions + scores
│   Supabase      │  Expiration auto après 24h
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend Node.js│  TikTok-Live-Connector
│  (Next.js API)  │  → Écoute chat TikTok
│                 │  → TTS questions
│                 │  → Parsing réponses
│                 │  → Attribution points
└────────┬────────┘
         │
         ├──────────────┐
         ▼              ▼
┌─────────────┐  ┌──────────────┐
│  WebSocket  │  │  Redis Cache │
│  (Socket.io)│  │  Leaderboard │
└─────────────┘  └──────────────┘
         │
         ▼
┌─────────────────┐
│  Interface Web  │  OBS Browser Source
│  (Next.js UI)   │  → Affichage question
│                 │  → Réponses progressives
│                 │  → Scores live
└─────────────────┘
```

## Structure du Projet

```
TikTokLive/
├── backend/                 # Backend Node.js/Next.js
│   ├── api/                # Routes API Next.js
│   │   ├── questions/      # CRUD questions
│   │   ├── scores/         # Leaderboard
│   │   └── websocket/       # Socket.io endpoint
│   ├── services/
│   │   ├── tiktok/         # TikTok-Live-Connector
│   │   ├── tts/            # Text-to-Speech
│   │   ├── quiz/           # Logique quiz
│   │   └── database/       # DB client
│   ├── lib/
│   │   ├── redis.ts        # Redis client
│   │   └── supabase.ts     # Supabase client
│   └── types/              # TypeScript types
│
├── frontend/               # Interface OBS overlay
│   ├── components/
│   │   ├── Question.tsx    # Affichage question
│   │   ├── Answers.tsx     # Réponses progressives
│   │   ├── Leaderboard.tsx # Top scores
│   │   └── Timer.tsx       # Timer réponse
│   ├── hooks/
│   │   └── useWebSocket.ts # Socket.io client
│   └── pages/
│       └── overlay.tsx     # Page OBS
│
├── n8n/                    # Workflows n8n
│   └── generate-questions.json
│
├── scripts/                # Scripts utilitaires
│   ├── setup-db.sql        # Schema PostgreSQL
│   └── seed.ts             # Données test
│
└── docs/                   # Documentation
    ├── SETUP.md
    └── DEPLOYMENT.md
```

## Stack Technologique

### Backend
- **Framework**: Next.js 14+ (App Router)
- **Runtime**: Node.js 18+
- **TikTok**: `tiktok-live-connector` (npm)
- **WebSocket**: Socket.io
- **TTS**: Web Speech API (browser) ou ElevenLabs API
- **Cache**: Redis (Upstash ou self-hosted)
- **DB**: PostgreSQL via Supabase

### Frontend
- **Framework**: Next.js (même projet)
- **Styling**: Tailwind CSS
- **WebSocket**: Socket.io-client
- **Animations**: Framer Motion (optionnel)

### Infrastructure
- **n8n**: Self-hosted (Docker) ou cloud
- **Déploiement**: Vercel (backend/frontend)
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis (gratuit tier)

## Flux de Données

### 1. Génération Questions (n8n)
```
Cron (00:00) 
  → OpenAI API (GPT-4o)
  → Validation format JSON
  → Insert PostgreSQL
  → Webhook backend (reload questions)
```

### 2. Live Quiz Flow
```
TikTok Live Start
  → Backend connect TikTok
  → Charge questions actives (DB)
  → WebSocket broadcast question
  → Frontend affiche question
  → TTS lit question
  
Chat TikTok
  → Backend parse commentaires
  → Match réponse (exact/partial)
  → Premier correct → +1 point
  → WebSocket update leaderboard
  → Frontend update UI
```

### 3. Expiration Questions
```
Cron (00:10) ou TTL DB
  → Marque questions expirées
  → Reset leaderboard
  → Génère nouvelles questions
```

## Modèles de Données

### Question
```typescript
interface Question {
  id: string;
  question: string;
  reponses: Array<{
    texte: string;
    correcte: boolean;
  }>;
  indices: string[];
  theme: string;
  difficulte: 'facile' | 'moyen' | 'difficile';
  created_at: Date;
  expires_at: Date;
  active: boolean;
}
```

### Score
```typescript
interface Score {
  user_id: string;
  username: string;
  points: number;
  last_answer_at: Date;
}
```

### Leaderboard
```typescript
interface Leaderboard {
  scores: Score[];
  current_question_id: string;
  question_started_at: Date;
}
```

## Sécurité & Performance

- **Rate Limiting**: Limite réponses par user (1 par question)
- **Validation**: Sanitize inputs TikTok
- **Reconnexion**: Auto-reconnect TikTok WS
- **Cache**: Redis pour leaderboard (fast reads)
- **TTL**: Questions expirent automatiquement

## Étapes d'Implémentation

Voir `PLAN.md` pour le détail des étapes.
