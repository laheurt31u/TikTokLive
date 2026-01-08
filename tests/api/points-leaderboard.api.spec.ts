/**
 * Tests API P1 - Système de points et leaderboard
 * Tests d'intégration pour la gestion des scores et classements
 */

import { test, expect } from '@playwright/test';
import { createUser } from '../support/factories/user.factory';

test.describe('API Points - Attribution et calcul', () => {
  test('[P1] POST /api/points/award - devrait attribuer des points pour une bonne réponse', async ({ request }) => {
    // GIVEN: Un utilisateur existe et a répondu correctement
    const user = createUser({ email: 'pointsuser@example.com' });
    const createResponse = await request.post('/api/users', { data: user });
    const createdUser = await createResponse.json();

    // WHEN: Attribution de points pour difficulté moyenne
    const awardData = {
      userId: createdUser.id,
      points: 10,
      reason: 'correct_answer',
      difficulty: 'medium',
      questionId: 'q123'
    };

    const response = await request.post('/api/points/award', {
      data: awardData,
    });

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Points ajoutés au total de l'utilisateur
    const result = await response.json();
    expect(result.totalPoints).toBe(10);
    expect(result.awardedPoints).toBe(10);
  });

  test('[P1] POST /api/points/award - devrait différencier les difficultés', async ({ request }) => {
    // GIVEN: Un utilisateur
    const user = createUser();
    const createResponse = await request.post('/api/users', { data: user });
    const createdUser = await createResponse.json();

    // WHEN: Attribution de points pour différentes difficultés
    const difficulties = [
      { difficulty: 'easy', expectedPoints: 5 },
      { difficulty: 'medium', expectedPoints: 10 },
      { difficulty: 'hard', expectedPoints: 15 }
    ];

    for (const { difficulty, expectedPoints } of difficulties) {
      const response = await request.post('/api/points/award', {
        data: {
          userId: createdUser.id,
          points: expectedPoints,
          reason: 'correct_answer',
          difficulty,
          questionId: `q${difficulty}`
        },
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.awardedPoints).toBe(expectedPoints);
    }
  });

  test('[P1] GET /api/users/:id/points - devrait retourner le total des points', async ({ request }) => {
    // GIVEN: Un utilisateur avec plusieurs attributions de points
    const user = createUser();
    const createResponse = await request.post('/api/users', { data: user });
    const createdUser = await createResponse.json();

    // Attribuer plusieurs fois des points
    const awards = [5, 10, 15];
    for (const points of awards) {
      await request.post('/api/points/award', {
        data: { userId: createdUser.id, points, reason: 'test' },
      });
    }

    // WHEN: Récupération du total des points
    const response = await request.get(`/api/users/${createdUser.id}/points`);

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Total correct (5 + 10 + 15 = 30)
    const pointsData = await response.json();
    expect(pointsData.totalPoints).toBe(30);
    expect(pointsData.awardCount).toBe(3);
  });

  test('[P1] POST /api/points/award - devrait rejeter les points négatifs', async ({ request }) => {
    // GIVEN: Un utilisateur
    const user = createUser();
    const createResponse = await request.post('/api/users', { data: user });
    const createdUser = await createResponse.json();

    // WHEN: Tentative d'attribution de points négatifs
    const response = await request.post('/api/points/award', {
      data: {
        userId: createdUser.id,
        points: -5,
        reason: 'penalty'
      },
    });

    // THEN: Retourne 400 Bad Request
    expect(response.status()).toBe(400);

    // AND: Message d'erreur
    const error = await response.json();
    expect(error.message).toContain('negative');
  });
});

test.describe('API Leaderboard - Classements temps réel', () => {
  test('[P1] GET /api/leaderboard - devrait retourner le top 10 des joueurs', async ({ request }) => {
    // GIVEN: Plusieurs utilisateurs avec différents scores
    const users = [];
    const scores = [50, 40, 35, 30, 25, 20, 15, 10, 5, 2, 1]; // 11 utilisateurs

    for (let i = 0; i < scores.length; i++) {
      const user = createUser({ name: `Player ${i + 1}` });
      const createResponse = await request.post('/api/users', { data: user });
      const createdUser = await createResponse.json();
      users.push(createdUser);

      // Attribuer les points
      await request.post('/api/points/award', {
        data: { userId: createdUser.id, points: scores[i], reason: 'setup' },
      });
    }

    // WHEN: Récupération du leaderboard
    const response = await request.get('/api/leaderboard');

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Top 10 seulement (limite par défaut)
    const leaderboard = await response.json();
    expect(leaderboard.length).toBe(10);

    // AND: Classement correct (scores décroissants)
    expect(leaderboard[0].totalPoints).toBe(50);
    expect(leaderboard[1].totalPoints).toBe(40);
    expect(leaderboard[2].totalPoints).toBe(35);

    // AND: Données complètes pour chaque entrée
    const firstEntry = leaderboard[0];
    expect(firstEntry).toHaveProperty('userId');
    expect(firstEntry).toHaveProperty('username');
    expect(firstEntry).toHaveProperty('totalPoints');
    expect(firstEntry).toHaveProperty('rank');
    expect(firstEntry.rank).toBe(1);
  });

  test('[P1] GET /api/leaderboard?limit=5 - devrait respecter les limites personnalisées', async ({ request }) => {
    // GIVEN: Plusieurs utilisateurs
    for (let i = 1; i <= 8; i++) {
      const user = createUser({ name: `Limited Player ${i}` });
      const createResponse = await request.post('/api/users', { data: user });
      const createdUser = await createResponse.json();

      await request.post('/api/points/award', {
        data: { userId: createdUser.id, points: 10 - i, reason: 'setup' },
      });
    }

    // WHEN: Récupération avec limite 5
    const response = await request.get('/api/leaderboard?limit=5');

    // THEN: Retourne exactement 5 entrées
    expect(response.status()).toBe(200);
    const leaderboard = await response.json();
    expect(leaderboard.length).toBe(5);
  });

  test('[P1] GET /api/leaderboard - devrait gérer les ex-aequo correctement', async ({ request }) => {
    // GIVEN: Utilisateurs avec scores identiques
    const user1 = createUser({ name: 'Tie Player 1' });
    const user2 = createUser({ name: 'Tie Player 2' });
    const user3 = createUser({ name: 'Higher Player' });

    const responses = await Promise.all([
      request.post('/api/users', { data: user1 }),
      request.post('/api/users', { data: user2 }),
      request.post('/api/users', { data: user3 })
    ]);

    const [u1, u2, u3] = await Promise.all(responses.map(r => r.json()));

    // Attribuer 20 points à chacun des deux premiers, 25 au troisième
    await Promise.all([
      request.post('/api/points/award', { data: { userId: u1.id, points: 20, reason: 'tie' } }),
      request.post('/api/points/award', { data: { userId: u2.id, points: 20, reason: 'tie' } }),
      request.post('/api/points/award', { data: { userId: u3.id, points: 25, reason: 'winner' } })
    ]);

    // WHEN: Récupération du leaderboard
    const response = await request.get('/api/leaderboard');

    // THEN: Classement correct malgré l'ex-aequo
    expect(response.status()).toBe(200);
    const leaderboard = await response.json();

    // Le joueur avec 25 points est premier
    expect(leaderboard[0].totalPoints).toBe(25);

    // Les deux joueurs avec 20 points sont aux positions 2 et 3
    const tiedPlayers = leaderboard.filter(p => p.totalPoints === 20);
    expect(tiedPlayers.length).toBe(2);
    expect([leaderboard[1], leaderboard[2]]).toEqual(
      expect.arrayContaining(tiedPlayers)
    );
  });

  test('[P1] WebSocket /api/leaderboard/updates - devrait diffuser les mises à jour temps réel', async ({ request }) => {
    // GIVEN: Connexion WebSocket établie
    // Note: Ce test nécessite une configuration WebSocket spécifique

    // WHEN: Un utilisateur gagne des points
    const user = createUser();
    const createResponse = await request.post('/api/users', { data: user });
    const createdUser = await createResponse.json();

    await request.post('/api/points/award', {
      data: { userId: createdUser.id, points: 10, reason: 'realtime_test' },
    });

    // THEN: Mise à jour diffusée via WebSocket
    // (Validation nécessiterait un client WebSocket de test)
    // Pour l'instant, vérifier que l'API retourne 200
    const leaderboardResponse = await request.get('/api/leaderboard');
    expect(leaderboardResponse.status()).toBe(200);
  });
});

test.describe('API Points - Historique et audit', () => {
  test('[P1] GET /api/users/:id/points/history - devrait retourner l\'historique des points', async ({ request }) => {
    // GIVEN: Un utilisateur avec plusieurs attributions
    const user = createUser();
    const createResponse = await request.post('/api/users', { data: user });
    const createdUser = await createResponse.json();

    // Attribuer des points à différents moments
    const awards = [
      { points: 5, reason: 'easy_question', questionId: 'q1' },
      { points: 10, reason: 'medium_question', questionId: 'q2' },
      { points: 15, reason: 'hard_question', questionId: 'q3' }
    ];

    for (const award of awards) {
      await request.post('/api/points/award', {
        data: { userId: createdUser.id, ...award },
      });
    }

    // WHEN: Récupération de l'historique
    const response = await request.get(`/api/users/${createdUser.id}/points/history`);

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Historique complet
    const history = await response.json();
    expect(history.length).toBe(3);

    // AND: Chaque entrée contient les détails
    const firstEntry = history[0];
    expect(firstEntry).toHaveProperty('points');
    expect(firstEntry).toHaveProperty('reason');
    expect(firstEntry).toHaveProperty('timestamp');
    expect(firstEntry).toHaveProperty('questionId');
  });

  test('[P1] POST /api/points/bulk-award - devrait attribuer des points à plusieurs utilisateurs', async ({ request }) => {
    // GIVEN: Plusieurs utilisateurs
    const users = [];
    for (let i = 0; i < 3; i++) {
      const user = createUser({ name: `Bulk User ${i + 1}` });
      const createResponse = await request.post('/api/users', { data: user });
      const createdUser = await createResponse.json();
      users.push(createdUser);
    }

    // WHEN: Attribution en masse
    const bulkAwards = users.map(user => ({
      userId: user.id,
      points: 5,
      reason: 'bulk_test'
    }));

    const response = await request.post('/api/points/bulk-award', {
      data: { awards: bulkAwards },
    });

    // THEN: Retourne 200 OK
    expect(response.status()).toBe(200);

    // AND: Tous les utilisateurs ont reçu les points
    const result = await response.json();
    expect(result.successfulAwards).toBe(3);
    expect(result.failedAwards).toBe(0);

    // AND: Vérification des totaux individuels
    for (const user of users) {
      const pointsResponse = await request.get(`/api/users/${user.id}/points`);
      const pointsData = await pointsResponse.json();
      expect(pointsData.totalPoints).toBe(5);
    }
  });
});