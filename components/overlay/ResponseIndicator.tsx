import { useEffect, useState } from 'react';

interface ResponseIndicatorProps {
  status: 'correct' | 'incorrect' | 'pending' | 'rate_limited';
  message: string;
  user: string;
}

export function ResponseIndicator({ status, message, user }: ResponseIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide après 4 secondes
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const getConfig = () => {
    switch (status) {
      case 'correct':
        return {
          bgColor: 'bg-green-500/90',
          borderColor: 'border-green-400',
          textColor: 'text-green-100',
          icon: '✅',
          animation: 'animate-bounce',
          glowColor: 'shadow-green-500/50'
        };
      case 'incorrect':
        return {
          bgColor: 'bg-red-500/90',
          borderColor: 'border-red-400',
          textColor: 'text-red-100',
          icon: '❌',
          animation: 'animate-shake',
          glowColor: 'shadow-red-500/50'
        };
      case 'pending':
        return {
          bgColor: 'bg-yellow-500/90',
          borderColor: 'border-yellow-400',
          textColor: 'text-yellow-100',
          icon: '⏳',
          animation: 'animate-pulse',
          glowColor: 'shadow-yellow-500/50'
        };
      case 'rate_limited':
        return {
          bgColor: 'bg-orange-500/90',
          borderColor: 'border-orange-400',
          textColor: 'text-orange-100',
          icon: '🚫',
          animation: 'animate-wiggle',
          glowColor: 'shadow-orange-500/50'
        };
      default:
        return {
          bgColor: 'bg-gray-500/90',
          borderColor: 'border-gray-400',
          textColor: 'text-gray-100',
          icon: '❓',
          animation: '',
          glowColor: 'shadow-gray-500/50'
        };
    }
  };

  const config = getConfig();

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl backdrop-blur-sm border-2 max-w-xs
        ${config.bgColor} ${config.borderColor} ${config.animation}
        shadow-lg ${config.glowColor} transition-all duration-500
      `}
      style={{
        transform: 'translateZ(0)', // Force GPU acceleration
      }}
    >
      {/* Icon */}
      <div className="flex items-center space-x-3">
        <span className="text-xl">{config.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${config.textColor} truncate`}>
            @{user}
          </div>
          <div className={`text-xs ${config.textColor} opacity-90`}>
            {message}
          </div>
        </div>
      </div>

      {/* Progress bar for pending */}
      {status === 'pending' && (
        <div className="mt-2 w-full bg-black/20 rounded-full h-1">
          <div className="bg-white/60 h-1 rounded-full animate-pulse w-3/4" />
        </div>
      )}

      {/* Rate limit warning */}
      {status === 'rate_limited' && (
        <div className="mt-2 text-xs text-orange-200">
          Une réponse par question !
        </div>
      )}

      {/* Correct celebration effect */}
      {status === 'correct' && (
        <div className="absolute inset-0 rounded-xl border-2 border-green-300 animate-ping opacity-30" />
      )}

      {/* Incorrect shake effect */}
      {status === 'incorrect' && (
        <div className="absolute inset-0 rounded-xl border-2 border-red-300 animate-pulse opacity-20" />
      )}
    </div>
  );
}