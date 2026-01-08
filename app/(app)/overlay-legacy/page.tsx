'use client';

import { useState, useEffect } from 'react';
import { QuestionDisplay } from '@/components/overlay/QuestionDisplay';
import { Leaderboard } from '@/components/overlay/Leaderboard';

interface Question {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
}

interface Winner {
  username: string;
  profileImage?: string;
  points: number;
}

export default function OverlayPage() {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Winner[]>([]);
  const [lastWinner, setLastWinner] = useState<Winner | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Simuler la connexion WebSocket pour le développement
  useEffect(() => {
    // Simulation de connexion
    setTimeout(() => setIsConnected(true), 1000);

    // Simulation d'une question
    const mockQuestion: Question = {
      id: 'q1',
      text: 'Quelle est la capitale de la France ?',
      difficulty: 'easy',
      timeLimit: 30
    };

    setTimeout(() => {
      setCurrentQuestion(mockQuestion);
      setTimeLeft(mockQuestion.timeLimit);
    }, 2000);

    // Simulation du leaderboard
    const mockLeaderboard: Winner[] = [
      { username: 'user1', points: 150 },
      { username: 'user2', points: 120 },
      { username: 'user3', points: 100 },
    ];
    setLeaderboard(mockLeaderboard);

    // Simulation d'un gagnant
    setTimeout(() => {
      const winner: Winner = {
        username: 'user1',
        points: 10,
        profileImage: 'https://via.placeholder.com/100'
      };
      setLastWinner(winner);
    }, 5000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Status de connexion */}
      <div className="absolute top-4 right-4 z-50">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
      </div>

      {/* Conteneur principal responsive */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-screen items-start">

          {/* Section principale - Question */}
          <div className="lg:col-span-2 space-y-8">
            <QuestionDisplay
              question={currentQuestion}
              timeLeft={timeLeft}
              winner={lastWinner}
            />
          </div>

          {/* Sidebar - Leaderboard */}
          <div className="lg:col-span-1">
            <Leaderboard entries={leaderboard} />
          </div>
        </div>
      </div>

      {/* Overlay pour les célébrations */}
      {lastWinner && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {/* Particules et effets ici */}
        </div>
      )}
    </div>
  );
}