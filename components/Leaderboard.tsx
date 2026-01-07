'use client';

import { useEffect, useState } from 'react';
import type { Score } from '@/types/quiz';

interface LeaderboardProps {
  scores: Score[];
  currentUserId?: string;
  className?: string;
}

export function Leaderboard({ scores, currentUserId, className = '' }: LeaderboardProps) {
  const [displayScores, setDisplayScores] = useState<Score[]>([]);

  useEffect(() => {
    // Animer l'entrée des scores
    setDisplayScores([]);
    const timers = scores.slice(0, 10).map((score, index) => {
      return setTimeout(() => {
        setDisplayScores((prev) => [...prev, score]);
      }, index * 100);
    });

    return () => timers.forEach(clearTimeout);
  }, [scores]);

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'neon-yellow';
      case 2:
        return 'neon-cyan';
      case 3:
        return 'neon-orange';
      default:
        return 'neon-cyan';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Titre */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-1 bg-neon-magenta" style={{ boxShadow: 'var(--glow-magenta)' }} />
        <h3
          className="text-3xl font-display font-bold uppercase tracking-wider"
          style={{ color: 'var(--neon-magenta)', textShadow: 'var(--glow-magenta)' }}
        >
          Leaderboard
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-neon-magenta to-transparent" />
      </div>

      {/* Scan line effect */}
      <div className="scan-line" />

      {/* Liste des scores */}
      <div className="space-y-3">
        {displayScores.map((score, index) => {
          const rank = index + 1;
          const isCurrentUser = score.user_id === currentUserId;
          const isTopThree = rank <= 3;
          const rankColor = getRankColor(rank);
          const medal = getMedalEmoji(rank);

          return (
            <div
              key={score.user_id}
              className={`relative flex items-center gap-4 p-5 rounded-lg border transition-all duration-300 ${
                isCurrentUser ? 'bg-dark-elevated border-neon-green' : 'bg-dark-surface border-dark-border'
              }`}
              style={{
                animation: `slide-up 0.4s ease-out ${index * 0.1}s backwards`,
                boxShadow: isTopThree ? `0 0 20px rgba(0, 255, 249, 0.2)` : 'none',
              }}
            >
              {/* Effet de brillance pour le top 3 */}
              {isTopThree && (
                <div
                  className="absolute inset-0 rounded-lg opacity-30 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, transparent, var(--${rankColor}), transparent)`,
                    backgroundSize: '200% 200%',
                    animation: 'shine 3s ease-in-out infinite',
                  }}
                />
              )}

              {/* Rang */}
              <div className="relative flex items-center justify-center min-w-[60px]">
                {medal ? (
                  <span className="text-3xl">{medal}</span>
                ) : (
                  <div
                    className="flex items-center justify-center h-12 w-12 rounded-full border-2 font-display font-bold text-xl"
                    style={{
                      borderColor: `var(--${rankColor})`,
                      color: `var(--${rankColor})`,
                      background: 'var(--dark-void)',
                      boxShadow: isTopThree ? `0 0 15px var(--${rankColor})` : 'none',
                    }}
                  >
                    {rank}
                  </div>
                )}
              </div>

              {/* Username */}
              <div className="flex-1">
                <div
                  className={`font-mono text-xl ${isCurrentUser ? 'font-bold' : 'font-medium'}`}
                  style={{
                    color: isCurrentUser ? 'var(--neon-green)' : 'white',
                    textShadow: isCurrentUser ? 'var(--glow-green)' : 'none',
                  }}
                >
                  {score.username}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs opacity-70">(Vous)</span>
                  )}
                </div>
              </div>

              {/* Points */}
              <div className="flex items-center gap-2">
                <div
                  className="font-display font-bold text-3xl"
                  style={{
                    color: `var(--${rankColor})`,
                    textShadow: isTopThree ? `var(--glow-${rankColor === 'neon-yellow' ? 'yellow' : rankColor === 'neon-cyan' ? 'cyan' : 'cyan'})` : 'none',
                  }}
                >
                  {score.points}
                </div>
                <div className="text-xs font-mono uppercase opacity-50">pts</div>
              </div>

              {/* Barre de progression pour le top 3 */}
              {isTopThree && (
                <div
                  className="absolute bottom-0 left-0 h-1 rounded-b-lg"
                  style={{
                    width: `${(score.points / displayScores[0].points) * 100}%`,
                    background: `var(--${rankColor})`,
                    boxShadow: `0 0 10px var(--${rankColor})`,
                    animation: `expand 1s ease-out ${index * 0.1}s backwards`,
                  }}
                />
              )}

              {/* Effet de particules pour le premier */}
              {rank === 1 && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute h-1 w-1 rounded-full"
                      style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: `${20 + Math.random() * 60}%`,
                        background: 'var(--neon-yellow)',
                        boxShadow: '0 0 5px var(--neon-yellow)',
                        animation: `sparkle ${2 + Math.random()}s ease-in-out infinite`,
                        animationDelay: `${Math.random() * 2}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Message si vide */}
      {displayScores.length === 0 && (
        <div className="text-center py-12 text-sm font-mono opacity-50">
          Aucun score pour le moment...
        </div>
      )}

      <style jsx>{`
        @keyframes shine {
          0%, 100% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
        }

        @keyframes expand {
          from {
            width: 0;
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}
