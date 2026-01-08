'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuestionRotation } from '@/hooks/useQuestionRotation';
import { QuestionDisplay } from '@/components/overlay/QuestionDisplay';
import { Leaderboard } from '@/components/overlay/Leaderboard';
import { TimePressure } from '@/components/overlay/TimePressure';

export default function OverlayPage() {
  const [mounted, setMounted] = useState(false);
  
  // Utiliser le hook de rotation automatique (Story 2.3)
  const {
    currentQuestion,
    isLoading,
    error,
    timeRemaining,
    isExpired,
    isTransitioning
  } = useQuestionRotation();

  // Leaderboard temporaire (sera remplacé par Story 4.2)
  const [leaderboard] = useState([
    { rank: 1, username: 'GamerPro123', points: 2500, avatar: '', isNew: true },
    { rank: 2, username: 'QuizMaster', points: 1800, avatar: '', isNew: false },
    { rank: 3, username: 'Brainiac_', points: 1200, avatar: '', isNew: false },
    { rank: 4, username: 'ProPlayer', points: 950, avatar: '', isNew: false },
    { rank: 5, username: 'NoobSlayer', points: 720, avatar: '', isNew: true }
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalTime = parseInt(process.env.NEXT_PUBLIC_QUESTION_TIMER_DURATION || '30', 10);
  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
  const isUrgent = timeRemaining < 10;

  return (
    <div className="relative min-h-screen bg-transparent text-white p-4 overflow-hidden scanlines grain">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 w-96 h-96 bg-neon-magenta/10 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 right-1/2 w-80 h-80 bg-neon-cyan/10 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-sm mx-auto h-full flex flex-col justify-between py-6 gap-6">

        {/* === QUESTION CARD === */}
        <div className="flex-1 flex items-center justify-center">
          <QuestionDisplay 
            question={currentQuestion} 
            isLoading={isLoading || isTransitioning}
          />
          
          {/* Timer overlay */}
          {currentQuestion && !isLoading && (
            <div className="absolute top-4 right-4 z-10">
              <TimePressure 
                timeLeft={timeRemaining}
                totalTime={totalTime}
                intensity={isUrgent ? 'high' : timeRemaining < 20 ? 'medium' : 'low'}
              />
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="absolute top-4 left-4 z-20 bg-red-900/90 border-2 border-red-500 rounded p-3 backdrop-blur-sm">
              <p className="text-sm text-white font-bold">Erreur: {error.message}</p>
            </div>
          )}
        </div>

        {/* === LEADERBOARD === */}
        <Suspense fallback={
          <div className="text-center text-xs opacity-50 py-2">
            Chargement du classement...
          </div>
        }>
          <Leaderboard entries={leaderboard} />
        </Suspense>

        {/* === BRANDING BADGE === */}
        <div
          className={`text-center ${mounted ? 'animate-[zoom-bounce_0.5s_ease-out]' : 'opacity-0'}`}
          style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
        >
          <div className="inline-block px-4 py-2 border-2 border-white/20 bg-black/80 backdrop-blur-sm">
            <div className="font-condensed text-[10px] text-white/40 uppercase tracking-[0.2em]">
              ⚡ Powered by TikTokLive Quiz
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}