import { memo } from 'react';

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const LeaderboardComponent = memo(function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <div className="leaderboard-container">
      <h3 className="text-sm font-semibold mb-2 text-center opacity-90">Classement</h3>
      <div className="space-y-1">
        {entries.slice(0, 5).map((entry) => (
          <div key={entry.userId} className="flex justify-between items-center text-xs leading-tight">
            <span className="flex items-center min-w-0 flex-1">
              <span className="w-6 text-center font-mono text-xs">#{entry.rank}</span>
              <span className="ml-2 truncate opacity-90">{entry.username}</span>
            </span>
            <span className="font-mono font-bold ml-2 text-xs">{entry.score}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-center text-xs opacity-50 py-2">
            Aucun participant
          </div>
        )}
      </div>
    </div>
  );
});

LeaderboardComponent.displayName = 'Leaderboard';

export default LeaderboardComponent;