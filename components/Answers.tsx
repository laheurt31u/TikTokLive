'use client';

import { useEffect, useState } from 'react';
import type { PartialAnswer } from '@/types/quiz';

interface AnswersProps {
  correctAnswer: string;
  partialAnswers: PartialAnswer[];
  winner?: { username: string; userId: string };
  className?: string;
}

export function Answers({
  correctAnswer,
  partialAnswers,
  winner,
  className = '',
}: AnswersProps) {
  const [revealedAnswer, setRevealedAnswer] = useState<string>('');
  const [showWinner, setShowWinner] = useState(false);

  useEffect(() => {
    if (winner) {
      setShowWinner(true);
      // Révéler progressivement la réponse complète
      const letters = correctAnswer.split('');
      let currentIndex = 0;

      const revealInterval = setInterval(() => {
        if (currentIndex < letters.length) {
          setRevealedAnswer(letters.slice(0, currentIndex + 1).join(''));
          currentIndex++;
        } else {
          clearInterval(revealInterval);
        }
      }, 100);

      return () => clearInterval(revealInterval);
    }
  }, [winner, correctAnswer]);

  return (
    <div className={`${className}`}>
      {/* Titre */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-1 bg-neon-yellow" style={{ boxShadow: 'var(--glow-yellow)' }} />
        <h3 className="text-2xl font-display font-bold uppercase tracking-wider"
          style={{ color: 'var(--neon-yellow)', textShadow: 'var(--glow-yellow)' }}
        >
          Réponses en cours
        </h3>
      </div>

      {/* Réponse gagnante */}
      {showWinner && winner && (
        <div
          className="relative mb-6 p-6 rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 0, 0.1), rgba(0, 255, 249, 0.1))',
            border: '2px solid var(--neon-green)',
            boxShadow: 'var(--glow-green), inset var(--glow-green)',
            animation: 'winner-pulse 1s ease-in-out 3',
          }}
        >
          {/* Confetti effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute h-2 w-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10px',
                  background: ['var(--neon-cyan)', 'var(--neon-magenta)', 'var(--neon-yellow)', 'var(--neon-green)'][i % 4],
                  animation: `confetti ${2 + Math.random() * 2}s ease-out forwards`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  boxShadow: '0 0 5px currentColor',
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            <div className="text-base font-mono uppercase tracking-wider opacity-70 mb-2">
              🏆 Gagnant
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-display font-bold"
                style={{ color: 'var(--neon-green)', textShadow: 'var(--glow-green)' }}
              >
                {winner.username}
              </span>
              <div className="text-4xl font-display font-black"
                style={{ color: 'var(--neon-green)', textShadow: 'var(--glow-green)' }}
              >
                {revealedAnswer.split('').map((letter, index) => (
                  <span
                    key={index}
                    className="inline-block"
                    style={{
                      animation: `reveal-letter 0.3s ease-out ${index * 0.1}s backwards`,
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Réponses partielles */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {partialAnswers.slice(0, 6).map((answer, index) => (
          <div
            key={`${answer.userId}-${index}`}
            className="flex items-center justify-between p-5 bg-dark-elevated rounded-lg border border-dark-border"
            style={{
              animation: `slide-up 0.3s ease-out ${index * 0.05}s backwards`,
            }}
          >
            <div className="flex items-center gap-4 flex-1">
              {/* Avatar */}
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center font-display font-bold text-xl border-2"
                style={{
                  borderColor: 'var(--neon-cyan)',
                  background: 'var(--dark-void)',
                  color: 'var(--neon-cyan)',
                  boxShadow: '0 0 10px rgba(0, 255, 249, 0.3)',
                }}
              >
                {answer.username.charAt(0).toUpperCase()}
              </div>

              {/* Username */}
              <span className="text-xl font-mono">
                {answer.username}
              </span>
            </div>

            {/* Réponse partielle */}
            <div className="text-2xl font-display font-bold tracking-wider"
              style={{ color: 'var(--neon-yellow)', textShadow: 'var(--glow-yellow)' }}
            >
              {answer.text.split('').map((char, charIndex) => (
                <span
                  key={charIndex}
                  className="inline-block"
                  style={{
                    animation: char === '_' ? 'blink 1s ease-in-out infinite' : 'none',
                    animationDelay: `${charIndex * 0.1}s`,
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Message si aucune réponse */}
      {!showWinner && partialAnswers.length === 0 && (
        <div className="text-center py-8 text-sm font-mono opacity-50">
          En attente des premières réponses...
        </div>
      )}

      <style jsx>{`
        @keyframes winner-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: var(--glow-green), inset var(--glow-green);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.8), inset 0 0 30px rgba(0, 255, 0, 0.5);
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--dark-surface);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--neon-cyan);
          border-radius: 2px;
          box-shadow: 0 0 5px var(--neon-cyan);
        }
      `}</style>
    </div>
  );
}
