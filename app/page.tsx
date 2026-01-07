'use client';

import { useEffect, useState } from 'react';
import { Question } from '@/components/Question';
import { Answers } from '@/components/Answers';
import { Leaderboard } from '@/components/Leaderboard';
import { Timer } from '@/components/Timer';
import { useMockQuizData } from '@/hooks/useWebSocket';
import type { Question as QuestionType, Score, PartialAnswer } from '@/types/quiz';

export default function OverlayPage() {
  const ws = useMockQuizData();

  const [currentQuestion, setCurrentQuestion] = useState<QuestionType | null>(null);
  const [leaderboard, setLeaderboard] = useState<Score[]>([]);
  const [partialAnswers, setPartialAnswers] = useState<PartialAnswer[]>([]);
  const [winner, setWinner] = useState<{ username: string; userId: string } | undefined>();
  const [timerDuration, setTimerDuration] = useState(60);
  const [particles, setParticles] = useState<Array<{ left: number; top: number; color: string; duration: number; delay: number }>>([]);
  const [isQuestionVisible, setIsQuestionVisible] = useState(true);

  useEffect(() => {
    // Définir les handlers
    const handleQuestionNew = (question: QuestionType) => {
      setCurrentQuestion(question);
      setPartialAnswers([]);
      setWinner(undefined);
      setIsQuestionVisible(true);
    };

    const handleLeaderboardUpdate = (scores: Score[]) => {
      setLeaderboard(scores);
    };

    const handleAnswerUpdate = (answer: PartialAnswer) => {
      setPartialAnswers((prev) => [...prev, answer]);
    };

    const handleAnswerCorrect = (data: { userId: string; username: string; points: number }) => {
      setWinner({ username: data.username, userId: data.userId });
    };

    const handleTimerStart = (duration: number) => {
      setTimerDuration(duration);
    };

    // Écouter les événements WebSocket
    ws.on('question:new', handleQuestionNew);
    ws.on('leaderboard:update', handleLeaderboardUpdate);
    ws.on('answer:update', handleAnswerUpdate);
    ws.on('answer:correct', handleAnswerCorrect);
    ws.on('timer:start', handleTimerStart);

    return () => {
      ws.off('question:new', handleQuestionNew);
      ws.off('leaderboard:update', handleLeaderboardUpdate);
      ws.off('answer:update', handleAnswerUpdate);
      ws.off('answer:correct', handleAnswerCorrect);
      ws.off('timer:start', handleTimerStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Générer les particules côté client uniquement
  useEffect(() => {
    const colors = ['var(--neon-cyan)', 'var(--neon-magenta)', 'var(--neon-yellow)'];
    const newParticles = [...Array(15)].map((_, i) => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      color: colors[i % 3],
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div
      className="relative bg-dark-void overflow-hidden flex items-center justify-center min-h-screen"
      style={{
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Container fixe 1080x1920 */}
      <div
        className="relative bg-dark-void overflow-hidden"
        style={{
          width: '1080px',
          height: '1920px',
        }}
      >
        {/* Grille de fond cyberpunk */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(var(--neon-cyan) 1px, transparent 1px),
              linear-gradient(90deg, var(--neon-cyan) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at top, rgba(0, 255, 249, 0.05), transparent 50%),
              radial-gradient(ellipse at bottom, rgba(255, 0, 255, 0.05), transparent 50%)
            `,
          }}
        />

        {/* Lignes de scan animées */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-30"
          style={{
            background: 'var(--neon-cyan)',
            boxShadow: '0 0 10px var(--neon-cyan)',
            animation: 'scan-vertical 8s ease-in-out infinite',
          }}
        />

        {/* Contenu principal - Layout vertical */}
        <div className="relative z-10 h-full flex flex-col px-12 py-10">
          {/* Header avec logo/titre */}
        
          {/* Question principale - hauteur fixe */}
          <section className="mb-6" style={{ minHeight: '280px' }}>
            <div style={{ opacity: isQuestionVisible ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <Question question={currentQuestion} />
            </div>
          </section>

          {/* Timer - hauteur fixe */}
          <section className="mb-6" style={{ minHeight: '80px' }}>
            <Timer
              duration={timerDuration}
              onComplete={() => setIsQuestionVisible(false)}
            />
          </section>

          {/* Réponses - format vertical */}
          <section className="flex-1 min-h-0">
            <Answers
              correctAnswer={currentQuestion?.reponses.find((r) => r.correcte)?.texte || ''}
              partialAnswers={partialAnswers}
              winner={winner}
            />
          </section>

          {/* Leaderboard - sera affiché entre les questions */}
          {/* <section className="flex-1 min-h-0">
            <Leaderboard scores={leaderboard} className="h-full" />
          </section> */}

          {/* Footer */}
          <footer className="mt-6 pt-4 border-t border-dark-border">
            <div className="flex items-center justify-between text-sm font-mono uppercase opacity-50">
              <div>Répondez dans le chat TikTok</div>
              <div className="flex items-center gap-2">
                <span>Powered by</span>
                <span
                  className="font-display font-bold"
                  style={{ color: 'var(--neon-cyan)', textShadow: 'var(--glow-cyan)' }}
                >
                  Claude AI
                </span>
              </div>
            </div>
          </footer>
        </div>

        {/* Effet de vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.5)',
          }}
        />

        {/* Particules décoratives flottantes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                background: particle.color,
                boxShadow: `0 0 5px currentColor`,
                animation: `float-particle ${particle.duration}s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
                opacity: 0.3,
              }}
            />
          ))}
        </div>

        <style jsx>{`
          @keyframes scan-vertical {
            0%, 100% {
              transform: translateY(0);
              opacity: 0;
            }
            10%, 90% {
              opacity: 0.3;
            }
            50% {
              transform: translateY(1920px);
              opacity: 0.5;
            }
          }

          @keyframes float-particle {
            0%, 100% {
              transform: translate(0, 0);
            }
            25% {
              transform: translate(20px, -30px);
            }
            50% {
              transform: translate(-15px, -60px);
            }
            75% {
              transform: translate(10px, -30px);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
