import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'production',
      testIgnore: 'fixture-matrix.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4321',
      },
    },
    {
      name: 'fixture-matrix',
      testMatch: 'fixture-matrix.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4322',
      },
    },
  ],
  webServer: [
    {
      command: 'exec env -u NO_COLOR node --import tsx scripts/serve-static-build.ts dist 4321',
      url: 'http://127.0.0.1:4321',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'exec env -u NO_COLOR node --import tsx scripts/serve-static-build.ts .e2e-dist 4322',
      url: 'http://127.0.0.1:4322',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
