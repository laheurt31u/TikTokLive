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

export interface PartialAnswer {
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
}

export interface WebSocketEvents {
  'question:new': (question: Question) => void;
  'answer:update': (data: PartialAnswer) => void;
  'answer:correct': (data: { userId: string; username: string; points: number }) => void;
  'leaderboard:update': (scores: Score[]) => void;
  'timer:start': (duration: number) => void;
  'timer:tick': (remaining: number) => void;
  'timer:end': () => void;
}
