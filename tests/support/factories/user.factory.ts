/**
 * Factory pour créer des utilisateurs de test avec données dynamiques
 * Utilise faker pour éviter les collisions et générer des données réalistes
 */

import { faker } from '@faker-js/faker';
import type { User } from '../../../tiktoklive/lib/tiktok/types';

/**
 * Crée un utilisateur de test avec des valeurs par défaut réalistes
 */
export const createUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'user',
  createdAt: faker.date.recent().toISOString(),
  isActive: true,
  ...overrides,
});

/**
 * Crée plusieurs utilisateurs de test
 */
export const createUsers = (count: number): User[] =>
  Array.from({ length: count }, () => createUser());

/**
 * Crée un utilisateur administrateur
 */
export const createAdminUser = (overrides: Partial<User> = {}): User =>
  createUser({
    role: 'admin',
    email: faker.internet.email({ provider: 'admin.example.com' }),
    name: faker.person.fullName(),
    ...overrides,
  });

/**
 * Crée un utilisateur modérateur
 */
export const createModeratorUser = (overrides: Partial<User> = {}): User =>
  createUser({
    role: 'moderator',
    email: faker.internet.email({ provider: 'mod.example.com' }),
    name: faker.person.fullName(),
    ...overrides,
  });

/**
 * Fonction de cleanup pour supprimer un utilisateur
 * Dans un vrai système, ceci ferait un appel API ou DB
 */
export const deleteUser = async (userId: string): Promise<void> => {
  // Simulation d'appel API pour cleanup
  console.log(`[Factory] Suppression utilisateur: ${userId}`);

  // Dans un vrai système:
  // await fetch(`/api/users/${userId}`, { method: 'DELETE' });

  // Pour les tests, pas besoin de délai artificiel - retour immédiat
  return Promise.resolve();
};

/**
 * Fonction de cleanup pour supprimer plusieurs utilisateurs
 */
export const deleteUsers = async (users: User[]): Promise<void> => {
  await Promise.all(users.map(user => deleteUser(user.id)));
};