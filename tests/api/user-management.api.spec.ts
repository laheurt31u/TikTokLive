/**
 * Tests API P1 - Gestion des utilisateurs
 * Tests d'intégration pour les opérations CRUD utilisateurs
 */

import { test, expect } from '@playwright/test';
import { createUser, createUsers } from '../support/factories/user.factory';

test.describe('API Utilisateur - Gestion des comptes', () => {
  test('[P1] POST /api/users - devrait créer un nouvel utilisateur avec données valides', async ({ request }) => {
    // GIVEN: Données d'utilisateur valides
    const userData = createUser({
      email: 'newuser@example.com',
      name: 'Jean Dupont'
    });

    // WHEN: Création de l'utilisateur via API
    const response = await request.post('/api/users', {
      data: userData,
    });

    // THEN: Retourne 201 Created
    expect(response.status()).toBe(201);

    // AND: Retourne les données de l'utilisateur créé
    const createdUser = await response.json();
    expect(createdUser).toHaveProperty('id');
    expect(createdUser.email).toBe(userData.email);
    expect(createdUser.name).toBe(userData.name);
    expect(createdUser.role).toBe('user');
    expect(createdUser.isActive).toBe(true);
  });

  test('[P1] POST /api/users - devrait rejeter les emails dupliqués', async ({ request }) => {
    // GIVEN: Un utilisateur existe déjà
    const existingUser = createUser({ email: 'duplicate@example.com' });
    await request.post('/api/users', { data: existingUser });

    // WHEN: Tentative de créer un utilisateur avec le même email
    const duplicateUser = createUser({ email: 'duplicate@example.com' });
    const response = await request.post('/api/users', {
      data: duplicateUser,
    });

    // THEN: Retourne 409 Conflict
    expect(response.status()).toBe(409);

    // AND: Message d'erreur approprié
    const error = await response.json();
    expect(error.message).toContain('email');
    expect(error.message).toContain('exist');
  });

  test('[P1] GET /api/users/:id - devrait retourner les détails d\'un utilisateur', async ({ request }) => {
    // GIVEN: Un utilisateur existe
    const userData = createUser();
    const createResponse = await request.post('/api/users', { data: userData });
    const createdUser = await createResponse.json();

    // WHEN: Récupération des détails de l'utilisateur
    const response = await request.get(`/api/users/${createdUser.id}`);

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Données complètes de l'utilisateur
    const user = await response.json();
    expect(user.id).toBe(createdUser.id);
    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);
    expect(user.createdAt).toBeTruthy();
  });

  test('[P1] PUT /api/users/:id - devrait mettre à jour les informations utilisateur', async ({ request }) => {
    // GIVEN: Un utilisateur existe
    const userData = createUser();
    const createResponse = await request.post('/api/users', { data: userData });
    const createdUser = await createResponse.json();

    // WHEN: Mise à jour des informations
    const updateData = {
      name: 'Nouveau Nom',
      isActive: false
    };
    const response = await request.put(`/api/users/${createdUser.id}`, {
      data: updateData,
    });

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Données mises à jour
    const updatedUser = await response.json();
    expect(updatedUser.name).toBe('Nouveau Nom');
    expect(updatedUser.isActive).toBe(false);
    expect(updatedUser.email).toBe(userData.email); // Email inchangé
  });

  test('[P1] DELETE /api/users/:id - devrait supprimer un utilisateur', async ({ request }) => {
    // GIVEN: Un utilisateur existe
    const userData = createUser();
    const createResponse = await request.post('/api/users', { data: userData });
    const createdUser = await createResponse.json();

    // WHEN: Suppression de l'utilisateur
    const response = await request.delete(`/api/users/${createdUser.id}`);

    // THEN: Retourne 204 No Content
    expect(response.status()).toBe(204);

    // AND: L'utilisateur n'existe plus
    const getResponse = await request.get(`/api/users/${createdUser.id}`);
    expect(getResponse.status()).toBe(404);
  });
});

test.describe('API Utilisateur - Authentification', () => {
  test('[P1] POST /api/auth/login - devrait retourner token JWT pour credentials valides', async ({ request }) => {
    // GIVEN: Un utilisateur enregistré avec mot de passe
    const userData = createUser({
      email: 'authuser@example.com',
      password: 'SecurePass123!'
    });
    await request.post('/api/users', { data: userData });

    // WHEN: Tentative de connexion avec credentials corrects
    const loginData = {
      email: userData.email,
      password: userData.password
    };
    const response = await request.post('/api/auth/login', {
      data: loginData,
    });

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Retourne un token JWT
    const authResponse = await response.json();
    expect(authResponse).toHaveProperty('token');
    expect(authResponse.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/); // Format JWT

    // AND: Informations utilisateur de base
    expect(authResponse.user).toHaveProperty('id');
    expect(authResponse.user.email).toBe(userData.email);
  });

  test('[P1] POST /api/auth/login - devrait rejeter credentials invalides', async ({ request }) => {
    // GIVEN: Un utilisateur existe
    const userData = createUser({ email: 'authuser2@example.com' });
    await request.post('/api/users', { data: userData });

    // WHEN: Tentative de connexion avec mot de passe incorrect
    const loginData = {
      email: userData.email,
      password: 'wrongpassword'
    };
    const response = await request.post('/api/auth/login', {
      data: loginData,
    });

    // THEN: Retourne 401 Unauthorized
    expect(response.status()).toBe(401);

    // AND: Message d'erreur
    const error = await response.json();
    expect(error.message).toContain('invalid');
  });

  test('[P1] POST /api/auth/login - devrait valider les champs requis', async ({ request }) => {
    // WHEN: Tentative de connexion sans email
    const response = await request.post('/api/auth/login', {
      data: { password: 'password123' },
    });

    // THEN: Retourne 400 Bad Request
    expect(response.status()).toBe(400);

    // AND: Erreurs de validation
    const error = await response.json();
    expect(error.errors).toContainEqual(
      expect.objectContaining({ field: 'email', message: expect.stringContaining('required') })
    );
  });

  test('[P1] POST /api/auth/refresh - devrait renouveler un token valide', async ({ request }) => {
    // GIVEN: Un utilisateur connecté avec un token valide
    const userData = createUser({ email: 'refreshtest@example.com' });
    await request.post('/api/users', { data: userData });

    const loginResponse = await request.post('/api/auth/login', {
      data: { email: userData.email, password: userData.password },
    });
    const { token: originalToken } = await loginResponse.json();

    // WHEN: Renouvellement du token
    const response = await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${originalToken}` },
    });

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Nouveau token différent
    const refreshResponse = await response.json();
    expect(refreshResponse).toHaveProperty('token');
    expect(refreshResponse.token).not.toBe(originalToken);
  });
});

test.describe('API Utilisateur - Gestion des rôles', () => {
  test('[P1] POST /api/users - devrait créer un administrateur avec le bon rôle', async ({ request }) => {
    // GIVEN: Données pour un administrateur
    const adminData = createUser({
      email: 'admin@example.com',
      role: 'admin'
    });

    // WHEN: Création de l'administrateur
    const response = await request.post('/api/users', {
      data: adminData,
    });

    // THEN: Retourne 201 Created
    expect(response.status()).toBe(201);

    // AND: Rôle admin correctement assigné
    const createdAdmin = await response.json();
    expect(createdAdmin.role).toBe('admin');
  });

  test('[P1] GET /api/users - devrait filtrer par rôle pour les admins', async ({ request }) => {
    // GIVEN: Plusieurs utilisateurs avec différents rôles
    const users = [
      createUser({ role: 'user' }),
      createUser({ role: 'admin' }),
      createUser({ role: 'moderator' }),
      createUser({ role: 'user' })
    ];

    for (const user of users) {
      await request.post('/api/users', { data: user });
    }

    // WHEN: Un admin demande la liste filtrée par rôle
    const response = await request.get('/api/users?role=admin');

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Seulement les admins
    const admins = await response.json();
    expect(admins.length).toBe(1);
    expect(admins[0].role).toBe('admin');
  });
});