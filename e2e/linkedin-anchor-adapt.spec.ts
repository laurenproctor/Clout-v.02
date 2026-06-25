import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Verifies PR 2 of the Create simplification on LinkedIn:
//   - one recommended anchor renders by default (no stack)
//   - "Show alternate angles" loads subordinate, collapsed alternates on demand
//   - "Adapt to other platforms" → Threads renders an inline adaptation card
//     derived from the anchor body
//   - alternates + adaptations are NOT auto-saved to Studio (only the anchor is)
//
// Generation, alternates and adaptation are all MOCKED (no Claude calls) so the
// result is deterministic and free. Auth is real (Clerk).
//
// Requires (in .env.local): E2E_CLERK_USER_USERNAME / _PASSWORD / E2E_WORKSPACE_SLUG

const USERNAME = process.env.E2E_CLERK_USER_USERNAME
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD
const SLUG     = process.env.E2E_WORKSPACE_SLUG

const ANCHOR = {
  id: 'anchor-1',
  label: 'Recommended',
  campaignName: 'Content as durable artifacts',
  body: 'Most teams treat content like exhaust — publish it and move on.\n\nThe leverage is treating every post as a durable artifact.',
  hooks: [],
  hashtags: ['ContentStrategy', 'Marketing'],
  mentions: [],
  ctaSuggestions: [],
  transformationDelta: { changes: ['Strongest angle for this brief'] },
}

const ALT_A = { ...ANCHOR, id: 'alt-a', label: 'Alternate angle', campaignName: 'The lifecycle advantage — Authority angle', body: 'Authority-angle alternate body.' }
const ALT_B = { ...ANCHOR, id: 'alt-b', label: 'Alternate angle', campaignName: 'Stop exporting text — Debate angle', body: 'Debate-angle alternate body.' }

const GEN_STREAM =
  JSON.stringify({ type: 'progress', label: 'Drafting…' }) + '\n' +
  JSON.stringify({ type: 'complete', data: { variations: [ANCHOR] } }) + '\n'

const ALT_STREAM =
  JSON.stringify({ type: 'progress', label: 'Exploring…' }) + '\n' +
  JSON.stringify({ type: 'complete', data: { variations: [ALT_A, ALT_B] } }) + '\n'

const ADAPTED_THREADS = {
  platform: 'threads',
  body: 'Most teams treat content like exhaust. The real move: treat every post as a durable artifact.',
  hashtags: [],
  campaignName: 'Content as durable artifacts',
}

test.describe('LinkedIn create — anchor + alternates + adaptation', () => {
  test.skip(!USERNAME || !PASSWORD || !SLUG,
    'Set E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG in .env.local')

  test('alternates load on demand; adapt derives a Threads card; neither auto-saves', async ({ page }) => {
    test.setTimeout(240_000)
    await setupClerkTestingToken({ page })
    await page.context().grantPermissions(['clipboard-write'])

    let linkedinOutputsPosts = 0
    let threadsOutputsPosts = 0

    await page.route('**/api/linkedin/generate', route =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/x-ndjson' }, body: GEN_STREAM }))
    await page.route('**/api/linkedin/alternates', route =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/x-ndjson' }, body: ALT_STREAM }))
    await page.route('**/api/create/adapt', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ADAPTED_THREADS) }))
    await page.route('**/api/linkedin/outputs', route => {
      if (route.request().method() === 'POST') {
        linkedinOutputsPosts++
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'out-anchor' }) })
      }
      return route.continue()
    })
    await page.route('**/api/threads/outputs', route => {
      if (route.request().method() === 'POST') {
        threadsOutputsPosts++
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'out-threads' }) })
      }
      return route.continue()
    })

    await page.goto('/sign-in')
    await clerk.signIn({ page, signInParams: { strategy: 'password', identifier: USERNAME!, password: PASSWORD! } })

    // Setup → generate (mocked) → one anchor card
    await page.goto(`/${SLUG}/create/linkedin`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /Text Post/i })).toBeVisible({ timeout: 120_000 })
    await page.getByRole('button', { name: /Text Post/i }).click()
    await page.getByPlaceholder(/Paste your source content/i).fill('Notes on content as a managed lifecycle.')
    await page.getByRole('button', { name: /Build Authority/i }).click()
    await page.getByRole('button', { name: /Generate LinkedIn Post/i }).click()

    await expect(page.getByText('Most teams treat content like exhaust', { exact: false })).toBeVisible({ timeout: 30_000 })

    // ── Show alternate angles → two subordinate, collapsed items ────────────────
    await page.getByRole('button', { name: /Show alternate angles/i }).click()
    await expect(page.getByRole('button', { name: /The lifecycle advantage/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /Stop exporting text/i })).toBeVisible()
    // Collapsed: alternate bodies are not shown until expanded.
    await expect(page.getByText('Authority-angle alternate body.')).toHaveCount(0)
    await page.screenshot({ path: 'e2e/.report/li-pr2-01-alternates.png', fullPage: true })

    // ── Adapt to other platforms → Threads card derived from the anchor ─────────
    await page.getByRole('button', { name: /^Threads$/ }).click()
    await expect(page.getByText('Threads version')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Adapted from LinkedIn anchor')).toBeVisible()
    await expect(page.getByText('The real move: treat every post as a durable artifact', { exact: false })).toBeVisible()
    await page.screenshot({ path: 'e2e/.report/li-pr2-02-adaptation.png', fullPage: true })

    // ── Guardrail: only the anchor was auto-saved ───────────────────────────────
    expect(linkedinOutputsPosts).toBe(1)   // anchor auto-save only
    expect(threadsOutputsPosts).toBe(0)    // adaptation not persisted until Save
  })
})
