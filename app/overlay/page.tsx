'use client';

import { useState, useEffect } from 'react';

export default function OverlayPage() {
  const [mounted, setMounted] = useState(false);
  const [testData] = useState({
    question: "Quelle est la capitale de la France ?",
    timeLeft: 15,
    totalTime: 30,
    leaderboard: [
      { rank: 1, username: 'GamerPro123', points: 2500, isNew: true },
      { rank: 2, username: 'QuizMaster', points: 1800, isNew: false },
      { rank: 3, username: 'Brainiac_', points: 1200, isNew: false },
      { rank: 4, username: 'ProPlayer', points: 950, isNew: false },
      { rank: 5, username: 'NoobSlayer', points: 720, isNew: true }
    ]
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const progress = ((testData.totalTime - testData.timeLeft) / testData.totalTime) * 100;
  const isUrgent = testData.timeLeft < 10;

  return (
    <div className="relative min-h-screen bg-transparent text-white p-4 overflow-hidden scanlines grain">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 w-96 h-96 bg-neon-magenta/10 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 right-1/2 w-80 h-80 bg-neon-cyan/10 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-sm mx-auto h-full flex flex-col justify-between py-6 gap-6">

        {/* === QUESTION CARD === */}
        <div
          className={`relative transform rotate-[-2deg] ${mounted ? 'animate-[slide-in-top_0.6s_ease-out]' : 'opacity-0'}`}
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
        >
          {/* Outer brutal border */}
          <div className={`absolute inset-0 border-brutal ${isUrgent ? 'neon-magenta box-glow-magenta' : 'neon-cyan box-glow-cyan'} rounded-none transform translate-x-1 translate-y-1`} />

          {/* Main card */}
          <div className="relative bg-black border-brutal neon-yellow rounded-none p-6 overflow-hidden">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-neon-yellow" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-neon-yellow" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-neon-yellow" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-neon-yellow" />

            {/* Header */}
            <div className="relative mb-6">
              <div className="font-condensed text-xs tracking-[0.3em] neon-cyan glow-cyan uppercase font-bold">
                QUESTION ACTIVE
              </div>
              <div className="absolute -right-2 -top-2 w-3 h-3 bg-neon-green rounded-full animate-pulse" />
            </div>

            {/* Timer - Circular */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={isUrgent ? 'var(--neon-magenta)' : 'var(--neon-cyan)'}
                  strokeWidth="8"
                  strokeDasharray={`${progress * 2.827}, 282.7`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                  style={{
                    filter: isUrgent
                      ? 'drop-shadow(0 0 10px var(--neon-magenta))'
                      : 'drop-shadow(0 0 10px var(--neon-cyan))'
                  }}
                />
              </svg>

              {/* Center time display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`font-display text-3xl ${isUrgent ? 'neon-magenta glow-magenta animate-[shake-intense_0.5s_ease-in-out_infinite]' : 'neon-cyan glow-cyan'}`}>
                    {testData.timeLeft}
                  </div>
                  <div className="font-condensed text-[10px] text-white/60 tracking-wider uppercase">
                    sec
                  </div>
                </div>
              </div>
            </div>

            {/* Question text */}
            <div className="text-center mb-4">
              <h2 className="font-heading text-xl leading-tight text-white mb-4">
                {testData.question}
              </h2>

              {isUrgent && (
                <div className="inline-block px-4 py-1 bg-neon-magenta/20 border-2 border-neon-magenta font-condensed text-sm neon-magenta glow-magenta uppercase tracking-wider animate-pulse">
                  ⚠ DÉPÊCHEZ-VOUS !
                </div>
              )}
            </div>

            {/* Call to action */}
            <div className="text-center font-body text-sm text-white/70 uppercase tracking-wide">
              → Répondez dans le chat TikTok
            </div>
          </div>
        </div>

        {/* === LEADERBOARD === */}
        <div
          className={`relative transform rotate-[2deg] ${mounted ? 'animate-[slide-in-bottom_0.7s_ease-out]' : 'opacity-0'}`}
          style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
        >
          {/* Outer brutal border */}
          <div className="absolute inset-0 border-brutal neon-magenta box-glow-magenta rounded-none transform -translate-x-1 translate-y-1" />

          {/* Main card */}
          <div className="relative bg-black border-brutal neon-cyan rounded-none p-5 overflow-hidden">
            {/* Header with trophy */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-neon-cyan/30">
              <div className="flex items-center gap-2">
                <div className="text-2xl animate-[neon-pulse_2s_ease-in-out_infinite]">🏆</div>
                <h3 className="font-display text-lg neon-yellow glow-yellow uppercase tracking-wide">
                  TOP 5
                </h3>
              </div>
              <div className="font-condensed text-xs neon-cyan tracking-wider uppercase">
                LIVE
              </div>
            </div>

            {/* Leaderboard entries */}
            <div className="space-y-2">
              {testData.leaderboard.map((entry, index) => {
                const colors = [
                  { text: 'neon-yellow', glow: 'glow-yellow', border: 'border-neon-yellow' },
                  { text: 'neon-cyan', glow: 'glow-cyan', border: 'border-neon-cyan' },
                  { text: 'neon-magenta', glow: 'glow-magenta', border: 'border-neon-magenta' },
                  { text: 'text-white/80', glow: '', border: 'border-white/30' },
                  { text: 'text-white/80', glow: '', border: 'border-white/30' }
                ];
                const colorScheme = colors[index] || colors[3];

                return (
                  <div
                    key={entry.rank}
                    className={`relative flex items-center justify-between p-2 border-2 ${colorScheme.border} bg-black/50 ${entry.isNew ? 'animate-[slide-in-left_0.4s_ease-out]' : ''}`}
                    style={{
                      animationDelay: `${0.5 + index * 0.1}s`,
                      animationFillMode: 'both'
                    }}
                  >
                    {/* Rank badge */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center font-display text-sm ${colorScheme.text} ${colorScheme.glow} border-2 ${colorScheme.border} bg-black`}>
                        {entry.rank}
                      </div>

                      {/* Username */}
                      <div className="font-condensed text-base font-semibold text-white truncate tracking-wide">
                        {entry.username}
                      </div>
                    </div>

                    {/* Points */}
                    <div className={`flex-shrink-0 font-heading text-sm ${colorScheme.text} ${colorScheme.glow} ml-2`}>
                      {entry.points.toLocaleString()}
                    </div>

                    {/* New indicator */}
                    {entry.isNew && (
                      <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-neon-green font-condensed text-[10px] text-black font-bold uppercase tracking-wider animate-pulse">
                        NEW
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* === BRANDING BADGE === */}
        <div
          className={`text-center ${mounted ? 'animate-[zoom-bounce_0.5s_ease-out]' : 'opacity-0'}`}
          style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
        >
          <div className="inline-block px-4 py-2 border-2 border-white/20 bg-black/80 backdrop-blur-sm">
            <div className="font-condensed text-[10px] text-white/40 uppercase tracking-[0.2em]">
              ⚡ Powered by TikTokLive Quiz
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}