/**
 * Factory pour créer des entrées de leaderboard avec données dynamiques
 * Utilise faker pour éviter les collisions et générer des données réalistes
 */

import { faker } from '@faker-js/faker';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  avatar: string;
  isNew?: boolean;
}

/**
 * Crée une entrée de leaderboard avec des valeurs par défaut réalistes
 */
export const createLeaderboardEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  rank: faker.number.int({ min: 1, max: 10 }),
  username: faker.internet.userName(),
  points: faker.number.int({ min: 0, max: 10000 }),
  avatar: faker.image.avatar(),
  isNew: false,
  ...overrides,
});

/**
 * Crée plusieurs entrées de leaderboard
 */
export const createLeaderboardEntries = (count: number): LeaderboardEntry[] =>
  Array.from({ length: count }, (_, index) => 
    createLeaderboardEntry({ 
      rank: index + 1,
      points: 10000 - (index * 500), // Points décroissants pour top 10
    })
  );

/**
 * Crée un top 10 complet avec points décroissants
 */
export const createTop10 = (): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < 10; i++) {
    entries.push(createLeaderboardEntry({
      rank: i + 1,
      points: 10000 - (i * 500),
      username: `User${i + 1}`,
    }));
  }
  return entries;
};

/**
 * Crée une entrée de leaderboard avec indicateur "nouveau"
 */
export const createNewLeaderboardEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry =>
  createLeaderboardEntry({
    isNew: true,
    ...overrides,
  });
