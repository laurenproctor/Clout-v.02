import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Verifies the "Show 10 more / Find new signals" pagination on the Industry
// Signals (news) feed:
//   - the list is capped at 10 cards initially when more exist
//   - "Show 10 more" reveals more already-loaded cards (no network)
//   - with <=10 cards the button reads "Find new signals" (fetch phase)
//
// Requires (in .env.local, gitignored):
//   E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG

const USERNAME = process.env.E2E_CLERK_USER_USERNAME
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD
const SLUG     = process.env.E2E_WORKSPACE_SLUG

test.describe('Industry Signals — load more', () => {
  test.skip(!USERNAME || !PASSWORD || !SLUG,
    'Set E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD, E2E_WORKSPACE_SLUG in .env.local')

  test('reveals 10 more, or shows fetch button when <=10 cards', async ({ page }) => {
    await setupClerkTestingToken({ page })

    await page.goto('/sign-in')
    await clerk.signIn({
      page,
      signInParams: { strategy: 'password', identifier: USERNAME!, password: PASSWORD! },
    })

    await page.goto(`/${SLUG}/feed`)

    // Feed header confirms we're on Signal Intelligence (not redirected to setup).
    await expect(page.getByRole('heading', { name: 'Signal Intelligence' })).toBeVisible({ timeout: 20000 })

    // Ensure the Industry Signals (news) tab is selected, then let it load.
    await page.getByRole('button', { name: 'Industry Signals' }).click()

    const cards = page.locator('[aria-label="Dismiss signal"]')
    const moreButton = page.getByRole('button', { name: /Show 10 more|Find new signals/ })

    // Wait for the feed to settle into one of its terminal states: cards present,
    // or an empty editorial state (no cards, no button).
    await page.waitForFunction(() => {
      const dismiss = document.querySelectorAll('[aria-label="Dismiss signal"]').length
      const loading = document.body.innerText.includes('Loading signals')
      return dismiss > 0 || !loading
    }, undefined, { timeout: 20000 })

    const cardCount = await cards.count()

    if (cardCount === 0) {
      // Empty feed: editorial default shows, and no load-more button should render.
      await expect(moreButton).toHaveCount(0)
      await page.screenshot({ path: 'e2e/.report/feed-load-more-empty.png', fullPage: true })
      test.info().annotations.push({ type: 'note', description: 'Feed empty — no cards to paginate.' })
      return
    }

    // A card-bearing feed always renders exactly one load-more button.
    await expect(moreButton).toBeVisible()
    const label = (await moreButton.textContent())?.trim()

    if (label === 'Show 10 more') {
      // Reveal phase: first page is capped at 10.
      expect(cardCount).toBe(10)
      await page.screenshot({ path: 'e2e/.report/feed-load-more-page1.png', fullPage: true })

      await moreButton.click()
      // More cards appear without a network reload (instant reveal).
      await expect.poll(() => cards.count()).toBeGreaterThan(10)
      await page.screenshot({ path: 'e2e/.report/feed-load-more-page2.png', fullPage: true })
    } else {
      // Fetch phase: <=10 cards total, button offers to find new signals.
      expect(label).toBe('Find new signals')
      expect(cardCount).toBeLessThanOrEqual(10)
      await page.screenshot({ path: 'e2e/.report/feed-load-more-fetch.png', fullPage: true })
      test.info().annotations.push({ type: 'note', description: `Only ${cardCount} cards — fetch-phase button shown.` })
    }
  })
})
