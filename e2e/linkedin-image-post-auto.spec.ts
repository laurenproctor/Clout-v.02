import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Verifies the auto branded image for a LinkedIn "Image Post":
//   - selecting Image Post auto-generates an image after the post
//   - the composed image renders and attaches (real /api/visual/generate render)
//   - screenshot the result card to eyeball color/logo/layout
//
// Post generation is MOCKED (deterministic, no Claude post call) but the OUTPUT is
// REAL (so /api/visual/generate's output-ownership check passes) and the IMAGE
// render is REAL (OpenAI background + Puppeteer composite — the thing under test).
//
// Requires (in .env.local): E2E_CLERK_USER_USERNAME / _PASSWORD / E2E_WORKSPACE_SLUG
// plus OPENAI_API_KEY + ANTHROPIC_API_KEY for the real image render.

const USERNAME = process.env.E2E_CLERK_USER_USERNAME
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD
const SLUG     = process.env.E2E_WORKSPACE_SLUG

const BODY = [
  'The supplements market is projected to cross a trillion dollars by 2033.',
  '',
  'Most of that growth is buyers defaulting to whatever signals quality on the shelf —',
  'not whatever is actually backed by evidence.',
  '',
  'Brand perception is doing the heavy lifting. Formulation is the tiebreaker, not the pitch.',
].join('\n')

const VARIATION = {
  id: 'var-img-1',
  label: 'Market angle',
  campaignName: 'Perceived quality wins shelves',
  body: BODY,
  hooks: [{ type: 'data', text: 'A trillion-dollar market by 2033.' }],
  hashtags: ['Supplements', 'Brand'],
  mentions: [],
  ctaSuggestions: ['What signals quality to your buyers?'],
  transformationDelta: { changes: ['Led with the number'] },
}

const STREAM_BODY =
  JSON.stringify({ type: 'progress', label: 'Drafting…' }) + '\n' +
  JSON.stringify({ type: 'complete', data: { variations: [VARIATION] } }) + '\n'

test.describe('LinkedIn create — auto image post', () => {
  test.skip(!USERNAME || !PASSWORD || !SLUG,
    'Set E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG in .env.local')

  test('Image Post auto-generates and attaches a branded image', async ({ page }) => {
    test.setTimeout(300_000) // real image render can take 60–120s

    await setupClerkTestingToken({ page })

    // Mock ONLY the post generation; outputs + visual generation are real.
    await page.route('**/api/linkedin/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/x-ndjson' },
        body: STREAM_BODY,
      })
    })

    await page.goto('/sign-in')
    await page.waitForLoadState('networkidle')
    await clerk.loaded({ page })
    await clerk.signIn({
      page,
      signInParams: { strategy: 'password', identifier: USERNAME!, password: PASSWORD! },
    })
    // Confirm the session is live before navigating (avoid a redirect bounce).
    await page.goto(`/${SLUG}`)
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 30_000 })

    await page.goto(`/${SLUG}/create/linkedin`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /Image Post/i })).toBeVisible({ timeout: 120_000 })
    await page.getByRole('button', { name: /Image Post/i }).click()
    await page.getByPlaceholder(/Paste your source content/i).fill(
      'Notes on the supplements market: perceived quality drives purchases more than evidence.',
    )
    await page.getByRole('button', { name: /Build Authority/i }).click()
    await page.getByRole('button', { name: /Generate LinkedIn Post/i }).click()

    // Post arrived.
    await expect(page.getByText('trillion', { exact: false })).toBeVisible({ timeout: 30_000 })
    await page.screenshot({ path: 'e2e/.report/li-img-01-generating.png', fullPage: true })

    // Auto image attaches (chip appears once selectedVisualAssetId is set).
    await expect(page.getByText('Visual attached')).toBeVisible({ timeout: 180_000 })

    // The composed image is in the preview media slot.
    const composed = page.locator('img[src*="visual-assets"]')
    await expect(composed.first()).toBeVisible({ timeout: 10_000 })

    await page.screenshot({ path: 'e2e/.report/li-img-02-result.png', fullPage: true })

    // Log the composed URL so we can open the raw render if needed.
    const src = await composed.first().getAttribute('src')
    console.log('[e2e] composed image src:', src)
  })
})
