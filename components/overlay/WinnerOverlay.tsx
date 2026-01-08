import { useEffect, useState } from 'react';

interface Winner {
  username: string;
  avatar: string;
  points: number;
  streak: number;
}

interface WinnerOverlayProps {
  winner: Winner;
  celebration: 'minor' | 'major' | 'streak';
  onComplete?: () => void;
}

export function WinnerOverlay({ winner, celebration, onComplete }: WinnerOverlayProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinner, setShowWinner] = useState(false);

  useEffect(() => {
    // Sequence d'animation
    const timer1 = setTimeout(() => setShowConfetti(true), 100);
    const timer2 = setTimeout(() => setShowWinner(true), 500);

    // Auto-hide après 8 secondes
    const timer3 = setTimeout(() => {
      setShowConfetti(false);
      setShowWinner(false);
      onComplete?.();
    }, 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  const getCelebrationConfig = () => {
    switch (celebration) {
      case 'major':
        return {
          confettiCount: 150,
          duration: 6000,
          message: 'INCROYABLE !'
        };
      case 'streak':
        return {
          confettiCount: 200,
          duration: 7000,
          message: `${winner.streak} DE SUITE !`
        };
      default:
        return {
          confettiCount: 80,
          duration: 4000,
          message: 'FÉLICITATIONS !'
        };
    }
  };

  const config = getCelebrationConfig();

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Confetti Background */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: config.confettiCount }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#FE2C55', '#00F2EA', '#FFD700', '#FF6B6B'][Math.floor(Math.random() * 4)],
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Winner Announcement */}
      {showWinner && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-br from-[#FE2C55]/90 to-[#00F2EA]/90 backdrop-blur-sm rounded-3xl p-8 max-w-md mx-4 text-center shadow-2xl border-2 border-white/20">
            {/* Celebration Message */}
            <div className="text-4xl font-black text-white mb-4 animate-pulse">
              {config.message}
            </div>

            {/* Winner Avatar */}
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl animate-bounce">
                <span className="text-3xl font-bold text-white">
                  {winner.username.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Glow effect */}
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-[#FE2C55] blur-xl opacity-50 animate-ping" />

              {/* Crown for top winner */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-3xl animate-bounce">
                👑
              </div>
            </div>

            {/* Winner Name */}
            <div className="text-2xl font-bold text-white mb-2">
              @{winner.username}
            </div>

            {/* Winner Stats */}
            <div className="flex justify-center space-x-6 mb-6">
              <div className="text-center">
                <div className="text-lg font-bold text-[#00F2EA]">{winner.points}</div>
                <div className="text-sm text-white/80">Points</div>
              </div>

              {winner.streak > 1 && (
                <div className="text-center">
                  <div className="text-lg font-bold text-[#FFD700]">{winner.streak}</div>
                  <div className="text-sm text-white/80">Streak</div>
                </div>
              )}
            </div>

            {/* Call to action */}
            <div className="text-lg text-white/90 font-semibold">
              🎉 Vous avez gagné !
            </div>

            {/* Streak message */}
            {winner.streak > 1 && (
              <div className="text-sm text-[#FFD700] mt-2 animate-pulse">
                🔥 {winner.streak} victoires consécutives !
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen flash effect */}
      <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />

      {/* Sound trigger (visual indicator) */}
      <div className="absolute top-4 right-4 text-2xl animate-ping">
        🔊
      </div>
    </div>
  );
}