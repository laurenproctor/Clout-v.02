import { existsSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Verifies the two DB-level guarantees that only become real once the migrations are applied:
//   1. Substack Article auto-save is idempotent (partial unique index on sourceGenerationHash):
//      the same generation POSTed twice yields ONE Studio draft; the 2nd call returns deduped.
//   2. Image → Save to Studio is atomic + idempotent (save_image_asset_to_output RPC):
//      promoting an asset twice yields ONE output and links the asset; the 2nd call is a no-op.
//
// Drives the REAL authenticated API routes (session replayed via storageState) and asserts the
// resulting rows via the Supabase service client, then cleans up everything it created.
//
// Auth: reuses a saved session (Clerk's client-trust gate blocks the Testing Token on this
// instance — see image-brand-fonts.spec.ts). Requires in .env.local: E2E_WORKSPACE_SLUG,
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and a session at e2e/.auth/user.json.

const SLUG    = process.env.E2E_WORKSPACE_SLUG
const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE = 'e2e/.auth/user.json'
const HAS_SESSION = existsSync(STORAGE)

const admin = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null

test.describe('Studio artifact promotion — idempotency & atomicity', () => {
  test.skip(!SLUG, 'Set E2E_WORKSPACE_SLUG in .env.local')
  test.skip(!admin, 'Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
  test.skip(!HAS_SESSION, 'No saved session — run `node e2e/capture-auth.mjs` to log in once.')

  test.use({ storageState: STORAGE })

  test('Substack Article auto-save dedupes on sourceGenerationHash', async ({ page }) => {
    test.setTimeout(60_000)
    const { data: ws } = await admin!.from('workspaces').select('id').eq('slug', SLUG!).single()
    expect(ws, 'workspace not found by slug').toBeTruthy()

    // Unique per run so we never collide with a prior run's row.
    const marker   = randomUUID()
    const title    = `E2E Article ${marker}`
    const markdown = `Body for ${marker}. Durable creation beats one-off publishing.`
    const sourceGenerationHash = createHash('sha256')
      .update(JSON.stringify({ sourceCreator: 'create/substack', substackFormat: 'article', title, subtitle: '', markdown }))
      .digest('hex')

    const payload = {
      title, markdown, wordCount: 9,
      sourceCreator: 'create/substack', substackFormat: 'article', sourceGenerationHash,
    }

    // Warm a page so the request context carries the authenticated session cookies.
    await page.goto(`/${SLUG}/studio`)

    let createdOutputId: string | undefined
    try {
      const r1 = await page.request.post('/api/substack-email/outputs', { data: payload })
      expect(r1.status(), 'first save should create (201)').toBe(201)
      const b1 = await r1.json()
      createdOutputId = b1.id
      expect(createdOutputId).toBeTruthy()

      // Same payload again → must NOT create a second row.
      const r2 = await page.request.post('/api/substack-email/outputs', { data: payload })
      const b2 = await r2.json()
      expect(r2.status(), 'duplicate save should dedupe (200)').toBe(200)
      expect(b2.deduped, 'duplicate save should be flagged deduped').toBe(true)
      expect(b2.id, 'duplicate save should return the same draft id').toBe(createdOutputId)

      // Ground truth: exactly one row carries this hash.
      const { data: rows } = await admin!
        .from('outputs')
        .select('id, content_type, content')
        .eq('workspace_id', ws!.id)
        .eq('content->>sourceGenerationHash', sourceGenerationHash)
      expect(rows, 'exactly one output should carry the hash').toHaveLength(1)
      expect(rows![0].content_type).toBe('substack-newsletter')
      expect((rows![0].content as { substackFormat?: string }).substackFormat).toBe('article')
    } finally {
      if (createdOutputId) await admin!.from('outputs').delete().eq('id', createdOutputId)
    }
  })

  test('Image → Save to Studio promotes atomically and is idempotent', async ({ page }) => {
    test.setTimeout(60_000)
    const { data: ws } = await admin!.from('workspaces').select('id').eq('slug', SLUG!).single()
    expect(ws, 'workspace not found by slug').toBeTruthy()

    // Use an existing unlinked asset to avoid a costly image generation. Skip cleanly if none.
    const { data: asset } = await admin!
      .from('visual_assets')
      .select('id, output_id')
      .eq('workspace_id', ws!.id)
      .is('output_id', null)
      .limit(1)
      .maybeSingle()
    test.skip(!asset, 'No unlinked visual_asset in this workspace to promote — generate one first.')

    await page.goto(`/${SLUG}/studio`)

    let createdOutputId: string | undefined
    try {
      const r1 = await page.request.post('/api/create/image/outputs', { data: { assetId: asset!.id, title: 'E2E image draft' } })
      expect(r1.status(), 'first promote should create (201)').toBe(201)
      const b1 = await r1.json()
      createdOutputId = b1.outputId
      expect(createdOutputId, 'first promote should return an outputId').toBeTruthy()
      expect(b1.alreadyLinked, 'first promote is a fresh link').toBe(false)

      // The asset is now linked to the new output (atomic second write).
      const { data: linked } = await admin!.from('visual_assets').select('output_id').eq('id', asset!.id).single()
      expect(linked!.output_id, 'asset must be linked to the new output').toBe(createdOutputId)

      // The output is an image draft.
      const { data: out } = await admin!.from('outputs').select('content_type, status, content').eq('id', createdOutputId!).single()
      expect(out!.content_type).toBe('image')
      expect(out!.status).toBe('draft')
      expect((out!.content as { selectedVisualAssetId?: string }).selectedVisualAssetId).toBe(asset!.id)

      // Promote again → idempotent no-op returning the same draft.
      const r2 = await page.request.post('/api/create/image/outputs', { data: { assetId: asset!.id, title: 'E2E image draft' } })
      const b2 = await r2.json()
      expect(r2.status(), 'duplicate promote should be 200').toBe(200)
      expect(b2.alreadyLinked, 'duplicate promote is already linked').toBe(true)
      expect(b2.outputId, 'duplicate promote returns the same draft').toBe(createdOutputId)
    } finally {
      // Restore the asset and remove the test draft.
      await admin!.from('visual_assets').update({ output_id: null }).eq('id', asset!.id)
      if (createdOutputId) await admin!.from('outputs').delete().eq('id', createdOutputId)
    }
  })
})
