import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Verifies the preview-first LinkedIn create result layout:
//   - the FULL generated post renders inside the LinkedIn preview card
//     (paragraph breaks + a long body, no "…see more" collapse, no truncation)
//   - there is NO separate plain-text body textarea in the default view
//   - clicking Edit reveals the editor (body textarea) below the still-visible preview
//
// The generation stream is MOCKED (no real Claude call) so the result state is
// deterministic and free. Auth is real (Clerk).
//
// Requires (in .env.local): E2E_CLERK_USER_USERNAME / _PASSWORD / E2E_WORKSPACE_SLUG

const USERNAME = process.env.E2E_CLERK_USER_USERNAME
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD
const SLUG     = process.env.E2E_WORKSPACE_SLUG

// A long, multi-paragraph post so we can prove the whole thing renders (the old
// preview truncated at 140 chars behind "…see more").
const BODY = [
  'Most teams treat content like exhaust — publish it and move on.',
  '',
  'But the real leverage is treating every post as a durable, reviewable artifact:',
  '• it can be scheduled',
  '• it can be measured',
  '• it can be improved',
  '',
  'Speed without a lifecycle is just exporting text. The teams that win build creation',
  'surfaces that feed a managed lifecycle — not one-off sends.',
  '',
  'That is the difference between being busy and compounding.',
].join('\n')

const LAST_LINE = 'That is the difference between being busy and compounding.'

const VARIATION = {
  id: 'var-mock-1',
  label: 'Authority angle',
  campaignName: 'Content as durable artifacts',
  body: BODY,
  hooks: [{ type: 'contrarian', text: 'Most teams treat content like exhaust.' }],
  hashtags: ['ContentStrategy', 'Marketing'],
  mentions: [],
  ctaSuggestions: ['What does your content lifecycle look like?'],
  transformationDelta: { changes: ['Sharpened hook', 'Added structure'] },
}

// The generate route streams newline-delimited JSON events.
const STREAM_BODY =
  JSON.stringify({ type: 'progress', label: 'Drafting…' }) + '\n' +
  JSON.stringify({ type: 'complete', data: { variations: [VARIATION] } }) + '\n'

test.describe('LinkedIn create — preview-first result', () => {
  test.skip(!USERNAME || !PASSWORD || !SLUG,
    'Set E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG in .env.local')

  test('full post renders inside the preview; body textarea only in Edit', async ({ page }) => {
    test.setTimeout(240_000) // cold Turbopack route compiles can be slow on first hit
    await setupClerkTestingToken({ page })

    // Mock generation (deterministic, no Claude call) and auto-save (returns an id).
    await page.route('**/api/linkedin/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/x-ndjson' },
        body: STREAM_BODY,
      })
    })
    await page.route('**/api/linkedin/outputs', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'out-mock-1' }) })
      } else {
        await route.continue()
      }
    })

    await page.goto('/sign-in')
    await clerk.signIn({
      page,
      signInParams: { strategy: 'password', identifier: USERNAME!, password: PASSWORD! },
    })

    // ── Setup form ──────────────────────────────────────────────────────────────
    await page.goto(`/${SLUG}/create/linkedin`)
    await page.waitForLoadState('networkidle')
    // Auth landed (not bounced to sign-in) and the route compiled.
    await expect(page.getByRole('button', { name: /Text Post/i })).toBeVisible({ timeout: 120_000 })
    await page.getByRole('button', { name: /Text Post/i }).click()
    await page.getByPlaceholder(/Paste your source content/i).fill(
      'Notes arguing that content should be a managed lifecycle, not one-off sends.',
    )
    await page.getByRole('button', { name: /Build Authority/i }).click()
    await page.screenshot({ path: 'e2e/.report/li-01-setup.png', fullPage: true })

    // ── Generate (mocked) → result state ─────────────────────────────────────────
    await page.getByRole('button', { name: /Generate LinkedIn Post/i }).click()

    // The full post is visible — first AND last paragraph (proves no truncation).
    await expect(page.getByText('Most teams treat content like exhaust', { exact: false }))
      .toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(LAST_LINE, { exact: false })).toBeVisible()

    // No "…see more" collapse in the full preview.
    await expect(page.getByRole('button', { name: /see more/i })).toHaveCount(0)

    // Default view: no editable post-body textarea visible yet.
    await expect(page.getByPlaceholder(/Paste your source content/i)).toHaveCount(0)
    const bodyTextareas = page.locator('textarea')
    await expect(bodyTextareas).toHaveCount(0)
    await page.screenshot({ path: 'e2e/.report/li-02-result-default.png', fullPage: true })

    // ── Edit mode reveals the editor, preview stays visible ──────────────────────
    await page.getByRole('button', { name: /^Edit$/ }).click()
    await expect(page.locator('textarea').first()).toBeVisible()
    // Preview still shows the post while editing.
    await expect(page.getByText(LAST_LINE, { exact: false })).toBeVisible()
    await page.screenshot({ path: 'e2e/.report/li-03-edit-open.png', fullPage: true })

    // Toggling Edit off hides the textarea again (state preserved in variation).
    await page.getByRole('button', { name: /^Done$/ }).click()
    await expect(page.locator('textarea')).toHaveCount(0)
  })
})
