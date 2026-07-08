import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Verifies the optional "Image direction" field for a LinkedIn Image Post:
//   - it renders ONLY when Image Post is selected (hidden for other post types)   [step 2]
//   - its value is NOT persisted/restored on reload (per-post, not a default)     [step 8]
//   - its value threads into the /api/visual/generate request body               [step 3]
//   - the real branded image still generates + attaches with a direction present [step 3/9]
//   - it is read-only in the result view (can't be edited to trigger a regen)    [step 6]
//
// Post generation is MOCKED (deterministic). Outputs + the image render are REAL, so the
// /api/visual/generate payload we assert on is the real one the client sends.
//
// Requires (in .env.local): E2E_CLERK_USER_USERNAME / _PASSWORD / E2E_WORKSPACE_SLUG
// plus OPENAI_API_KEY + ANTHROPIC_API_KEY for the real image render.

const USERNAME = process.env.E2E_CLERK_USER_USERNAME
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD
const SLUG     = process.env.E2E_WORKSPACE_SLUG

const DIRECTION = 'Minimal dark navy background, abstract geometric shapes, no people'

const BODY = [
  'The supplements market is projected to cross a trillion dollars by 2033.',
  '',
  'Most of that growth is buyers defaulting to whatever signals quality on the shelf.',
].join('\n')

const VARIATION = {
  id: 'var-dir-1',
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

async function signIn(page: import('@playwright/test').Page) {
  await setupClerkTestingToken({ page })
  await page.goto('/sign-in')
  await page.waitForLoadState('networkidle')
  await clerk.loaded({ page })
  await clerk.signIn({
    page,
    signInParams: { strategy: 'password', identifier: USERNAME!, password: PASSWORD! },
  })
  await page.goto(`/${SLUG}`)
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 30_000 })
}

test.describe('LinkedIn create — Image direction field', () => {
  test.skip(!USERNAME || !PASSWORD || !SLUG,
    'Set E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG in .env.local')

  const directionField = (page: import('@playwright/test').Page) =>
    page.getByPlaceholder(/Minimal dark navy background/i)

  test('renders only for Image Post and is not persisted on reload', async ({ page }) => {
    test.setTimeout(120_000)
    await signIn(page)

    await page.goto(`/${SLUG}/create/linkedin`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /Image Post/i })).toBeVisible({ timeout: 120_000 })

    // Hidden before Image Post is chosen (default post type is not 'image'). [step 2]
    await expect(directionField(page)).toHaveCount(0)

    // Shows for Image Post…
    await page.getByRole('button', { name: /Image Post/i }).click()
    await expect(directionField(page)).toBeVisible()

    // …and hides again for a non-image type.
    await page.getByRole('button', { name: /Text Post/i }).click()
    await expect(directionField(page)).toHaveCount(0)

    // Not restored on reload — it's a per-post brief, never a saved default. [step 8]
    await page.getByRole('button', { name: /Image Post/i }).click()
    await directionField(page).fill('PERSIST-CHECK-should-not-survive-reload')
    await page.reload()
    await page.waitForLoadState('networkidle')
    // Re-select Image Post if the reload didn't restore it as selected.
    if (await directionField(page).count() === 0) {
      await page.getByRole('button', { name: /Image Post/i }).click()
    }
    await expect(directionField(page)).toHaveValue('')
  })

  test('threads imageDirection into the visual request and renders a branded image', async ({ page }) => {
    test.setTimeout(300_000) // real image render can take 60–120s

    // Mock ONLY the post generation; outputs + visual generation are real.
    await page.route('**/api/linkedin/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/x-ndjson' },
        body: STREAM_BODY,
      })
    })

    // Capture the real visual-generation request body, then let it proceed.
    const visualBodies: Array<Record<string, unknown>> = []
    await page.route('**/api/visual/generate', async (route) => {
      try { visualBodies.push(route.request().postDataJSON()) } catch { /* no body */ }
      await route.continue()
    })

    await signIn(page)
    await page.goto(`/${SLUG}/create/linkedin`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /Image Post/i }).click()
    await page.getByPlaceholder(/Paste your source content/i).fill(
      'Notes on the supplements market: perceived quality drives purchases more than evidence.',
    )
    await directionField(page).fill(DIRECTION)
    await page.getByRole('button', { name: /Build Authority/i }).click()
    await page.getByRole('button', { name: /Generate LinkedIn Post/i }).click()

    // Post arrived.
    await expect(page.getByText('trillion', { exact: false })).toBeVisible({ timeout: 30_000 })

    // Real auto image attaches.
    await expect(page.getByText('Visual attached')).toBeVisible({ timeout: 180_000 })
    const composed = page.locator('img[src*="visual-assets"]')
    await expect(composed.first()).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: 'e2e/.report/li-dir-01-result.png', fullPage: true })

    // The visual request carried our direction verbatim. [step 3]
    expect(visualBodies.length).toBeGreaterThan(0)
    expect(visualBodies[0].imageDirection).toBe(DIRECTION)

    // Result view: the field is read-only, so it can't be edited to silently
    // regenerate the image (snapshot-at-generation guarantee). [step 6]
    await expect(directionField(page)).toBeDisabled()
  })
})
