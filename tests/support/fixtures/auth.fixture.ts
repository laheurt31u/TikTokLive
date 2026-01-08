/**
 * Auth fixtures pour tests E2E - utilisateurs authentifiés avec auto-cleanup
 * Utilise les factories de données pour créer des utilisateurs de test
 */

import { test as base } from '@playwright/test';
import { createUser, deleteUser } from '../factories/user.factory';
import type { User } from '../../../tiktoklive/lib/tiktok/types';

/**
 * Interface étendue pour les fixtures auth
 */
interface AuthFixtures {
  authenticatedUser: User;
  adminUser: User;
  moderatorUser: User;
}

/**
 * Fixture pour utilisateur authentifié avec auto-cleanup
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Utilisateur standard authentifié avec auto-cleanup
   */
  authenticatedUser: async ({ page }, use) => {
    // Créer un utilisateur de test via factory
    const user = createUser({
      email: 'testuser@example.com',
      name: 'Test User',
      role: 'user'
    });

    // Setup: Créer l'utilisateur dans le système
    // Note: Dans un vrai système, ceci ferait un appel API ou DB
    console.log(`[Fixture] Création utilisateur authentifié: ${user.email}`);

    // Utiliser dans le test
    await use(user);

    // Cleanup: Supprimer automatiquement l'utilisateur après le test
    console.log(`[Fixture] Nettoyage utilisateur: ${user.email}`);
    await deleteUser(user.id);
  },

  /**
   * Utilisateur administrateur avec auto-cleanup
   */
  adminUser: async ({ page }, use) => {
    const admin = createUser({
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    });

    console.log(`[Fixture] Création utilisateur admin: ${admin.email}`);

    await use(admin);

    console.log(`[Fixture] Nettoyage utilisateur admin: ${admin.email}`);
    await deleteUser(admin.id);
  },

  /**
   * Utilisateur modérateur avec auto-cleanup
   */
  moderatorUser: async ({ page }, use) => {
    const moderator = createUser({
      email: 'moderator@example.com',
      name: 'Moderator User',
      role: 'moderator'
    });

    console.log(`[Fixture] Création utilisateur modérateur: ${moderator.email}`);

    await use(moderator);

    console.log(`[Fixture] Nettoyage utilisateur modérateur: ${moderator.email}`);
    await deleteUser(moderator.id);
  },
});

/**
 * Fixture spécialisée pour les tests de connexion TikTok
 */
export const tiktokTest = base.extend({
  /**
   * Session TikTok mockée pour les tests
   */
  mockTikTokSession: async ({}, use) => {
    const sessionData = {
      sessionId: 'test-session-123',
      cookies: 'mock-session-cookie=value123',
      userId: 'tiktok-user-456',
      username: 'testuser'
    };

    console.log(`[Fixture] Création session TikTok mockée: ${sessionData.sessionId}`);

    await use(sessionData);

    console.log(`[Fixture] Nettoyage session TikTok: ${sessionData.sessionId}`);
  }
});