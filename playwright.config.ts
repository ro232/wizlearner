import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests: the site used the way people use it, on phone, tablet and computer,
 * in the engines of Chrome, Safari and Firefox. Run after `npm run build`:
 *   npm run e2e                 (every browser; CI)
 *   npm run e2e -- --project=pc-chrome
 */
const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ro-RO',
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'pc-chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'phone-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'phone-safari', use: { ...devices['iPhone 13'] } },
    { name: 'tablet-safari', use: { ...devices['iPad (gen 7)'] } },
    { name: 'pc-firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
