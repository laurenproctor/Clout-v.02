import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { searchLatest } from '@/lib/newsdata/client'
import {
  articleToSignalInsert,
  signalToCardInsert,
} from '@/lib/newsdata/mapper'
import type { FeedTab } from '@/types/feed'

// Queries used for the concepts tab (universal, not user-topic-driven)
const CONCEPT_QUERIES = [
  'emerging business framework',
  'industry paradigm shift',
  'new marketing approach',
  'content strategy framework',
]

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function isAuthorized(req: NextRequest): boolean {
  // GET: Vercel cron — validates Authorization: Bearer {CRON_SECRET}
  if (req.method === 'GET') {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) return false
    const authHeader = req.headers.get('authorization')
    return authHeader === `Bearer ${cronSecret}`
  }
  // POST: manual trigger — validates x-admin-secret header
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false
  return req.headers.get('x-admin-secret') === adminSecret
}

interface IngestResult {
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

async function runIngestion(): Promise<IngestResult> {
  const supabase = createServiceClient()
  const result: IngestResult = { inserted: 0, updated: 0, skipped: 0, errors: [] }

  // ── 1. Collect unique topics and services ─────────────────────────────────
  // workspace_feed_settings is the primary source (written by the settings UI).
  // user_profiles is the fallback for users who haven't saved workspace settings.
  const [
    { data: wsSettings, error: wsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase.from('workspace_feed_settings').select('content_topics, services'),
    supabase
      .from('user_profiles')
      .select('content_topics, services')
      .eq('onboarding_complete', true),
  ])

  if (profilesError) {
    result.errors.push(`Failed to fetch user profiles: ${profilesError.message}`)
    return result
  }
  if (wsError) {
    result.errors.push(`Failed to fetch workspace feed settings: ${wsError.message}`)
    return result
  }

  const uniqueTopics = new Set<string>()
  const uniqueServices = new Set<string>()

  // Workspace settings take precedence — always included first
  for (const ws of wsSettings ?? []) {
    for (const t of ws.content_topics ?? []) uniqueTopics.add(t)
    for (const s of ws.services ?? []) uniqueServices.add(s)
  }

  // Legacy user_profiles (onboarding path, pre-workspace-settings migration)
  for (const profile of profiles ?? []) {
    for (const t of profile.content_topics ?? []) uniqueTopics.add(t)
    for (const s of profile.services ?? []) uniqueServices.add(s)
  }

  // ── 2. Fetch competitor entities ───────────────────────────────────────────
  const { data: competitorEntities } = await supabase
    .from('competitor_entities')
    .select('id, name, handle, domain')

  // ── 3. Build ingestion queue ───────────────────────────────────────────────
  type QueueItem =
    | { tab: 'news' | 'concepts'; query: string; competitorId?: never }
    | { tab: 'competitors'; query: string; competitorId: string }

  const queue: QueueItem[] = []

  for (const topic of uniqueTopics) {
    queue.push({ tab: 'news', query: topic })
  }

  for (const conceptQuery of CONCEPT_QUERIES) {
    queue.push({ tab: 'concepts', query: conceptQuery })
  }

  for (const entity of competitorEntities ?? []) {
    const searchTerm = entity.name ?? entity.domain ?? entity.handle
    if (searchTerm) {
      queue.push({ tab: 'competitors', query: searchTerm, competitorId: entity.id })
    }
  }

  // Cap at 60 requests to stay within newsdata.io free plan limits
  const cappedQueue = queue.slice(0, 60)

  // ── 4. Ingest each query ───────────────────────────────────────────────────
  for (const item of cappedQueue) {
    try {
      await delay(300) // rate limit: ~3 req/s

      const { articles } = await searchLatest(item.query)

      for (const article of articles) {
        const signalInsert = articleToSignalInsert(article)

        // Upsert signal by external_id — skip if already exists and unchanged
        const { data: existingSignal } = await supabase
          .from('signals')
          .select('id')
          .eq('external_id', signalInsert.external_id)
          .maybeSingle()

        let signalId: string

        if (existingSignal) {
          signalId = existingSignal.id
          result.skipped++
        } else {
          const { data: newSignal, error: signalError } = await supabase
            .from('signals')
            .insert({
              external_id: signalInsert.external_id,
              source: signalInsert.source,
              title: signalInsert.title,
              source_url: signalInsert.source_url,
              published_at: signalInsert.published_at,
              tone: signalInsert.tone,
              coverage_48h_pct: signalInsert.coverage_48h_pct,
              refreshed_at: new Date().toISOString(),
            })
            .select('id')
            .single()

          if (signalError || !newSignal) {
            result.errors.push(`Signal insert failed: ${signalError?.message}`)
            continue
          }

          signalId = newSignal.id
        }

        // Check if a card already exists for this signal + tab
        const { data: existingCard } = await supabase
          .from('signal_cards')
          .select('id')
          .eq('signal_id', signalId)
          .eq('tab', item.tab)
          .maybeSingle()

        const cardInsert = signalToCardInsert(
          { ...signalInsert, id: signalId },
          item.tab,
          item.query,
          article.keywords,
          {
            competitorId: item.tab === 'competitors' ? item.competitorId : undefined,
            conceptDescription: item.tab === 'concepts' ? (article.description ?? undefined) : undefined,
          }
        )

        if (existingCard) {
          await supabase
            .from('signal_cards')
            .update({ refreshed_at: new Date().toISOString(), ...cardInsert })
            .eq('id', existingCard.id)
          result.updated++
        } else {
          const { error: cardError } = await supabase
            .from('signal_cards')
            .insert({ signal_id: signalId, ...cardInsert })

          if (cardError) {
            result.errors.push(`Card insert failed: ${cardError.message}`)
          } else {
            result.inserted++

            // For competitors: also upsert a competitor_mention
            if (item.tab === 'competitors') {
              const { data: newCard } = await supabase
                .from('signal_cards')
                .select('id')
                .eq('signal_id', signalId)
                .eq('tab', 'competitors')
                .maybeSingle()

              if (newCard) {
                await supabase.from('competitor_mentions').upsert(
                  {
                    competitor_id: item.competitorId,
                    card_id: newCard.id,
                    signal_id: signalId,
                    headline: article.title,
                    published_at: signalInsert.published_at,
                    platform: article.source_id,
                    has_coverage: false,
                    fetched_at: new Date().toISOString(),
                  },
                  { onConflict: 'id' }
                )
              }
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`Query "${item.query}": ${msg}`)
    }
  }

  return result
}

// GET — Vercel cron (daily 06:00 UTC)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runIngestion()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — manual trigger (onboarding completion or dev testing)
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runIngestion()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
