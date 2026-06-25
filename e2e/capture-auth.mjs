// One-time interactive Clerk session capture for e2e.
//
//   node e2e/capture-auth.mjs
//
// Opens a real Chromium window at /sign-in. Log in by hand (Google, password,
// whatever) — this resolves Clerk's client-trust gate the way a human does, which
// the Testing Token can't do on this instance. Once you land in the app, the script
// saves the authenticated session to e2e/.auth/user.json and exits. The upload spec
// reuses that file via test.use({ storageState }), so it never has to sign in.
//
// Re-run this whenever the saved session expires (the spec will tell you if it has).

import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const OUT = 'e2e/.auth/user.json'

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext()
const page = await context.newPage()

console.log(`\n  Opening ${BASE}/sign-in — log in in the browser window.`)
console.log('  Waiting for an authenticated session (up to 5 minutes)...\n')
await page.goto(`${BASE}/sign-in`)

// Poll for the Clerk session cookie, which is set as soon as you're signed in
// (more reliable than waiting on window.Clerk JS state). __client_uat > 0 or a
// __session JWT both mean an active session.
const deadline = Date.now() + 5 * 60_000
let signedIn = false
let lastUrl = ''
while (Date.now() < deadline) {
  const cookies = await context.cookies().catch(() => [])
  const uat = cookies.find(c => c.name === '__client_uat')
  const hasSession = cookies.some(c => c.name === '__session' && c.value)
  if (hasSession || (uat && uat.value && uat.value !== '0')) { signedIn = true; break }
  const url = page.url()
  if (url !== lastUrl) { console.log('  …on', url); lastUrl = url }
  await page.waitForTimeout(1500)
}

if (!signedIn) {
  console.error('  ✗ No session detected before timeout. Nothing saved.')
  await browser.close()
  process.exit(1)
}

mkdirSync(dirname(OUT), { recursive: true })
await context.storageState({ path: OUT })
console.log(`  ✓ Session saved to ${OUT}. You can close this and run the test.\n`)
await browser.close()
process.exit(0)
