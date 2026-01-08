/**
 * Tests de composant P1 - QuestionDisplay
 * Tests du comportement UI du composant d'affichage de question
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { QuestionDisplay } from '@/components/overlay/QuestionDisplay';

test.describe('QuestionDisplay Component', () => {
  test('[P1] devrait afficher la question correctement', async ({ mount }) => {
    // GIVEN: QuestionDisplay est monté avec une question
    const component = await mount(
      <QuestionDisplay
        question="Quelle est la capitale de la France ?"
        timeLeft={30}
        totalTime={30}
        status="active"
      />
    );

    // THEN: Le texte de la question est visible
    await expect(component.getByText('Quelle est la capitale de la France ?')).toBeVisible();

    // AND: Le timer affiche la valeur correcte
    await expect(component.locator('[data-testid="timer-value"]')).toContainText('30');

    // AND: Le status 'active' applique le style cyan (vérifier via classes CSS)
    const timerCircle = component.locator('svg circle').nth(1); // Progress circle
    await expect(timerCircle).toHaveAttribute('stroke', expect.stringContaining('cyan'));
  });

  test('[P1] devrait afficher le timer qui décroît correctement', async ({ mount }) => {
    // GIVEN: QuestionDisplay est monté avec timeLeft initial
    const component = await mount(
      <QuestionDisplay
        question="Test question"
        timeLeft={25}
        totalTime={30}
        status="active"
      />
    );

    // THEN: Le timer affiche timeLeft correctement
    await expect(component.locator('[data-testid="timer-value"]')).toContainText('25');

    // AND: La progress bar se remplit progressivement
    const progress = ((30 - 25) / 30) * 100; // 16.67%
    const progressBar = component.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveCSS('width', expect.stringContaining(`${progress}%`));
  });

  test('[P1] devrait afficher l\'indicateur urgent quand timeLeft < 10', async ({ mount }) => {
    // GIVEN: QuestionDisplay est monté avec timeLeft < 10
    const component = await mount(
      <QuestionDisplay
        question="Test question"
        timeLeft={8}
        totalTime={30}
        status="urgent"
      />
    );

    // THEN: L'indicateur urgent est visible
    await expect(component.getByText('DÉPÊCHEZ-VOUS !')).toBeVisible();

    // AND: Le style magenta est appliqué (status urgent)
    const timerCircle = component.locator('svg circle').nth(1);
    await expect(timerCircle).toHaveAttribute('stroke', expect.stringContaining('magenta'));

    // AND: L'animation de glitch est présente
    const glitchEffect = component.locator('.animate-\\[glitch-skew_0\\.3s_ease-in-out_infinite\\]');
    await expect(glitchEffect).toBeVisible();
  });

  test('[P1] devrait appliquer le status urgent automatiquement quand timeLeft < 10', async ({ mount }) => {
    // GIVEN: QuestionDisplay est monté avec timeLeft < 10 mais status='active'
    const component = await mount(
      <QuestionDisplay
        question="Test question"
        timeLeft={5}
        totalTime={30}
        status="active"
      />
    );

    // THEN: L'indicateur urgent apparaît quand même (logique interne)
    await expect(component.getByText('DÉPÊCHEZ-VOUS !')).toBeVisible();
  });
});
