# Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```env
# TikTok
TIKTOK_UNIQUE_ID=your_tiktok_username
TIKTOK_ROOM_ID=

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Upstash)
REDIS_URL=redis://default:password@host:port
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# OpenAI (pour n8n)
OPENAI_API_KEY=sk-...

# ElevenLabs (TTS optionnel)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Next.js
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000

# n8n Webhook
N8N_WEBHOOK_URL=http://localhost:5678/webhook/reload-questions

# App
NODE_ENV=development
PORT=3000
```

## Notes

- Les variables `NEXT_PUBLIC_*` sont exposées au client
- Ne commitez jamais le fichier `.env.local` (déjà dans `.gitignore`)
- Utilisez `.env.example` comme template pour l'équipe
