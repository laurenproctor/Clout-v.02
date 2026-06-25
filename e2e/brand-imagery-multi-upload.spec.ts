import { existsSync } from 'node:fs'
import { test, expect } from '@playwright/test'

// Verifies the multi-image fix on settings/brand → Imagery → Example Imagery:
//   drop/select 3 images at once → all 3 DISPLAY → reload → all 3 still present (SAVED).
// Then cleans up the 3 it added so the workspace is left as it was found.
//
// Auth: reuses a real logged-in session captured once via `node e2e/capture-auth.mjs`
// (Clerk's client-trust gate on this instance can't be bypassed by the Testing Token,
// so we sign in as a human once and replay the cookies). Requires in .env.local:
//   E2E_WORKSPACE_SLUG — a workspace the captured user can access

const SLUG       = process.env.E2E_WORKSPACE_SLUG
const STORAGE    = 'e2e/.auth/user.json'
const HAS_SESSION = existsSync(STORAGE)

// Minimal valid 1x1 PNG.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)
const FILES = [1, 2, 3].map(n => ({ name: `brand-test-${n}.png`, mimeType: 'image/png', buffer: PNG_1x1 }))

test.describe('Brand imagery — multi-image upload', () => {
  test.skip(!SLUG, 'Set E2E_WORKSPACE_SLUG in .env.local')
  test.skip(!HAS_SESSION, 'No saved session — run `node e2e/capture-auth.mjs` to log in once.')

  // Replay the captured logged-in session for every test in this file.
  test.use({ storageState: STORAGE })

  test('upload 3 at once → all display and persist', async ({ page }) => {
    test.setTimeout(120_000)

    // ── settings/brand → Imagery tab ────────────────────────────────────────────
    // Retry the navigation a couple of times in case the session needs a beat to settle.
    const imageryTab = page.getByRole('button', { name: /^imagery$/i })
    await expect(async () => {
      await page.goto(`/${SLUG}/settings/brand`)
      await expect(imageryTab).toBeVisible({ timeout: 5_000 })
    }).toPass({ timeout: 30_000 })
    await imageryTab.click()

    // Scope everything to the Example Imagery card (its uploader dropzone text is unique).
    const card = page.locator('div.space-y-3').filter({ hasText: 'Example Imagery' })
    await expect(card.getByText(/Drop images here/i)).toBeVisible()

    const gridImgs = card.locator('img')
    const initialCount = await gridImgs.count()

    // ── Select all 3 files in one shot (the bug: only the last survived) ─────────
    await card.locator('input[type="file"]').setInputFiles(FILES)

    // All three must DISPLAY.
    await expect(gridImgs).toHaveCount(initialCount + 3, { timeout: 90_000 })
    await page.screenshot({ path: 'e2e/.report/brand-imagery-after-upload.png', fullPage: true })

    // Let the debounced auto-save (1.5s) flush, then reload to prove they were SAVED.
    await page.waitForTimeout(3_000)
    await page.reload()
    await page.getByRole('button', { name: /^imagery$/i }).click()
    const cardAfter = page.locator('div.space-y-3').filter({ hasText: 'Example Imagery' })
    const gridAfter = cardAfter.locator('img')
    await expect(gridAfter).toHaveCount(initialCount + 3, { timeout: 30_000 })
    await page.screenshot({ path: 'e2e/.report/brand-imagery-after-reload.png', fullPage: true })

    // ── Cleanup: delete the 3 we added (new ones are appended at the end) ────────
    const removeButtons = cardAfter.getByRole('button', { name: /Remove image/i })
    for (let i = 0; i < 3; i++) {
      const target = await gridAfter.count()
      await removeButtons.last().click({ force: true })
      await expect(gridAfter).toHaveCount(target - 1, { timeout: 30_000 })
    }
    await expect(gridAfter).toHaveCount(initialCount, { timeout: 30_000 })
  })
})
