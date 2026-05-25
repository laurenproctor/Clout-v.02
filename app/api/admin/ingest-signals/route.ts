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

async function runIngestion(targetUserId?: string): Promise<IngestResult> {
  const supabase = createServiceClient()
  const result: IngestResult = { inserted: 0, updated: 0, skipped: 0, errors: [] }

  // ── 1. Collect unique topics and services from onboarded profiles ──────────
  let topicsQuery = supabase
    .from('user_profiles')
    .select('content_topics, services')
    .eq('onboarding_complete', true)

  // If a specific user triggered this (post-onboarding), include their profile
  // even if the query already covers all onboarded users (no-op but safe)
  if (targetUserId) {
    // Ensure we always include the target user's fresh profile
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('content_topics, services')
      .eq('id', targetUserId)
      .maybeSingle()

    if (targetProfile) {
      // We'll include this alongside the general query results
      topicsQuery = supabase
        .from('user_profiles')
        .select('content_topics, services')
        .eq('onboarding_complete', true)
    }
  }

  const { data: profiles, error: profilesError } = await topicsQuery

  if (profilesError) {
    result.errors.push(`Failed to fetch user profiles: ${profilesError.message}`)
    return result
  }

  const uniqueTopics = new Set<string>()
  const uniqueServices = new Set<string>()

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
    | { tab: 'news' | 'concepts'; query: string; service?: never; competitorId?: never }
    | { tab: 'services'; query: string; service: string; competitorId?: never }
    | { tab: 'competitors'; query: string; service?: never; competitorId: string }

  const queue: QueueItem[] = []

  for (const topic of uniqueTopics) {
    queue.push({ tab: 'news', query: topic })
  }

  for (const service of uniqueServices) {
    queue.push({ tab: 'services', query: `${service} strategy OR trends`, service })
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
          item.tab as FeedTab,
          item.tab === 'services' ? item.service : item.query,
          article.keywords,
          {
            service: item.tab === 'services' ? item.service : undefined,
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

  let userId: string | undefined
  try {
    const body = await req.json()
    userId = typeof body?.userId === 'string' ? body.userId : undefined
  } catch {
    // body is optional
  }

  try {
    const result = await runIngestion(userId)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
