import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Drives the redesigned /create page:
//   sign in → /create (universal composer + channel section) → Topic chip → Recommend format
//   → Recommended starting point panel → Continue with <format> → seeded creator (?briefCaptureId)
//
// Requires (in .env.local): E2E_CLERK_USER_USERNAME (with password), E2E_CLERK_USER_PASSWORD,
// E2E_WORKSPACE_SLUG. Recommendation makes a real Claude call (~5–30s).

const USERNAME = process.env.E2E_CLERK_USER_USERNAME
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD
const SLUG     = process.env.E2E_WORKSPACE_SLUG

test.describe('Universal create', () => {
  test.skip(!USERNAME || !PASSWORD || !SLUG,
    'Set E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG in .env.local')

  test('idea → recommendation → seeded creator', async ({ page }) => {
    await setupClerkTestingToken({ page })

    await page.goto('/sign-in')
    await clerk.signIn({
      page,
      signInParams: { strategy: 'password', identifier: USERNAME!, password: PASSWORD! },
    })
    // Wait for the Clerk client session to be established before hitting a protected route.
    await page.waitForFunction(() => Boolean((window as unknown as { Clerk?: { user?: unknown } }).Clerk?.user), null, { timeout: 20_000 })

    // ── /create: composer above the channel section ─────────────────────────────
    // Retry once — the server session cookie can lag a beat behind the client sign-in.
    await page.goto(`/${SLUG}/create`)
    if (/sign-in/.test(page.url())) {
      await page.waitForTimeout(1500)
      await page.goto(`/${SLUG}/create`)
    }
    await expect(page.getByRole('heading', { name: 'Create content' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Start from anything' })).toBeVisible()
    await expect(page.getByText('Create for a specific channel')).toBeVisible()
    // New destination-led card labels.
    await expect(page.getByText('Start with LinkedIn')).toBeVisible()
    await page.screenshot({ path: 'e2e/.report/uc-01-create-hub.png', fullPage: true })

    // ── Topic tab: suggestion chip fills the input ──────────────────────────────
    const chip = page.getByRole('button', { name: 'Contrarian take on AI replacing managers' })
    await expect(chip).toBeVisible()
    await chip.click()
    const textarea = page.getByPlaceholder(/why open offices are declining/i)
    await expect(textarea).toHaveValue(/Contrarian take on AI replacing managers/)
    await page.screenshot({ path: 'e2e/.report/uc-02-topic-filled.png', fullPage: true })

    // ── Recommend format → (real Claude call) ───────────────────────────────────
    await page.getByRole('button', { name: /Recommend format/i }).click()
    await expect(page.getByText('Recommended starting point')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(/Best starting point:/i)).toBeVisible()
    await expect(page.getByText('Suggested adaptations')).toBeVisible()
    await page.screenshot({ path: 'e2e/.report/uc-03-recommendation.png', fullPage: true })

    // ── Continue with <format> → seeded creator with ?briefCaptureId ────────────
    await page.getByRole('button', { name: /Continue with/i }).click()
    await expect(page).toHaveURL(/\/create\/[a-z-]+\?briefCaptureId=[0-9a-f-]{36}/, { timeout: 30_000 })
    await page.screenshot({ path: 'e2e/.report/uc-04-seeded-creator.png', fullPage: true })

    // The seeded creator prefilled its source field with the brief text.
    await expect(page.locator('textarea').first()).toHaveValue(/AI replacing managers/i, {
      timeout: 15_000,
    })
  })
})
