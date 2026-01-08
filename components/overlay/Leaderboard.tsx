'use client';

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  avatar: string;
  isNew?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  showAnimations?: boolean;
}

export function Leaderboard({ entries, showAnimations = true }: LeaderboardProps) {
  const [previousEntries, setPreviousEntries] = useState<LeaderboardEntry[]>([]);
  const [animatingEntries, setAnimatingEntries] = useState<Set<number>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect changes for animations
  useEffect(() => {
    if (!showAnimations) return;

    const newAnimating = new Set<number>();

    entries.forEach((entry, index) => {
      const prevEntry = previousEntries[index];
      if (!prevEntry || prevEntry.points !== entry.points || entry.isNew) {
        newAnimating.add(entry.rank);
      }
    });

    setAnimatingEntries(newAnimating);

    const timer = setTimeout(() => {
      setAnimatingEntries(new Set());
    }, 2000);

    setPreviousEntries([...entries]);

    return () => clearTimeout(timer);
  }, [entries, previousEntries, showAnimations]);

  // Color schemes for top 5 ranks
  const getRankColors = (rank: number) => {
    const schemes = [
      { text: 'neon-yellow', glow: 'glow-yellow', border: 'border-neon-yellow', bg: 'bg-neon-yellow/10' },
      { text: 'neon-cyan', glow: 'glow-cyan', border: 'border-neon-cyan', bg: 'bg-neon-cyan/10' },
      { text: 'neon-magenta', glow: 'glow-magenta', border: 'border-neon-magenta', bg: 'bg-neon-magenta/10' },
      { text: 'text-white/80', glow: '', border: 'border-white/30', bg: 'bg-white/5' },
      { text: 'text-white/80', glow: '', border: 'border-white/30', bg: 'bg-white/5' }
    ];
    return schemes[rank - 1] || schemes[3];
  };

  return (
    <div
      className={`relative transform rotate-[2deg] gpu-accelerated ${mounted ? 'animate-[slide-in-bottom_0.7s_ease-out]' : 'opacity-0'}`}
      style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
    >
      {/* Outer brutal border */}
      <div className="absolute inset-0 border-brutal neon-magenta box-glow-magenta rounded-none transform -translate-x-1 translate-y-1" />

      {/* Main card */}
      <div className="relative bg-black border-brutal neon-cyan rounded-none p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-neon-cyan/30">
          <div className="flex items-center gap-2">
            <div className="text-2xl animate-[neon-pulse_2s_ease-in-out_infinite]">
              🏆
            </div>
            <h3 className="font-display text-lg neon-yellow glow-yellow uppercase tracking-wide">
              TOP 5
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            <div className="font-condensed text-xs neon-cyan tracking-wider uppercase">
              LIVE
            </div>
          </div>
        </div>

        {/* Leaderboard entries */}
        <div className="space-y-2">
          {entries.slice(0, 5).map((entry, index) => {
            const colors = getRankColors(entry.rank);
            const isAnimating = animatingEntries.has(entry.rank);
            const isTop3 = entry.rank <= 3;

            return (
              <div
                key={entry.rank}
                className={`
                  relative flex items-center justify-between p-2 border-2 ${colors.border}
                  ${colors.bg} backdrop-blur-sm transition-all duration-300
                  ${isAnimating ? 'animate-[slide-in-left_0.4s_ease-out] scale-105' : ''}
                  ${entry.isNew ? 'animate-[zoom-bounce_0.5s_ease-out]' : ''}
                `}
                style={{
                  animationDelay: mounted ? `${0.5 + index * 0.1}s` : '0s',
                  animationFillMode: 'both',
                  boxShadow: isAnimating
                    ? `0 0 20px ${entry.rank === 1 ? 'var(--neon-yellow)' : entry.rank === 2 ? 'var(--neon-cyan)' : 'var(--neon-magenta)'}`
                    : undefined
                }}
              >
                {/* Glitch effect when animating */}
                {isAnimating && (
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 to-transparent animate-[glitch_0.3s_ease-in-out_infinite]" />
                )}

                {/* Rank badge */}
                <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
                  <div
                    className={`
                      flex-shrink-0 w-8 h-8 flex items-center justify-center
                      font-display text-sm ${colors.text} ${colors.glow}
                      border-2 ${colors.border} bg-black
                      ${isAnimating ? 'animate-[rotate-cw_1s_ease-in-out]' : ''}
                    `}
                  >
                    {entry.rank}
                  </div>

                  {/* Username with cyberpunk styling */}
                  <div className="flex-1 min-w-0">
                    <div className="font-condensed text-base font-semibold text-white truncate tracking-wide">
                      {entry.username}
                    </div>
                    {isTop3 && (
                      <div className="flex items-center gap-1">
                        <div className={`w-1 h-1 ${colors.border} ${colors.bg}`} />
                        <div className={`font-condensed text-[10px] ${colors.text} uppercase tracking-wider`}>
                          {entry.rank === 1 ? 'Champion' : entry.rank === 2 ? 'Runner-up' : 'Bronze'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Points display */}
                <div className={`flex-shrink-0 font-heading text-sm ${colors.text} ${colors.glow} ml-2 relative z-10`}>
                  {entry.points.toLocaleString()}
                </div>

                {/* New indicator badge */}
                {entry.isNew && (
                  <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-neon-green font-condensed text-[10px] text-black font-bold uppercase tracking-wider animate-pulse">
                    NEW
                  </div>
                )}

                {/* Medal emoji for top 3 */}
                {isTop3 && (
                  <div className="absolute -top-2 -left-2 text-xl animate-[wiggle_2s_ease-in-out_infinite]"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.8))',
                      animationDelay: `${index * 0.2}s`
                    }}
                  >
                    {entry.rank === 1 ? '👑' : entry.rank === 2 ? '🥈' : '🥉'}
                  </div>
                )}

                {/* Progress bars for top 3 */}
                {isTop3 && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        entry.rank === 1
                          ? 'from-neon-yellow to-neon-orange'
                          : entry.rank === 2
                          ? 'from-neon-cyan to-neon-purple'
                          : 'from-neon-magenta to-neon-purple'
                      }`}
                      style={{
                        width: `${100 - (entry.rank - 1) * 20}%`,
                        boxShadow: `0 0 10px currentColor`
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer stats */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-2">
          <div className="font-condensed text-[10px] text-white/40 uppercase tracking-[0.2em]">
            Mise à jour temps réel
          </div>
          <div className="w-1 h-1 bg-neon-green rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}