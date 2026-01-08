import { defineConfig, devices } from '@playwright/experimental-ct-react';

/**
 * Configuration Playwright Component Testing
 * Pour les tests de composants React
 */
export default defineConfig({
  testDir: './tests/component',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  timeout: 30 * 1000, // Test timeout: 30s
  expect: {
    timeout: 10 * 1000, // Assertion timeout: 10s
  },

  use: {
    ctPort: 3100,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  reporter: [['html', { outputFolder: 'playwright-report-ct' }], ['list']],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
