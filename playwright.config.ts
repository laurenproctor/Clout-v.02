import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Next.js stores secrets in .env.local; load it so clerkSetup() + the specs see
// CLERK_SECRET_KEY, the publishable key, and the E2E_* test-user vars.
dotenv.config({ path: '.env.local' })

// E2E config for driving the real app (Next.js + Clerk auth) headlessly.
// Auth is handled by @clerk/testing — see e2e/global.setup.ts (clerkSetup) and the
// per-test setupClerkTestingToken + programmatic sign-in in the specs.
const PORT = process.env.E2E_PORT ?? '3000'
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // Generation makes a real Claude call, so give specs room and don't parallelize auth.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  // Reuse a dev server if one is already up; otherwise start one.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
