'use client';

import { useEffect, useState } from 'react';
import type { Question as QuestionType } from '@/types/quiz';

interface QuestionProps {
  question: QuestionType | null;
  onComplete?: () => void;
  className?: string;
}

export function Question({ question, onComplete, className = '' }: QuestionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);

  useEffect(() => {
    if (question) {
      // Animation d'entrée avec glitch
      setShowGlitch(true);
      const glitchTimer = setTimeout(() => setShowGlitch(false), 300);

      setIsVisible(false);
      const visibleTimer = setTimeout(() => setIsVisible(true), 50);

      return () => {
        clearTimeout(glitchTimer);
        clearTimeout(visibleTimer);
      };
    }
  }, [question?.id]);

  if (!question) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-lg font-mono uppercase tracking-wider opacity-50">
            En attente de la prochaine question...
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full bg-neon-cyan"
                style={{
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                  boxShadow: 'var(--glow-cyan)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const difficultyColor = {
    facile: 'neon-green',
    moyen: 'neon-yellow',
    difficile: 'neon-magenta',
  }[question.difficulte];

  return (
    <div
      className={`relative ${className} transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Bordure néon animée */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: 'linear-gradient(45deg, var(--neon-cyan), var(--neon-magenta), var(--neon-yellow), var(--neon-cyan))',
          backgroundSize: '300% 300%',
          animation: 'gradient-shift 3s ease infinite',
          padding: '2px',
        }}
      >
        <div className="absolute inset-[2px] bg-dark-surface rounded-lg" />
      </div>

      {/* Contenu */}
      <div className="relative p-8 z-10">
        {/* Header avec thème et difficulté */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-neon-cyan" style={{ boxShadow: 'var(--glow-cyan)' }} />
            <span className="text-lg font-mono uppercase tracking-wider opacity-70">
              {question.theme}
            </span>
          </div>

          <div
            className="px-5 py-2 rounded-full border-2 font-mono text-base uppercase tracking-wider"
            style={{
              borderColor: `var(--${difficultyColor})`,
              color: `var(--${difficultyColor})`,
              boxShadow: `0 0 10px var(--${difficultyColor})`,
            }}
          >
            {question.difficulte}
          </div>
        </div>

        {/* Question principale */}
        <div className="relative">
          <h2
            className={`text-3xl font-display font-bold leading-tight ${
              showGlitch ? 'glitch-effect' : ''
            }`}
            data-text={question.question}
            style={{
              color: 'var(--neon-cyan)',
              textShadow: 'var(--glow-cyan)',
            }}
          >
            {question.question}
          </h2>

          {/* Ligne de scan décorative */}
          <div className="scan-line" />
        </div>

        {/* Réponse masquée */}
        <div className="mt-6 pt-6 border-t border-dark-border text-center">
          <div className="text-base font-mono uppercase tracking-wider opacity-50 mb-3">
            Réponse
          </div>
          <div className="text-4xl font-display font-bold tracking-widest"
            style={{
              color: 'var(--neon-yellow)',
              textShadow: 'var(--glow-yellow)',
              letterSpacing: '0.2em',
            }}
          >
            {question.reponses
              .find(r => r.correcte)
              ?.texte.split('')
              .map((char, i) => {
                // Remplacer lettres et chiffres par des underscores
                if (/[a-zA-Z0-9À-ÿ]/.test(char)) {
                  return <span key={i}>_</span>;
                }
                // Garder les espaces et autres caractères
                return <span key={i}>{char === ' ' ? '\u00A0\u00A0' : char}</span>;
              })}
          </div>
        </div>
      </div>

      {/* Particules décoratives dans les coins */}
      <div className="absolute top-2 left-2 h-2 w-2 bg-neon-cyan rounded-full"
        style={{ boxShadow: 'var(--glow-cyan)', animation: 'pulse 2s ease-in-out infinite' }}
      />
      <div className="absolute top-2 right-2 h-2 w-2 bg-neon-magenta rounded-full"
        style={{ boxShadow: 'var(--glow-magenta)', animation: 'pulse 2s ease-in-out infinite 0.5s' }}
      />
      <div className="absolute bottom-2 left-2 h-2 w-2 bg-neon-yellow rounded-full"
        style={{ boxShadow: 'var(--glow-yellow)', animation: 'pulse 2s ease-in-out infinite 1s' }}
      />
      <div className="absolute bottom-2 right-2 h-2 w-2 bg-neon-green rounded-full"
        style={{ boxShadow: 'var(--glow-green)', animation: 'pulse 2s ease-in-out infinite 1.5s' }}
      />

      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
