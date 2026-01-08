/**
 * Tests Composant P1 - Composant Question
 * Tests d'interaction pour l'affichage des questions du quiz
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { Question } from '../../../tiktoklive/components/overlay/Question';

test.describe('Question Component', () => {
  test('[P1] devrait afficher la question et les options correctement', async ({ mount }) => {
    // GIVEN: Données de question
    const questionData = {
      id: 'q1',
      text: 'Quelle est la capitale de la France ?',
      options: ['Paris', 'London', 'Berlin', 'Madrid'],
      correctAnswer: 'Paris',
      difficulty: 'medium',
      timeLimit: 30
    };

    // WHEN: Montage du composant
    const component = await mount(<Question {...questionData} />);

    // THEN: La question est affichée
    await expect(component.locator('[data-testid="question-text"]')).toHaveText(questionData.text);

    // AND: Toutes les options sont affichées
    for (const option of questionData.options) {
      await expect(component.locator('[data-testid="option-text"]')).toContainText(option);
    }

    // AND: Le timer est affiché
    await expect(component.locator('[data-testid="question-timer"]')).toBeVisible();
  });

  test('[P1] devrait afficher la difficulté de la question', async ({ mount }) => {
    // GIVEN: Question avec difficulté
    const questionData = {
      id: 'q2',
      text: 'Question difficile',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      difficulty: 'hard',
      timeLimit: 60
    };

    // WHEN: Montage du composant
    const component = await mount(<Question {...questionData} />);

    // THEN: La difficulté est affichée
    await expect(component.locator('[data-testid="question-difficulty"]')).toHaveText('hard');
  });

  test('[P1] devrait gérer les questions sans options (réponse libre)', async ({ mount }) => {
    // GIVEN: Question à réponse libre
    const questionData = {
      id: 'q3',
      text: 'Quel est le résultat de 2 + 2 ?',
      options: [], // Pas d'options
      correctAnswer: '4',
      difficulty: 'easy',
      timeLimit: 15
    };

    // WHEN: Montage du composant
    const component = await mount(<Question {...questionData} />);

    // THEN: La question est affichée
    await expect(component.locator('[data-testid="question-text"]')).toHaveText(questionData.text);

    // AND: Aucune option n'est affichée
    await expect(component.locator('[data-testid="option-text"]')).toHaveCount(0);

    // AND: Indicateur de réponse libre
    await expect(component.locator('[data-testid="free-response-indicator"]')).toBeVisible();
  });

  test('[P1] devrait mettre à jour le timer en temps réel', async ({ mount }) => {
    // GIVEN: Question avec timer court
    const questionData = {
      id: 'q4',
      text: 'Question rapide',
      options: ['A', 'B'],
      correctAnswer: 'A',
      difficulty: 'easy',
      timeLimit: 5 // 5 secondes
    };

    // WHEN: Montage du composant
    const component = await mount(<Question {...questionData} />);

    // THEN: Timer commence à 5
    await expect(component.locator('[data-testid="timer-display"]')).toHaveText('5');

    // AND: Timer décompte - attente explicite du changement
    await component.waitForFunction((element) => {
      const timerElement = element.querySelector('[data-testid="timer-display"]');
      if (!timerElement) return false;
      const timerValue = parseInt(timerElement.textContent || '0');
      return timerValue < 5 && timerValue >= 1; // Vérifier que le timer a changé
    }, { timeout: 5000 });
    
    const timerText = await component.locator('[data-testid="timer-display"]').textContent();
    const timerValue = parseInt(timerText || '0');
    expect(timerValue).toBeLessThanOrEqual(3); // Entre 1 et 3
    expect(timerValue).toBeGreaterThanOrEqual(1);
  });

  test('[P1] devrait émettre un événement quand le timer expire', async ({ mount }) => {
    // GIVEN: Question avec timer très court
    const questionData = {
      id: 'q5',
      text: 'Question expiring',
      options: ['A', 'B'],
      correctAnswer: 'A',
      difficulty: 'easy',
      timeLimit: 1 // 1 seconde
    };

    // WHEN: Montage du composant et attente de l'expiration
    const component = await mount(<Question {...questionData} />);

    // THEN: Événement d'expiration émis - attente explicite de l'état d'expiration
    // Note: Nécessiterait un mock ou un système d'événements pour tester complètement
    await expect(component.locator('[data-testid="question-expired"]')).toBeVisible({ timeout: 5000 });

    // Vérifier que le composant indique l'expiration
    await expect(component.locator('[data-testid="question-expired"]')).toBeVisible();
  });

  test('[P1] devrait gérer les props manquantes gracieusement', async ({ mount }) => {
    // GIVEN: Props partielles
    const partialQuestionData = {
      id: 'q6',
      text: 'Question avec données partielles'
      // options, correctAnswer, etc. manquants
    };

    // WHEN: Montage avec props partielles
    const component = await mount(<Question {...partialQuestionData} />);

    // THEN: Composant rendu sans crash
    await expect(component.locator('[data-testid="question-text"]')).toHaveText(partialQuestionData.text);

    // AND: Valeurs par défaut utilisées
    await expect(component.locator('[data-testid="question-difficulty"]')).toHaveText('medium'); // Défaut
    await expect(component.locator('[data-testid="timer-display"]')).toHaveText('30'); // Défaut
  });

  test('[P1] devrait être accessible avec la navigation clavier', async ({ mount }) => {
    // GIVEN: Question avec options
    const questionData = {
      id: 'q7',
      text: 'Question accessible',
      options: ['Option A', 'Option B', 'Option C'],
      correctAnswer: 'Option A',
      difficulty: 'medium',
      timeLimit: 30
    };

    // WHEN: Montage du composant
    const component = await mount(<Question {...questionData} />);

    // THEN: Les options sont focusables
    const firstOption = component.locator('[data-testid="option-button"]').first();
    await firstOption.focus();

    // AND: Ont les attributs d'accessibilité corrects
    await expect(firstOption).toHaveAttribute('tabindex', '0');
    await expect(firstOption).toHaveAttribute('role', 'button');
  });

  test('[P1] devrait appliquer les styles corrects selon la difficulté', async ({ mount }) => {
    // GIVEN: Questions de différentes difficultés
    const difficulties = ['easy', 'medium', 'hard'];

    for (const difficulty of difficulties) {
      const questionData = {
        id: `q-${difficulty}`,
        text: `Question ${difficulty}`,
        options: ['A', 'B'],
        correctAnswer: 'A',
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        timeLimit: 30
      };

      // WHEN: Montage du composant
      const component = await mount(<Question {...questionData} />);

      // THEN: Classe CSS appropriée appliquée
      await expect(component.locator('[data-testid="question-container"]'))
        .toHaveClass(new RegExp(`difficulty-${difficulty}`));
    }
  });
});