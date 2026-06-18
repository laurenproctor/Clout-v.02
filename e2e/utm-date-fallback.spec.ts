import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Visually verifies the UTM attribution settings page, focused on the new
// "Fallback: Text / Date" control for dynamic tokens (campaign_name/cta/lens/voice).
//
// Requires (in .env.local, gitignored):
//   E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG

const USERNAME = process.env.E2E_CLERK_USER_USERNAME
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD
const SLUG     = process.env.E2E_WORKSPACE_SLUG

test.describe('UTM settings — date fallback', () => {
  test.skip(!USERNAME || !PASSWORD || !SLUG,
    'Set E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG in .env.local')

  test('dynamic token exposes Text/Date fallback and shows date format', async ({ page }) => {
    await setupClerkTestingToken({ page })

    await page.goto('/sign-in')
    await clerk.signIn({
      page,
      signInParams: { strategy: 'password', identifier: USERNAME!, password: PASSWORD! },
    })

    await page.goto(`/${SLUG}/settings/utm`)

    // The Content templates card and the utm_campaign row should be present.
    const campaignRow = page.locator('div.px-4.py-3', { hasText: 'utm_campaign' })
    await expect(campaignRow).toBeVisible({ timeout: 15000 })

    // The first select in the row is the token selector. Choose "Campaign name"
    // (a dynamic token) so the Fallback Text/Date control appears.
    const tokenSelect = campaignRow.locator('select').first()
    await tokenSelect.selectOption({ label: 'Campaign name' })

    // A "Fallback:" select with Text/Date should now be visible.
    const fallbackKindSelect = campaignRow.locator('select', { has: page.locator('option[value="date"]') }).first()
    await expect(fallbackKindSelect).toBeVisible()
    await expect(campaignRow.getByText('Fallback:')).toBeVisible()

    await page.screenshot({ path: 'e2e/.report/utm-campaign-name-text-fallback.png', fullPage: true })

    // Switch the fallback to Date → the static text input disappears and the
    // date Format dropdown appears.
    await fallbackKindSelect.selectOption('date')
    await expect(campaignRow.getByText('Format:')).toBeVisible()

    // Preview should now read like: utm_campaign={campaign_name} or "2026-06"
    await expect(campaignRow.getByText(/utm_campaign=\{campaign_name\} or "\d{4}/)).toBeVisible()

    await page.screenshot({ path: 'e2e/.report/utm-campaign-name-date-fallback.png', fullPage: true })
  })
})
