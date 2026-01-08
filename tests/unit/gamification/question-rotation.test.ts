/**
 * Tests unitaires pour le service de rotation automatique des questions
 * Story 2.3 - Rotation Automatique des Questions
 * Priorité: P1 (logique métier importante)
 */

import {
  getNextQuestionIndex,
  shouldRotate,
  calculateNextIndex,
  type RotationTrigger,
} from '@/lib/gamification/question-rotation';

describe('Question Rotation Service', () => {
  describe('getNextQuestionIndex', () => {
    test('[P1] devrait retourner l\'index suivant dans un cycle normal', () => {
      // GIVEN: Index actuel 0, total 5 questions
      const currentIndex = 0;
      const totalQuestions = 5;

      // WHEN: Calcul de l'index suivant
      const nextIndex = getNextQuestionIndex(currentIndex, totalQuestions);

      // THEN: Retourne 1
      expect(nextIndex).toBe(1);
    });

    test('[P1] devrait revenir à 0 après la dernière question', () => {
      // GIVEN: Index actuel 4 (dernière question), total 5
      const currentIndex = 4;
      const totalQuestions = 5;

      // WHEN: Calcul de l'index suivant
      const nextIndex = getNextQuestionIndex(currentIndex, totalQuestions);

      // THEN: Retourne 0 (cycle complet)
      expect(nextIndex).toBe(0);
    });

    test('[P1] devrait gérer le cas limite: aucune question disponible', () => {
      // GIVEN: Aucune question disponible
      const currentIndex = 0;
      const totalQuestions = 0;

      // WHEN: Calcul de l'index suivant
      const nextIndex = getNextQuestionIndex(currentIndex, totalQuestions);

      // THEN: Retourne 0 (fallback gracieux)
      expect(nextIndex).toBe(0);
    });

    test('[P1] devrait gérer le cas d\'une seule question', () => {
      // GIVEN: Une seule question disponible
      const currentIndex = 0;
      const totalQuestions = 1;

      // WHEN: Calcul de l'index suivant
      const nextIndex = getNextQuestionIndex(currentIndex, totalQuestions);

      // THEN: Retourne 0 (revient à la même question)
      expect(nextIndex).toBe(0);
    });
  });

  describe('shouldRotate', () => {
    test('[P1] devrait retourner true pour déclencheur "winner"', () => {
      // GIVEN: Déclencheur "winner"
      const trigger: RotationTrigger = 'winner';

      // WHEN: Vérification si rotation nécessaire
      const result = shouldRotate(trigger);

      // THEN: Retourne true
      expect(result).toBe(true);
    });

    test('[P1] devrait retourner true pour déclencheur "timer-expired"', () => {
      // GIVEN: Déclencheur "timer-expired"
      const trigger: RotationTrigger = 'timer-expired';

      // WHEN: Vérification si rotation nécessaire
      const result = shouldRotate(trigger);

      // THEN: Retourne true
      expect(result).toBe(true);
    });
  });

  describe('calculateNextIndex', () => {
    test('[P1] devrait calculer l\'index suivant normalement', () => {
      // GIVEN: Index valide dans la plage
      const currentIndex = 2;
      const totalQuestions = 5;

      // WHEN: Calcul de l'index suivant
      const nextIndex = calculateNextIndex(currentIndex, totalQuestions);

      // THEN: Retourne 3
      expect(nextIndex).toBe(3);
    });

    test('[P1] devrait gérer l\'index négatif (retourne 0)', () => {
      // GIVEN: Index négatif (invalide)
      const currentIndex = -1;
      const totalQuestions = 5;

      // WHEN: Calcul de l'index suivant
      const nextIndex = calculateNextIndex(currentIndex, totalQuestions);

      // THEN: Retourne 0 (fallback gracieux)
      expect(nextIndex).toBe(0);
    });

    test('[P1] devrait gérer l\'index supérieur au total (retourne 0)', () => {
      // GIVEN: Index supérieur au total (invalide)
      const currentIndex = 10;
      const totalQuestions = 5;

      // WHEN: Calcul de l'index suivant
      const nextIndex = calculateNextIndex(currentIndex, totalQuestions);

      // THEN: Retourne 0 (fallback gracieux)
      expect(nextIndex).toBe(0);
    });

    test('[P1] devrait gérer le cas limite: aucune question (retourne 0)', () => {
      // GIVEN: Aucune question disponible
      const currentIndex = 0;
      const totalQuestions = 0;

      // WHEN: Calcul de l'index suivant
      const nextIndex = calculateNextIndex(currentIndex, totalQuestions);

      // THEN: Retourne 0 (fallback gracieux)
      expect(nextIndex).toBe(0);
    });

    test('[P1] devrait compléter le cycle (dernière question → première)', () => {
      // GIVEN: Dernière question du cycle
      const currentIndex = 4;
      const totalQuestions = 5;

      // WHEN: Calcul de l'index suivant
      const nextIndex = calculateNextIndex(currentIndex, totalQuestions);

      // THEN: Retourne 0 (cycle complet)
      expect(nextIndex).toBe(0);
    });
  });
});
