import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Verifies the Threads migration to the one-recommended-post pattern:
//   - one recommended anchor renders by default (no 4-up stack)
//   - the full post renders inside the Threads preview; the body textarea is
//     hidden until Edit mode
//   - "Show alternate angles" loads subordinate, collapsed alternates on demand
//   - only the anchor is auto-saved to Studio
//
// Generation + alternates are MOCKED (no Claude calls). Auth is real (Clerk).
//
// Requires (in .env.local): E2E_CLERK_USER_USERNAME / _PASSWORD / E2E_WORKSPACE_SLUG

const USERNAME = process.env.E2E_CLERK_USER_USERNAME
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD
const SLUG     = process.env.E2E_WORKSPACE_SLUG

const ANCHOR_BODY = 'Most productivity systems are just sophisticated ways to feel busy.\n\nNot all motion is progress.'
const ANCHOR = {
  id: 'threads-anchor-1',
  label: 'Recommended',
  campaignName: 'Activity is not progress',
  primaryText: ANCHOR_BODY,
  angle: 'personal_observation',
  openingLine: 'Most productivity systems are just sophisticated ways to feel busy.',
  hashtag: null,
}
const ALT_A = { ...ANCHOR, id: 'threads-alt-a', label: 'Alternate angle', campaignName: 'The busyness trap — Contrarian', primaryText: 'Contrarian alternate body.' }
const ALT_B = { ...ANCHOR, id: 'threads-alt-b', label: 'Alternate angle', campaignName: 'What would remain? — Question', primaryText: 'Question alternate body.' }

const GEN_STREAM =
  JSON.stringify({ type: 'progress', label: 'Reading…' }) + '\n' +
  JSON.stringify({ type: 'complete', data: { variations: [ANCHOR] } }) + '\n'
const ALT_STREAM =
  JSON.stringify({ type: 'progress', label: 'Exploring…' }) + '\n' +
  JSON.stringify({ type: 'complete', data: { variations: [ALT_A, ALT_B] } }) + '\n'

test.describe('Threads create — one recommended anchor + alternates', () => {
  test.skip(!USERNAME || !PASSWORD || !SLUG,
    'Set E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG in .env.local')

  test('one anchor renders preview-first; alternates load on demand; only anchor auto-saves', async ({ page }) => {
    test.setTimeout(240_000)
    await setupClerkTestingToken({ page })
    await page.context().grantPermissions(['clipboard-write'])

    let threadsOutputsPosts = 0

    await page.route('**/api/threads/generate', route =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/x-ndjson' }, body: GEN_STREAM }))
    await page.route('**/api/threads/alternates', route =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/x-ndjson' }, body: ALT_STREAM }))
    await page.route('**/api/threads/outputs', route => {
      if (route.request().method() === 'POST') {
        threadsOutputsPosts++
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'out-threads-anchor' }) })
      }
      return route.continue()
    })

    await page.goto('/sign-in')
    await clerk.signIn({ page, signInParams: { strategy: 'password', identifier: USERNAME!, password: PASSWORD! } })

    // Setup → generate (mocked)
    await page.goto(`/${SLUG}/create/threads`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByPlaceholder(/Paste your source content/i)).toBeVisible({ timeout: 120_000 })
    await page.getByPlaceholder(/Paste your source content/i).fill('Notes arguing busyness is not progress.')
    await page.getByRole('button', { name: /Generate Threads Post/i }).click()

    // One anchor, full post inside the preview, no always-on textarea
    await expect(page.getByText('Most productivity systems are just sophisticated ways to feel busy', { exact: false })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Not all motion is progress', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Schedule$/ })).toHaveCount(1)
    await expect(page.locator('textarea')).toHaveCount(0)
    await page.screenshot({ path: 'e2e/.report/threads-01-anchor.png', fullPage: true })

    // Edit reveals the textarea; preview stays visible
    await page.getByRole('button', { name: /^Edit$/ }).click()
    await expect(page.locator('textarea').first()).toBeVisible()
    await expect(page.getByText('Not all motion is progress', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: /^Done$/ }).click()
    await expect(page.locator('textarea')).toHaveCount(0)

    // Show alternate angles → two subordinate, collapsed items
    await page.getByRole('button', { name: /Show alternate angles/i }).click()
    await expect(page.getByRole('button', { name: /The busyness trap/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /What would remain/i })).toBeVisible()
    await expect(page.getByText('Contrarian alternate body.')).toHaveCount(0) // collapsed
    await page.screenshot({ path: 'e2e/.report/threads-02-alternates.png', fullPage: true })

    // Guardrail: only the anchor was auto-saved
    expect(threadsOutputsPosts).toBe(1)
  })
})
