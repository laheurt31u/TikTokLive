# Structure de Code Détaillée

## Backend Services

### `backend/services/tiktok/TikTokService.ts`
```typescript
import { TikTokLive } from 'tiktok-live-connector';

class TikTokService {
  private client: TikTokLive;
  private isConnected: boolean = false;
  
  connect(uniqueId: string): Promise<void>;
  disconnect(): void;
  onComment(callback: (comment: Comment) => void): void;
  reconnect(): Promise<void>;
}
```

### `backend/services/quiz/QuizService.ts`
```typescript
class QuizService {
  parseAnswer(text: string, correctAnswer: string): boolean;
  maskAnswer(answer: string): string; // "République" → "R_publ_c"
  isFirstCorrect(userId: string, questionId: string): boolean;
  awardPoints(userId: string, username: string, points: number): Promise<void>;
  getCurrentQuestion(): Promise<Question | null>;
  getLeaderboard(limit: number): Promise<Score[]>;
}
```

### `backend/services/tts/TTSService.ts`
```typescript
class TTSService {
  // Option 1: Web Speech API (browser)
  speakBrowser(text: string): Promise<void>;
  
  // Option 2: ElevenLabs API
  speakElevenLabs(text: string): Promise<Buffer>;
  
  speakQuestion(question: Question): Promise<void>;
  speakHint(hint: string, delay: number): Promise<void>;
}
```

### `backend/services/database/DatabaseService.ts`
```typescript
class DatabaseService {
  getActiveQuestions(): Promise<Question[]>;
  getQuestionById(id: string): Promise<Question | null>;
  expireQuestions(): Promise<void>;
  createScore(score: Score): Promise<void>;
  updateScore(userId: string, points: number): Promise<void>;
  getTopScores(limit: number): Promise<Score[]>;
  resetDailyScores(): Promise<void>;
}
```

## API Routes (Next.js App Router)

### `backend/api/questions/active/route.ts`
```typescript
export async function GET() {
  // Récupère question active (non expirée)
  // Cache Redis si disponible
}
```

### `backend/api/questions/[id]/route.ts`
```typescript
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Détails d'une question spécifique
}
```

### `backend/api/scores/leaderboard/route.ts`
```typescript
export async function GET() {
  // Top scores depuis Redis ou DB
  // Format: { scores: Score[], updated_at: Date }
}
```

### `backend/api/websocket/route.ts`
```typescript
// Socket.io server setup
// Événements: question:new, answer:update, answer:correct, leaderboard:update
```

## Frontend Components

### `frontend/components/Question.tsx`
```typescript
interface QuestionProps {
  question: Question;
  onComplete?: () => void;
}

export function Question({ question, onComplete }: QuestionProps) {
  // Affichage grande question
  // Animation apparition
}
```

### `frontend/components/Answers.tsx`
```typescript
interface AnswersProps {
  correctAnswer: string;
  partialAnswers: Array<{ userId: string; username: string; text: string }>;
}

export function Answers({ correctAnswer, partialAnswers }: AnswersProps) {
  // Affichage progressif "_" révélés
  // Animation révélation lettres
}
```

### `frontend/components/Leaderboard.tsx`
```typescript
interface LeaderboardProps {
  scores: Score[];
  currentUserId?: string;
}

export function Leaderboard({ scores, currentUserId }: LeaderboardProps) {
  // Top 10 avec animations
  // Highlight user actif
}
```

### `frontend/components/Timer.tsx`
```typescript
interface TimerProps {
  duration: number; // secondes
  onComplete: () => void;
}

export function Timer({ duration, onComplete }: TimerProps) {
  // Countdown visuel
  // Barre progression
}
```

### `frontend/hooks/useWebSocket.ts`
```typescript
export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Connexion auto
  // Reconnexion si déconnecté
  // Écoute événements
  // Return { socket, isConnected, emit, on }
}
```

### `frontend/pages/overlay.tsx`
```typescript
export default function OverlayPage() {
  const { socket, isConnected } = useWebSocket(WS_URL);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [partialAnswers, setPartialAnswers] = useState([]);
  const [leaderboard, setLeaderboard] = useState<Score[]>([]);
  
  // Écoute WebSocket events
  // Update state
  // Affichage composants
  
  return (
    <div className="overlay-container">
      <Question question={currentQuestion} />
      <Answers correctAnswer={...} partialAnswers={partialAnswers} />
      <Leaderboard scores={leaderboard} />
      <Timer duration={60} />
    </div>
  );
}
```

## Types TypeScript

### `backend/types/quiz.ts`
```typescript
export interface Question {
  id: string;
  question: string;
  reponses: Answer[];
  indices: string[];
  theme: string;
  difficulte: 'facile' | 'moyen' | 'difficile';
  created_at: Date;
  expires_at: Date;
  active: boolean;
}

export interface Answer {
  texte: string;
  correcte: boolean;
}

export interface Score {
  user_id: string;
  username: string;
  points: number;
  last_answer_at: Date;
}

export interface Comment {
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
}
```

## Database Schema (PostgreSQL)

### `scripts/setup-db.sql`
```sql
-- Table questions
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  reponses JSONB NOT NULL, -- [{texte, correcte}]
  indices TEXT[] NOT NULL,
  theme VARCHAR(100),
  difficulte VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  active BOOLEAN DEFAULT true
);

-- Table scores
CREATE TABLE scores (
  user_id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  points INTEGER DEFAULT 0,
  last_answer_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_questions_active ON questions(active, expires_at);
CREATE INDEX idx_scores_points ON scores(points DESC);
```

## n8n Workflow

### `n8n/generate-questions.json`
```json
{
  "nodes": [
    {
      "name": "Cron Daily",
      "type": "n8n-nodes-base.cron",
      "parameters": { "rule": "0 0 * * *" }
    },
    {
      "name": "OpenAI Generate",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "operation": "complete",
        "prompt": "Génère 20 questions quiz difficiles..."
      }
    },
    {
      "name": "Parse JSON",
      "type": "n8n-nodes-base.code"
    },
    {
      "name": "Insert Supabase",
      "type": "n8n-nodes-base.postgres",
      "parameters": { "operation": "insert" }
    },
    {
      "name": "Webhook Backend",
      "type": "n8n-nodes-base.httpRequest"
    }
  ]
}
```

## Utilitaires

### `backend/lib/redis.ts`
```typescript
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Helpers
export async function getLeaderboard(): Promise<Score[]>;
export async function updateScore(userId: string, points: number): Promise<void>;
export async function resetLeaderboard(): Promise<void>;
```

### `backend/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

## Configuration

### `package.json` (extrait)
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "tiktok-live-connector": "^0.9.0",
    "socket.io": "^4.5.0",
    "socket.io-client": "^4.5.0",
    "@supabase/supabase-js": "^2.38.0",
    "@upstash/redis": "^1.22.0",
    "zod": "^3.22.0"
  }
}
```

## Flux d'Exécution Principal

### Backend Main Loop
```typescript
// backend/app/api/quiz/start/route.ts
async function startQuiz() {
  // 1. Connecter TikTok
  await tiktokService.connect(UNIQUE_ID);
  
  // 2. Charger question active
  const question = await quizService.getCurrentQuestion();
  
  // 3. Émettre question via WebSocket
  io.emit('question:new', question);
  
  // 4. Lire question TTS
  await ttsService.speakQuestion(question);
  
  // 5. Écouter commentaires TikTok
  tiktokService.onComment(async (comment) => {
    const isCorrect = quizService.parseAnswer(comment.text, correctAnswer);
    
    if (isCorrect && quizService.isFirstCorrect(comment.userId, question.id)) {
      await quizService.awardPoints(comment.userId, comment.username, 1);
      io.emit('answer:correct', { userId: comment.userId, username: comment.username });
      io.emit('leaderboard:update', await quizService.getLeaderboard(10));
    } else {
      const masked = quizService.maskAnswer(comment.text);
      io.emit('answer:update', { userId: comment.userId, text: masked });
    }
  });
}
```

Cette structure permet une séparation claire des responsabilités et une maintenance facilitée.
