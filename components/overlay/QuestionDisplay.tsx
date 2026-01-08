'use client';

import { useEffect, useRef, useState } from 'react';
import { Question } from '@/types/gamification';

interface QuestionDisplayProps {
  question: Question | null;
  isLoading?: boolean;
  onQuestionChange?: (question: Question) => void;
  className?: string;
}

/**
 * Composant QuestionDisplay pour l'overlay OBS
 * Affiche les questions avec animations fluides et optimisé pour streaming
 * Story 2.2 - Affichage Automatique des Questions
 */
export function QuestionDisplay({ 
  question, 
  isLoading = false, 
  onQuestionChange,
  className = '' 
}: QuestionDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const previousQuestionRef = useRef<Question | null>(null);

  // Animation d'entrée au montage
  useEffect(() => {
    setMounted(true);
    if (containerRef.current) {
      // GPU acceleration
      containerRef.current.style.transform = 'translateZ(0)';
    }
  }, []);

  // Gérer animation de sortie lors du changement de question
  useEffect(() => {
    if (previousQuestionRef.current && question && previousQuestionRef.current.id !== question.id) {
      // Déclencher animation de sortie
      setIsExiting(true);
      
      // Après animation de sortie, afficher nouvelle question
      const exitTimer = setTimeout(() => {
        setIsExiting(false);
        if (onQuestionChange && question) {
          onQuestionChange(question);
        }
      }, 300); // Durée animation fade-out

      return () => clearTimeout(exitTimer);
    }
    
    previousQuestionRef.current = question || null;
  }, [question, onQuestionChange]);

  // Skeleton screen pendant chargement
  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className={`relative transform rotate-[-2deg] ${className}`}
        data-testid="question-skeleton"
      >
        <div className="relative bg-black border-brutal neon-yellow rounded-none p-6 overflow-hidden">
          <div className="animate-pulse">
            <div className="h-4 bg-white/10 rounded mb-4 w-3/4 mx-auto" />
            <div className="h-6 bg-white/10 rounded mb-2 w-full" />
            <div className="h-6 bg-white/10 rounded w-5/6 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Message gracieux si aucune question
  if (!question) {
    return (
      <div
        ref={containerRef}
        className={`relative transform rotate-[-2deg] ${className}`}
        data-testid="question-display"
      >
        <div className="relative bg-black border-brutal neon-yellow rounded-none p-6 overflow-hidden">
          <div className="text-center">
            <p className="font-heading text-lg text-white/70">
              Aucune question disponible
            </p>
            <p className="font-body text-sm text-white/50 mt-2">
              Chargement en cours...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Animation classes : fade-in + slide-up pour entrée, fade-out pour sortie
  const animationClass = isExiting
    ? 'opacity-0 transition-opacity duration-300 ease-out'
    : mounted
    ? 'opacity-100 animate-[fade-in-slide-up_0.6s_ease-out]'
    : 'opacity-0';

  return (
    <div
      ref={containerRef}
      className={`relative transform rotate-[-2deg] gpu-accelerated ${animationClass} ${className}`}
      data-testid="question-display"
      style={{ 
        animationFillMode: 'both',
        willChange: 'transform, opacity' // GPU acceleration hint
      }}
    >
      {/* Outer brutal border with glow */}
      <div className="absolute inset-0 border-brutal rounded-none transform translate-x-1 translate-y-1 transition-colors duration-300 neon-cyan box-glow-cyan" />

      {/* Main card */}
      <div className="relative bg-black border-brutal neon-yellow rounded-none p-6 overflow-hidden">
        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-neon-yellow" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-neon-yellow" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-neon-yellow" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-neon-yellow" />

        {/* Header */}
        <div className="relative mb-4">
          <div className="font-condensed text-xs tracking-[0.3em] neon-cyan glow-cyan uppercase font-bold">
            QUESTION ACTIVE
          </div>
          <div 
            className="absolute -right-2 -top-2 w-3 h-3 bg-neon-green rounded-full animate-pulse"
            style={{
              boxShadow: '0 0 10px var(--neon-green), 0 0 20px var(--neon-green)'
            }}
          />
        </div>

        {/* Question text - Support multiligne avec contrast WCAG AA */}
        <div className="text-center mb-4">
          <h2 
            className="font-heading text-xl lg:text-2xl leading-tight text-white mb-4 tracking-wide break-words whitespace-normal"
            style={{
              // Contrast WCAG AA minimum : text-white sur bg-black = 21:1 (largement supérieur à 4.5:1 requis)
              color: '#FFFFFF', // Explicit pour accessibilité
              minHeight: '3rem', // Espace pour multiligne
              lineHeight: '1.5' // Lisibilité optimale
            }}
          >
            {question.text}
          </h2>
        </div>

        {/* Call to action */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 font-body text-sm text-white/70 uppercase tracking-wide">
            <span className="inline-block w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            <span>Répondez dans le chat TikTok</span>
            <span 
              className="inline-block w-2 h-2 bg-neon-green rounded-full animate-pulse"
              style={{ animationDelay: '0.5s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
