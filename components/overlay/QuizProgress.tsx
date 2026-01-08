import { useEffect, useState } from 'react';

interface QuizProgressProps {
  current: number;
  total: number;
  phase: string;
}

export function QuizProgress({ current, total, phase }: QuizProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const progress = (current / total) * 100;

  // Animation smooth de la barre de progression
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress]);

  const getPhaseColor = () => {
    switch (phase) {
      case 'question_active':
        return {
          bg: 'bg-[#00F2EA]',
          text: 'text-[#00F2EA]',
          glow: 'shadow-[#00F2EA]/50'
        };
      case 'time_running_out':
        return {
          bg: 'bg-[#FE2C55]',
          text: 'text-[#FE2C55]',
          glow: 'shadow-[#FE2C55]/50'
        };
      case 'winner_found':
        return {
          bg: 'bg-yellow-500',
          text: 'text-yellow-300',
          glow: 'shadow-yellow-500/50'
        };
      case 'ended':
        return {
          bg: 'bg-green-500',
          text: 'text-green-300',
          glow: 'shadow-green-500/50'
        };
      default:
        return {
          bg: 'bg-gray-500',
          text: 'text-gray-300',
          glow: 'shadow-gray-500/50'
        };
    }
  };

  const colors = getPhaseColor();

  return (
    <div className="bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
      <div className="flex items-center space-x-3">
        {/* Question Counter */}
        <div className={`text-sm font-bold ${colors.text} min-w-[60px]`}>
          {current}/{total}
        </div>

        {/* Progress Bar */}
        <div className="flex-1 relative">
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${colors.bg} rounded-full transition-all duration-1000 ease-out ${colors.glow} shadow-lg`}
              style={{
                width: `${animatedProgress}%`,
                transform: 'translateZ(0)' // GPU acceleration
              }}
            />
          </div>

          {/* Animated dots for active phases */}
          {(phase === 'question_active' || phase === 'time_running_out') && (
            <div className="absolute top-0 left-0 w-full h-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
                   style={{
                     animation: 'shimmer 2s infinite',
                     transform: 'translateZ(0)'
                   }}
              />
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-1">
          {phase === 'question_active' && (
            <div className="w-2 h-2 bg-[#00F2EA] rounded-full animate-pulse" />
          )}
          {phase === 'time_running_out' && (
            <div className="w-2 h-2 bg-[#FE2C55] rounded-full animate-ping" />
          )}
          {phase === 'winner_found' && (
            <div className="text-yellow-400 animate-bounce">🏆</div>
          )}
          {phase === 'ended' && (
            <div className="text-green-400">✅</div>
          )}
        </div>
      </div>

      {/* Phase Label */}
      <div className="text-center mt-1">
        <span className={`text-xs font-medium ${colors.text}`}>
          {phase === 'question_active' && 'Question en cours'}
          {phase === 'time_running_out' && 'Temps écoulé !'}
          {phase === 'winner_found' && 'Gagnant trouvé !'}
          {phase === 'ended' && 'Quiz terminé'}
          {phase === 'waiting' && 'En attente...'}
        </span>
      </div>
    </div>
  );
}