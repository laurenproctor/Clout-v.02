import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { checkCaptureLimit, checkGenerationLimit } from '@/lib/auth/entitlements'
import { createCapture } from '@/lib/domain/capture'
import { callClaude, buildMultiDraftSystemPrompt } from '@/lib/ai/generate'
import { createClient } from '@/lib/supabase/server'

const MICROCOPY_ANGLES = ['Personal story', 'Contrarian take', 'Practical insight']

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { url, lens_id } = body
  const t0 = Date.now()

  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  console.log('[api/capture/url/process] start', { url })

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Check limits upfront
  const captureLimit = await checkCaptureLimit(session.workspaceId)
  if (!captureLimit.allowed) {
    return NextResponse.json(
      { error: 'Monthly capture limit reached', code: 'CAPTURE_LIMIT_EXCEEDED' },
      { status: 402 }
    )
  }
  const genLimit = await checkGenerationLimit(session.workspaceId)
  if (!genLimit.allowed) {
    return NextResponse.json(
      { error: 'Monthly generation limit reached', code: 'GENERATION_LIMIT_EXCEEDED' },
      { status: 402 }
    )
  }

  // ── Scrape via Jina reader ──────────────────────────────────────────────────
  const jinaUrl = `https://r.jina.ai/${parsedUrl.toString()}`
  let scrapedText = ''
  let pageTitle: string | null = null

  try {
    const jinaRes = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
      },
      signal: AbortSignal.timeout(20000),
    })
    if (jinaRes.ok) {
      const raw = await jinaRes.text()
      // Jina prepends metadata lines — extract title and body
      const titleMatch = raw.match(/^Title:\s*(.+)$/m)
      if (titleMatch) pageTitle = titleMatch[1].trim()
      scrapedText = raw.slice(0, 12000) // cap at ~12k chars
    }
  } catch {
    // Scrape failed — fall back to og:meta fetch
  }

  // Fallback: basic og:meta scrape if Jina failed
  if (!scrapedText) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Clout/1.0 (link preview)' },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const html = await res.text()
        const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
        const metaTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
        const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1]
        const metaDesc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1]
        pageTitle = (ogTitle ?? metaTitle ?? '').trim() || null
        scrapedText = [pageTitle, ogDesc ?? metaDesc ?? ''].filter(Boolean).join('\n\n')
      }
    } catch {
      return NextResponse.json({ error: 'Could not fetch page content' }, { status: 422 })
    }
  }

  if (!scrapedText.trim()) {
    console.error('[api/capture/url/process] no content', { url })
    return NextResponse.json({ error: 'Could not extract content from this URL' }, { status: 422 })
  }
  console.log('[api/capture/url/process] scraped', { url, chars: scrapedText.length })

  // ── Save capture ───────────────────────────────────────────────────────────
  const captureResult = await createCapture({
    workspaceId: session.workspaceId,
    createdBy: session.userId,
    source: 'url',
    rawContent: scrapedText,
    sourceUrl: url,
    isPrivate: false,
    tags: [],
  })
  if (!captureResult.ok) {
    return NextResponse.json({ error: captureResult.error }, { status: 500 })
  }
  const capture = captureResult.data

  // ── Load lens + profile ────────────────────────────────────────────────────
  const supabase = await createClient()

  let resolvedLensId = lens_id
  if (!resolvedLensId) {
    const { data: systemLens } = await supabase
      .from('lenses')
      .select('id')
      .is('workspace_id', null)
      .limit(1)
      .single()
    if (systemLens) resolvedLensId = systemLens.id
  }

  const { data: lens } = await supabase
    .from('lenses')
    .select('id, system_prompt')
    .eq('id', resolvedLensId)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, tone_notes, mental_models, philosophies, target_audiences, sample_content')
    .eq('workspace_id', session.workspaceId)
    .single()

  const systemPrompt = buildMultiDraftSystemPrompt({
    lensSystemPrompt: lens?.system_prompt ?? 'You are a world-class ghostwriter for thought leaders.',
    profileContext: {
      displayName: profile?.display_name ?? null,
      toneNotes: profile?.tone_notes ?? null,
      mentalModels: (profile?.mental_models as Array<{ name: string; description: string }>) ?? [],
      philosophies: (profile?.philosophies as Array<{ name: string; description: string }>) ?? [],
      targetAudiences: (profile?.target_audiences as string[]) ?? [],
      sampleContent: (profile?.sample_content as string[]) ?? [],
    },
  })

  const userMessage = `Source URL: ${url}\n\nPage title: ${pageTitle ?? '(unknown)'}\n\nContent:\n${scrapedText}`

  // ── Generate 3 drafts in one call ─────────────────────────────────────────
  const { data: generation, error: genError } = await supabase
    .from('generations')
    .insert({
      workspace_id: session.workspaceId,
      capture_id: capture.id,
      lens_id: resolvedLensId ?? null,
      profile_id: profile?.id ?? session.userId,
      status: 'generating',
      model: 'claude-sonnet-4-6',
      prompt_snapshot: systemPrompt,
    })
    .select()
    .single()

  if (genError || !generation) {
    return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 })
  }

  let drafts: Array<{ angle: string; body: string; hook: string; hashtags: string[] }> = []

  try {
    const aiResult = await callClaude({
      systemPrompt,
      userMessage,
      model: 'claude-sonnet-4-6',
      maxTokens: 4096,
    })

    await supabase
      .from('generations')
      .update({
        status: 'complete',
        raw_response: aiResult.content,
        duration_ms: aiResult.durationMs,
        token_count: aiResult.inputTokens + aiResult.outputTokens,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generation.id)

    // Parse JSON array
    const jsonMatch = aiResult.content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        drafts = parsed.slice(0, 3).map((d, i) => ({
          angle: d.angle ?? MICROCOPY_ANGLES[i] ?? `Draft ${i + 1}`,
          body: d.body ?? '',
          hook: d.hook ?? '',
          hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
        }))
      }
    }
  } catch (err) {
    console.error('[api/capture/url/process] generation error', { url, error: err instanceof Error ? err.message : String(err) })
    await supabase
      .from('generations')
      .update({ status: 'failed', error_message: String(err) })
      .eq('id', generation.id)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }

  if (drafts.length === 0) {
    console.error('[api/capture/url/process] no drafts parsed', { url })
    return NextResponse.json({ error: 'No drafts generated' }, { status: 500 })
  }

  // ── Create one output row per draft ───────────────────────────────────────
  const outputInserts = drafts.map((d) => ({
    workspace_id: session.workspaceId,
    generation_id: generation.id,
    status: 'draft' as const,
    title: d.hook?.slice(0, 120) || d.angle,
    content: { body: d.body, hook: d.hook, hashtags: d.hashtags, angle: d.angle },
  }))

  const { data: outputs, error: outputError } = await supabase
    .from('outputs')
    .insert(outputInserts)
    .select('id, title, content')

  if (outputError || !outputs || outputs.length === 0) {
    return NextResponse.json({ error: 'Failed to save drafts' }, { status: 500 })
  }

  console.log('[api/capture/url/process] success', { url, draft_count: outputs.length, duration_ms: Date.now() - t0 })

  return NextResponse.json({
    capture_id: capture.id,
    page_title: pageTitle,
    drafts: outputs.map((o, i) => ({
      output_id: o.id,
      angle: drafts[i].angle,
      hook: drafts[i].hook,
      preview: drafts[i].body.slice(0, 200),
    })),
  })
}
