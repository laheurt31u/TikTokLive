/**
 * Tests de composant P1 - TimePressure
 * Tests du comportement UI du composant d'indicateur de pression temporelle
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { TimePressure } from '@/components/overlay/TimePressure';

test.describe('TimePressure Component', () => {
  test('[P1] devrait afficher l\'intensité "low" avec style vert', async ({ mount }) => {
    // GIVEN: TimePressure est monté avec intensity='low'
    const component = await mount(
      <TimePressure
        timeLeft={25}
        totalTime={30}
        intensity="low"
      />
    );

    // THEN: Le style vert est appliqué
    const pressureIndicator = component.locator('[data-testid="pressure-indicator"]');
    await expect(pressureIndicator).toHaveClass(/neon-green/);
    await expect(pressureIndicator).not.toHaveClass(/neon-yellow/);
    await expect(pressureIndicator).not.toHaveClass(/neon-red/);
  });

  test('[P1] devrait afficher l\'intensité "medium" avec style jaune', async ({ mount }) => {
    // GIVEN: TimePressure est monté avec intensity='medium'
    const component = await mount(
      <TimePressure
        timeLeft={15}
        totalTime={30}
        intensity="medium"
      />
    );

    // THEN: Le style jaune est appliqué
    const pressureIndicator = component.locator('[data-testid="pressure-indicator"]');
    await expect(pressureIndicator).toHaveClass(/neon-yellow/);
    await expect(pressureIndicator).not.toHaveClass(/neon-green/);
    await expect(pressureIndicator).not.toHaveClass(/neon-red/);
  });

  test('[P1] devrait afficher l\'intensité "high" avec style rouge et animation', async ({ mount }) => {
    // GIVEN: TimePressure est monté avec intensity='high'
    const component = await mount(
      <TimePressure
        timeLeft={5}
        totalTime={30}
        intensity="high"
      />
    );

    // THEN: Le style rouge est appliqué
    const pressureIndicator = component.locator('[data-testid="pressure-indicator"]');
    await expect(pressureIndicator).toHaveClass(/neon-red/);
    await expect(pressureIndicator).not.toHaveClass(/neon-green/);
    await expect(pressureIndicator).not.toHaveClass(/neon-yellow/);

    // AND: L'animation de pulse est présente
    await expect(pressureIndicator).toHaveClass(/animate-pulse/);
  });
});
