import { defineConfig, devices } from '@playwright/test';

const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const port = process.env.PLAYWRIGHT_PORT ?? '4173';
const localBaseUrl = `http://${host}:${port}`;
const baseURL = process.env.BASE_URL ?? localBaseUrl;
const shouldStartLocalPreview = !process.env.BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /.*mobile-navigation\.spec\.ts/,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testMatch: /.*mobile-navigation\.spec\.ts/,
    },
  ],
  webServer: shouldStartLocalPreview
    ? {
        command: `npx cross-env NODE_ENV=production PORT=${port} ALLOW_IN_MEMORY_DATABASE=true SEED_DEMO_DATA=true node dist-server/index.js`,
        url: localBaseUrl,
        reuseExistingServer: false,
      }
    : undefined,
});
