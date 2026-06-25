import { existsSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Verifies the brand-typeface fix end-to-end: generate a Headline Banner (solid background →
// overlay path), then read the asset's generation_context.brandFontDiagnostics from the DB and
// assert the workspace brand fonts' classification + renderer hand-off are recorded correctly
// (a resolved font is passed; an unresolved custom font is surfaced, not silently dropped).
//
// Auth: reuses a real logged-in session captured once via `node e2e/capture-auth.mjs` — Clerk's
// client-trust gate on this instance can't be bypassed by the Testing Token (see
// brand-imagery-multi-upload.spec.ts). Requires in .env.local: E2E_WORKSPACE_SLUG,
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const SLUG     = process.env.E2E_WORKSPACE_SLUG
const SB_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE  = 'e2e/.auth/user.json'
const HAS_SESSION = existsSync(STORAGE)

const admin = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null

interface FontDiag { requested: string | null; source: string; resolvedUrl: string | null; passedToRenderer: boolean; fallbackUsed: boolean }
interface GenCtx { brandFontDiagnostics?: { heading: FontDiag; body: FontDiag } | null; brandFontsApplied?: boolean; brandDownloadableFontsResolved?: boolean }

async function readDiagnostics(assetId: string): Promise<GenCtx> {
  const { data, error } = await admin!
    .from('visual_assets')
    .select('generation_context')
    .eq('id', assetId)
    .single()
  if (error) throw new Error(`asset read failed: ${error.message}`)
  return (data!.generation_context ?? {}) as GenCtx
}

test.describe('Create Image — brand typeface applied', () => {
  test.skip(!SLUG, 'Set E2E_WORKSPACE_SLUG in .env.local')
  test.skip(!admin, 'Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
  test.skip(!HAS_SESSION, 'No saved session — run `node e2e/capture-auth.mjs` to log in once.')

  test.use({ storageState: STORAGE })

  test('Headline Banner records brand-font diagnostics and applies resolvable fonts', async ({ page }) => {
    test.setTimeout(180_000)

    // ── Look up the workspace's configured brand fonts (ground truth) ───────────
    const { data: ws } = await admin!.from('workspaces').select('id').eq('slug', SLUG!).single()
    expect(ws, 'workspace not found by slug').toBeTruthy()
    const { data: brand } = await admin!
      .from('brand_profiles')
      .select('font_heading, font_body')
      .eq('workspace_id', ws!.id)
      .maybeSingle()
    console.log('[brand-fonts] configured fonts:', brand?.font_heading, '/', brand?.font_body)

    // ── Create Image (session replayed via storageState) ────────────────────────
    const headlineTab = page.getByRole('button', { name: /Headline Banner/i })
    await expect(async () => {
      await page.goto(`/${SLUG}/create/image`)
      await expect(headlineTab).toBeVisible({ timeout: 5_000 })
    }).toPass({ timeout: 30_000 })

    // ── Headline Banner (default style, solid background → overlay path) ─────────
    await page.getByRole('button', { name: /Headline Banner/i }).click()
    await page.getByPlaceholder(/headline/i).first().fill('Brand typeface should render here')
    const genBtn = page.getByRole('button', { name: /^Generate/i })
    await expect(genBtn).toBeEnabled()

    const respPromise = page.waitForResponse(
      (res) => res.url().includes('/api/visual/generate') && res.request().method() === 'POST',
      { timeout: 120_000 },
    )
    await genBtn.click()
    const resp = await respPromise
    expect(resp.ok(), `generate failed: HTTP ${resp.status()}`).toBe(true)
    const assetId = (await resp.json()).assetId as string
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'e2e/.report/image-headline-banner.png', fullPage: true })

    expect(assetId, 'no assetId captured for headline banner').toBeTruthy()
    const ctx = await readDiagnostics(assetId)
    const diag = ctx.brandFontDiagnostics
    console.log('[brand-fonts] diagnostics:', JSON.stringify(diag))

    // Diagnostics must be recorded for any composited-text generation.
    expect(diag, 'no font diagnostics recorded').toBeTruthy()

    // Each diagnostic reflects the configured font (proves the brand font reached the pipeline,
    // not a silent system-ui substitution).
    if (brand?.font_heading) expect(diag!.heading.requested).toBe(brand.font_heading)
    if (brand?.font_body)    expect(diag!.body.requested).toBe(brand.font_body)

    // Every diagnostic is internally consistent: a non-'unresolved'/'none' source must reach the
    // renderer; an 'unresolved' source must record the fallback (the design intent of the fix).
    for (const role of ['heading', 'body'] as const) {
      const d = diag![role]
      if (d.source === 'unresolved') {
        expect(d.passedToRenderer, `${role} unresolved must fall back`).toBe(false)
        expect(d.fallbackUsed).toBe(true)
      } else if (d.source !== 'none') {
        expect(d.passedToRenderer, `${role} ${d.source} must reach renderer`).toBe(true)
      }
    }

    // At least one configured brand font must actually reach the renderer (e.g. a Google font
    // like Manrope resolves by name). Otherwise the brand had no typographic effect at all.
    expect(diag!.heading.passedToRenderer || diag!.body.passedToRenderer, 'no brand font reached the renderer').toBe(true)
    expect(ctx.brandFontsApplied).toBe(true)
  })
})
