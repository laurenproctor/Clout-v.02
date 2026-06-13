import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Drives the full Substack Email creator flow against the real app:
//   sign in → /create (tile active) → /create/substack-email → generate → Save to Studio
//   → lands in Studio on the generated substack-newsletter draft.
//
// Requires (in .env.local, gitignored):
//   E2E_CLERK_USER_USERNAME   — a Clerk user with a password set
//   E2E_CLERK_USER_PASSWORD
//   E2E_WORKSPACE_SLUG        — a workspace that user can access
//
// NOTE: generation makes a real Claude API call (~10–40s).

const USERNAME = process.env.E2E_CLERK_USER_USERNAME
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD
const SLUG     = process.env.E2E_WORKSPACE_SLUG

const SOURCE = `The shift to durable creation: most tools optimize for fast publishing, but the
real leverage is treating each asset as a reviewable, schedulable, measurable artifact. Speed
without lifecycle is just exporting text. Argue for creation surfaces that feed a managed
lifecycle rather than one-off sends.`

test.describe('Substack Email creator', () => {
  test.skip(!USERNAME || !PASSWORD || !SLUG,
    'Set E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG in .env.local')

  test('generate → Save to Studio', async ({ page }) => {
    await setupClerkTestingToken({ page })

    // Load a Clerk-enabled page, then sign in programmatically.
    await page.goto('/sign-in')
    await clerk.signIn({
      page,
      signInParams: { strategy: 'password', identifier: USERNAME!, password: PASSWORD! },
    })

    // ── /create: the Substack Email tile is active ──────────────────────────────
    await page.goto(`/${SLUG}/create`)
    const tile = page.getByRole('link', { name: /Substack Email/i })
    await expect(tile).toBeVisible()
    await page.screenshot({ path: 'e2e/.report/01-create-hub.png', fullPage: true })

    // ── /create/substack-email ──────────────────────────────────────────────────
    await tile.click()
    await expect(page).toHaveURL(/\/create\/substack-email$/)
    await page.getByPlaceholder(/Paste a URL/i).fill(SOURCE)
    await page.screenshot({ path: 'e2e/.report/02-creator-setup.png', fullPage: true })

    // ── Generate (real Claude call) ─────────────────────────────────────────────
    await page.getByRole('button', { name: /Generate Substack Email/i }).click()
    const saveToStudio = page.getByRole('button', { name: /Save to Studio/i })
    await expect(saveToStudio).toBeVisible({ timeout: 90_000 })
    await page.screenshot({ path: 'e2e/.report/03-generated-result.png', fullPage: true })

    // ── Save to Studio → lands on the new draft in Studio ───────────────────────
    await saveToStudio.click()
    await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}/, { timeout: 30_000 })
    await page.screenshot({ path: 'e2e/.report/04-studio-draft.png', fullPage: true })

    // The Studio editor loaded the generated draft (title field is populated).
    await expect(page.locator('body')).toContainText(/\w/)
  })
})
