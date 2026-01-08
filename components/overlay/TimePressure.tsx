import { useEffect, useState } from 'react';

interface TimePressureProps {
  timeLeft: number;
  totalTime: number;
  intensity: 'low' | 'medium' | 'high';
}

export function TimePressure({ timeLeft, totalTime, intensity }: TimePressureProps) {
  const [pulseIntensity, setPulseIntensity] = useState(1);

  useEffect(() => {
    // Intensité croissante quand le temps presse
    const progress = (totalTime - timeLeft) / totalTime;

    if (progress > 0.8) {
      setPulseIntensity(3); // Very intense
    } else if (progress > 0.6) {
      setPulseIntensity(2); // Intense
    } else {
      setPulseIntensity(1); // Normal
    }
  }, [timeLeft, totalTime]);

  const getIntensityConfig = () => {
    switch (intensity) {
      case 'high':
        return {
          bgColor: 'bg-red-500/90',
          borderColor: 'border-red-400',
          textColor: 'text-red-100',
          message: 'TEMPS ÉCOULÉ !',
          icon: '⏰',
          scale: 'scale-110'
        };
      case 'medium':
        return {
          bgColor: 'bg-orange-500/90',
          borderColor: 'border-orange-400',
          textColor: 'text-orange-100',
          message: 'Plus que quelques secondes !',
          icon: '⚡',
          scale: 'scale-105'
        };
      default:
        return {
          bgColor: 'bg-yellow-500/90',
          borderColor: 'border-yellow-400',
          textColor: 'text-yellow-100',
          message: 'Le temps presse !',
          icon: '🔔',
          scale: 'scale-100'
        };
    }
  };

  const config = getIntensityConfig();

  return (
    <div
      className={`
        relative px-6 py-4 rounded-2xl backdrop-blur-sm border-2 text-center
        ${config.bgColor} ${config.borderColor} ${config.scale}
        shadow-2xl transition-all duration-300
      `}
      style={{
        transform: `translateZ(0) scale(${config.scale})`,
        animation: pulseIntensity > 1
          ? `pulse-${pulseIntensity} 0.5s infinite alternate`
          : undefined,
        boxShadow: pulseIntensity > 1
          ? `0 0 ${pulseIntensity * 10}px rgba(254, 44, 85, 0.6)`
          : '0 0 20px rgba(254, 44, 85, 0.4)'
      }}
    >
      {/* Icon avec animation */}
      <div className="text-3xl mb-2 animate-bounce">
        {config.icon}
      </div>

      {/* Message principal */}
      <div className={`text-lg font-black ${config.textColor} mb-2`}>
        {config.message}
      </div>

      {/* Timer restant */}
      <div className={`text-2xl font-bold ${config.textColor} animate-pulse`}>
        {timeLeft}s
      </div>

      {/* Barre de progression urgente */}
      <div className="mt-3 w-full bg-black/30 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
          style={{
            width: `${(timeLeft / totalTime) * 100}%`,
            transform: 'translateZ(0)'
          }}
        />
      </div>

      {/* Effets visuels d'urgence */}
      {intensity === 'high' && (
        <>
          {/* Cercle de pulsation externe */}
          <div className="absolute inset-0 rounded-2xl border-4 border-red-300 animate-ping opacity-30" />

          {/* Particules d'urgence */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-red-400 rounded-full animate-ping"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${20 + Math.random() * 60}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>

          {/* Screen shake effect */}
          <div
            className="absolute inset-0 rounded-2xl bg-red-500/10 animate-pulse"
            style={{
              animation: 'shake 0.5s infinite'
            }}
          />
        </>
      )}

      {/* Call to action urgent */}
      <div className={`text-sm ${config.textColor} mt-2 font-semibold`}>
        Répondez maintenant !
      </div>
    </div>
  );
}