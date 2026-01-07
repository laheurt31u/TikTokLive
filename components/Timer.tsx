'use client';

import { useEffect, useState } from 'react';

interface TimerProps {
  duration: number; // durée en secondes
  onComplete?: () => void;
  className?: string;
}

export function Timer({ duration, onComplete, className = '' }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setTimeRemaining(duration);
    setIsActive(true);
  }, [duration]);

  useEffect(() => {
    if (!isActive) return;

    if (timeRemaining <= 0) {
      onComplete?.();
      setIsActive(false);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isActive, onComplete]);

  const percentage = (timeRemaining / duration) * 100;
  const isUrgent = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  const getTimerColor = () => {
    if (isCritical) return 'neon-magenta';
    if (isUrgent) return 'neon-yellow';
    return 'neon-cyan';
  };

  const getGlowColor = () => {
    if (isCritical) return 'var(--glow-magenta)';
    if (isUrgent) return 'var(--glow-yellow)';
    return 'var(--glow-cyan)';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Titre */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-mono uppercase tracking-wider opacity-70">
          Temps Restant
        </span>
        <span
          className={`text-4xl font-display font-bold ${
            isCritical ? 'animate-pulse' : ''
          }`}
          style={{
            color: `var(--${getTimerColor()})`,
            textShadow: getGlowColor(),
          }}
        >
          {timeRemaining}s
        </span>
      </div>

      {/* Barre de progression */}
      <div className="relative h-4 bg-dark-elevated rounded-full overflow-hidden border border-dark-border">
        {/* Barre de fond avec grille */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0, 255, 249, 0.1) 10px, rgba(0, 255, 249, 0.1) 11px)',
          }}
        />

        {/* Barre de progression animée */}
        <div
          className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-linear ${
            isCritical ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg,
              var(--${getTimerColor()}) 0%,
              var(--${getTimerColor()}) 50%,
              transparent 100%)`,
            boxShadow: getGlowColor(),
          }}
        >
          {/* Effet de scan */}
          <div
            className="absolute top-0 right-0 h-full w-1"
            style={{
              background: `var(--${getTimerColor()})`,
              boxShadow: `0 0 10px var(--${getTimerColor()}), 0 0 20px var(--${getTimerColor()})`,
            }}
          />
        </div>

        {/* Particules */}
        {isCritical && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-neon-magenta"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  animation: `float ${1 + Math.random()}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                  boxShadow: '0 0 5px var(--neon-magenta)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Indicateur d'urgence */}
      {isUrgent && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1">
          <span className="text-xs font-mono uppercase tracking-wider animate-pulse"
            style={{
              color: `var(--${getTimerColor()})`,
              textShadow: getGlowColor(),
            }}
          >
            {isCritical ? '!!! CRITIQUE !!!' : '! URGENT !'}
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(-50%) translateX(0);
            opacity: 1;
          }
          50% {
            transform: translateY(-50%) translateX(-10px);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
