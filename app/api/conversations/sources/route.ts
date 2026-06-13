import { NextRequest, NextResponse, after } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { isSafeUrl } from '@/lib/scraper/isSafeUrl'
import { getProvider } from '@/lib/conversations/providers'
import { SubstackProvider } from '@/lib/conversations/providers/substack'
import { probeSubstackOrigin } from '@/lib/scraper/substack'
import { listConversationSources, insertConversationSource, countKeywordMonitors } from '@/lib/domain/conversations'
import { ingestSingleSource } from '@/lib/conversations/pipeline'
import { getWorkspaceLimit } from '@/lib/billing/entitlements'
import { normalizeKeyword, getDefaultKeywordConfig } from '@/lib/conversations/keyword'
import { evaluateUnipileMonitoring } from '@/lib/unipile/gates'
import type { KeywordProvider } from '@/types/domain'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await listConversationSources(session.workspaceId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  // ── Keyword monitor ────────────────────────────────────────────────────────
  if (body.sourceType === 'keyword') {
    const rawKeyword = ((body.keywordQuery as string) ?? '').trim().replace(/\s+/g, ' ')
    const kProvider  = body.provider as string | undefined

    if (!rawKeyword || !kProvider) {
      return NextResponse.json({ error: 'keywordQuery and provider are required' }, { status: 400 })
    }

    const current = await countKeywordMonitors(session.workspaceId)
    const limit   = await getWorkspaceLimit(session.workspaceId, 'keyword_monitors')
    if (current >= limit) {
      return NextResponse.json(
        { error: `Monitor limit reached (${limit}). Upgrade to add more.` },
        { status: 403 },
      )
    }

    // LinkedIn keyword monitoring runs through the Unipile beta connector — don't let a
    // user create a monitor that can't run. Gate on master flag + kill switch + workspace
    // monitoring beta + a live connection before inserting.
    if (kProvider === 'linkedin') {
      const gate = await evaluateUnipileMonitoring({ workspaceId: session.workspaceId })
      if (!gate.allowed) {
        return NextResponse.json({ error: gate.message, reason: gate.reason }, { status: 403 })
      }
    }

    const normalizedKw = normalizeKeyword(rawKeyword)
    const sourceUrl    = kProvider === 'linkedin'
      ? `linkedin://search?q=${encodeURIComponent(normalizedKw)}`
      : `https://www.reddit.com/search?q=${encodeURIComponent(normalizedKw)}&sort=new`
    const config       = getDefaultKeywordConfig(kProvider as KeywordProvider)

    const result = await insertConversationSource({
      workspaceId:      session.workspaceId,
      sourceType:       'keyword',
      sourceUrl,
      title:            (body.title as string | undefined)?.trim() || rawKeyword,
      author:           null,
      provider:         kProvider,
      keywordQuery:     rawKeyword,
      normalizedKeyword: normalizedKw,
      config,
    })
    if (!result.ok)       return NextResponse.json({ error: result.error }, { status: 500 })
    if (result.duplicate) return NextResponse.json(result.data, { status: 409 })
    after(ingestSingleSource(result.data))
    return NextResponse.json(result.data, { status: 201 })
  }

  // ── URL-based source ───────────────────────────────────────────────────────
  if (!body.sourceUrl) return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
  if (!isSafeUrl(body.sourceUrl)) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })

  const notesMode = body.notesMode === true

  let provider = getProvider(body.sourceUrl)
  if (provider.sourceType !== 'substack') {
    const isSubstackSite = await probeSubstackOrigin(body.sourceUrl).catch(() => false)
    if (isSubstackSite) provider = new SubstackProvider('articles')
  }

  const sourceType = notesMode && provider.sourceType === 'substack'
    ? 'substack_notes' as const
    : provider.sourceType

  const result = await insertConversationSource({
    workspaceId: session.workspaceId,
    sourceType,
    sourceUrl: body.sourceUrl,
    title: body.title ?? null,
    author: body.author ?? null,
  })
  if (!result.ok)       return NextResponse.json({ error: result.error }, { status: 500 })
  if (result.duplicate) return NextResponse.json(result.data, { status: 409 })
  after(ingestSingleSource(result.data))
  return NextResponse.json(result.data, { status: 201 })
}
