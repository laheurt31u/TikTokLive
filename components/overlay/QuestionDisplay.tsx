'use client';

import { useEffect, useRef, useState } from 'react';

interface QuestionDisplayProps {
  question: string;
  timeLeft: number;
  totalTime: number;
  status: 'active' | 'urgent';
}

export function QuestionDisplay({ question, timeLeft, totalTime, status }: QuestionDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (containerRef.current) {
      containerRef.current.style.transform = 'translateZ(0)';
    }
  }, []);

  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const isUrgent = status === 'urgent' || timeLeft < 10;

  return (
    <div
      ref={containerRef}
      className={`relative transform rotate-[-2deg] gpu-accelerated ${mounted ? 'animate-[slide-in-top_0.6s_ease-out]' : 'opacity-0'}`}
      style={{ animationFillMode: 'both' }}
    >
      {/* Outer brutal border with glow */}
      <div
        className={`absolute inset-0 border-brutal rounded-none transform translate-x-1 translate-y-1 transition-colors duration-300 ${
          isUrgent ? 'neon-magenta box-glow-magenta' : 'neon-cyan box-glow-cyan'
        }`}
      />

      {/* Main card */}
      <div className="relative bg-black border-brutal neon-yellow rounded-none p-6 overflow-hidden">
        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-neon-yellow" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-neon-yellow" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-neon-yellow" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-neon-yellow" />

        {/* Glitch effect on urgent */}
        {isUrgent && (
          <div className="absolute inset-0 bg-neon-magenta/5 animate-[glitch-skew_0.3s_ease-in-out_infinite]" />
        )}

        {/* Header */}
        <div className="relative mb-6">
          <div className="font-condensed text-xs tracking-[0.3em] neon-cyan glow-cyan uppercase font-bold">
            QUESTION ACTIVE
          </div>
          <div className="absolute -right-2 -top-2 w-3 h-3 bg-neon-green rounded-full animate-pulse"
            style={{
              boxShadow: '0 0 10px var(--neon-green), 0 0 20px var(--neon-green)'
            }}
          />
        </div>

        {/* Timer - Circular with enhanced styling */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer ring decoration */}
          <div className={`absolute inset-0 rounded-full border-2 transition-colors duration-300 ${
            isUrgent ? 'border-neon-magenta/30' : 'border-neon-cyan/30'
          }`} />

          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={isUrgent ? 'var(--neon-magenta)' : 'var(--neon-cyan)'}
              strokeWidth="6"
              strokeDasharray={`${progress * 2.639}, 263.9`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
              style={{
                filter: isUrgent
                  ? 'drop-shadow(0 0 8px var(--neon-magenta)) drop-shadow(0 0 16px var(--neon-magenta))'
                  : 'drop-shadow(0 0 8px var(--neon-cyan)) drop-shadow(0 0 16px var(--neon-cyan))'
              }}
            />
          </svg>

          {/* Center time display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`font-display text-4xl transition-all duration-300 ${
                isUrgent
                  ? 'neon-magenta glow-magenta animate-[shake-intense_0.5s_ease-in-out_infinite]'
                  : 'neon-cyan glow-cyan'
              }`}>
                {timeLeft}
              </div>
              <div className="font-condensed text-[10px] text-white/60 tracking-wider uppercase mt-1">
                sec
              </div>
            </div>
          </div>
        </div>

        {/* Question text */}
        <div className="text-center mb-4">
          <h2 className="font-heading text-xl leading-tight text-white mb-4 tracking-wide">
            {question}
          </h2>

          {/* Urgency indicator */}
          {isUrgent && (
            <div className="inline-block px-4 py-1 bg-neon-magenta/20 border-2 border-neon-magenta font-condensed text-sm neon-magenta glow-magenta uppercase tracking-wider animate-pulse">
              <span className="inline-block animate-[flicker_3s_ease-in-out_infinite]">⚠</span>
              {' '}DÉPÊCHEZ-VOUS !
            </div>
          )}
        </div>

        {/* Call to action */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 font-body text-sm text-white/70 uppercase tracking-wide">
            <span className="inline-block w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            <span>Répondez dans le chat TikTok</span>
            <span className="inline-block w-2 h-2 bg-neon-green rounded-full animate-pulse"
              style={{ animationDelay: '0.5s' }}
            />
          </div>
        </div>

        {/* Status bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isUrgent ? 'bg-neon-magenta' : 'bg-neon-cyan'
            }`}
            style={{
              width: `${progress}%`,
              boxShadow: isUrgent
                ? '0 0 10px var(--neon-magenta)'
                : '0 0 10px var(--neon-cyan)'
            }}
          />
        </div>
      </div>
    </div>
  );
}