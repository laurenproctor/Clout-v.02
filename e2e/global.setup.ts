import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

// Obtains a Clerk Testing Token (using CLERK_SECRET_KEY) so the bot-protection on the
// sign-in flow is bypassed for automated runs. Runs once before the chromium project.
setup('clerk testing token', async () => {
  await clerkSetup()
})
