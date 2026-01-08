'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import QuestionDisplay from '../../components/overlay/QuestionDisplay';

// Lazy loading du composant Leaderboard (non critique au chargement)
const Leaderboard = lazy(() => import('../../components/overlay/Leaderboard'));

interface Question {
  id: string;
  text: string;
  timestamp: number;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

export default function OverlayPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Connexion WebSocket pour les événements temps réel
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Overlay WebSocket connected to:', wsUrl);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Overlay WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('Overlay WebSocket error:', error);
    };

    // Écouter les événements de questions et leaderboard
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'question:new':
            setCurrentQuestion(data.question);
            break;
          case 'score:updated':
            setLeaderboard(data.leaderboard || []);
            break;
          default:
            console.log('Unknown overlay event:', data.type);
        }
      } catch (error) {
        console.error('Error parsing overlay WebSocket message:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div
      data-testid="overlay-container"
      className="w-full h-full min-h-screen flex flex-col bg-black text-white overflow-hidden"
      style={{
        backgroundColor: '#000000', // Fond opaque pour OBS
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Conteneur pour les questions */}
      <div
        data-testid="question-container"
        className="flex-1 flex items-center justify-center p-6"
      >
        {currentQuestion ? (
          <QuestionDisplay question={currentQuestion} />
        ) : (
          <div className="text-center">
            <p className="text-xl opacity-70 animate-pulse">
              {isConnected ? 'En attente de questions...' : 'Connexion...'}
            </p>
          </div>
        )}
      </div>

      {/* Conteneur pour le leaderboard (lazy-loaded) */}
      <div
        data-testid="leaderboard-container"
        className="h-40 bg-gray-900/90 border-t border-gray-700 p-4 backdrop-blur-sm"
      >
        <Suspense fallback={
          <div className="text-center text-xs opacity-50 py-2">
            Chargement du classement...
          </div>
        }>
          <Leaderboard entries={leaderboard} />
        </Suspense>
      </div>
    </div>
  );
}