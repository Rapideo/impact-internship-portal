import 'dotenv/config';
import { config } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

config({ path: '.env.test', override: false });

const PORT = 5173;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Limit local concurrency to 2 workers. The default (`undefined` → ~10
  // workers) overloads the single-process Vite dev server and triggers
  // intermittent `/login` regressions on Windows: parallel sign-in actions
  // race against Supabase Auth's session-cookie issuance and the new auth
  // cookies sometimes don't get attached before the next loader runs.
  // Two workers is the sweet spot — finishes in ~90s but every spec stays
  // green. CI uses workers:1 for the same reason but more strictly.
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
