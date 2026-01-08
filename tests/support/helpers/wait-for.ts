/**
 * Helper pour attendre des conditions complexes avec timeout
 * Utilise un polling intelligent au lieu de sleep()
 */

import { Page } from '@playwright/test';

/**
 * Attend qu'une condition soit vraie avec timeout et intervalle configurables
 */
export const waitFor = async (
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100,
  description: string = 'condition'
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) {
        return;
      }
    } catch (error) {
      // Continue polling même en cas d'erreur temporaire
      console.debug(`[WaitFor] Erreur temporaire pendant l'attente de ${description}:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition non remplie dans ${timeout}ms: ${description}`);
};

/**
 * Attend qu'un élément soit visible et interactif
 */
export const waitForElement = async (
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> => {
  await waitFor(
    async () => {
      const element = page.locator(selector);
      return await element.isVisible();
    },
    timeout,
    100,
    `élément visible: ${selector}`
  );
};

/**
 * Attend qu'un élément disparaisse
 */
export const waitForElementToDisappear = async (
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> => {
  await waitFor(
    async () => {
      const element = page.locator(selector);
      return !(await element.isVisible());
    },
    timeout,
    100,
    `élément disparu: ${selector}`
  );
};

/**
 * Attend qu'un texte apparaisse sur la page
 */
export const waitForText = async (
  page: Page,
  text: string,
  timeout: number = 5000
): Promise<void> => {
  await waitFor(
    async () => {
      const content = await page.textContent('body');
      return content?.includes(text) ?? false;
    },
    timeout,
    100,
    `texte présent: "${text}"`
  );
};

/**
 * Attend une réponse réseau spécifique
 */
export const waitForNetworkResponse = async (
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> => {
  let responseReceived = false;

  const responsePromise = page.waitForResponse(urlPattern, { timeout });
  responsePromise.then(() => {
    responseReceived = true;
  }).catch(() => {
    // Timeout géré par waitFor
  });

  await waitFor(
    async () => responseReceived,
    timeout,
    100,
    `réponse réseau: ${urlPattern}`
  );
};

/**
 * Attend que le nombre d'éléments change
 */
export const waitForElementCount = async (
  page: Page,
  selector: string,
  expectedCount: number,
  timeout: number = 5000
): Promise<void> => {
  await waitFor(
    async () => {
      const elements = page.locator(selector);
      const count = await elements.count();
      return count === expectedCount;
    },
    timeout,
    100,
    `nombre d'éléments ${selector}: ${expectedCount}`
  );
};