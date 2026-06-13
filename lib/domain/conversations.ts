import { createClient } from '@/lib/supabase/server'
import type {
  ConversationSource, ConversationItem, ConversationOpportunity,
  ConversationResponse, ConversationTheme, ConversationFollowedAuthor,
  ConversationFollowedPublication, ConversationSourceType, ConversationContentType,
  ConversationOpportunityType, ConversationOpportunityStatus, ConversationPreferences, DomainResult,
} from '@/types/domain'

const DEFAULT_PREFERENCES: ConversationPreferences = {
  focusTopics: [],
  blockedKeywords: [],
  minOpportunityScore: 40,
  mutedSources: [],
}

// conversation_* tables are not yet in types/db.ts (apply migration, then regenerate types).
// All queries cast supabase to `any` to bypass strict table typing until then.

// ─── Sources ─────────────────────────────────────────────────────────────────

export async function listConversationSources(workspaceId: string): Promise<DomainResult<ConversationSource[]>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('conversation_sources')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data.map(toSource) }
}

export async function listActiveConversationSources(workspaceId?: string): Promise<DomainResult<ConversationSource[]>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  let q = supabase.from('conversation_sources').select('*').eq('active', true)
  if (workspaceId) q = q.eq('workspace_id', workspaceId)
  const { data, error } = await q
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data.map(toSource) }
}

export async function insertConversationSource(params: {
  workspaceId: string
  sourceType: ConversationSourceType
  sourceUrl: string
  title?: string | null
  author?: string | null
  provider?: string | null
  keywordQuery?: string | null
  normalizedKeyword?: string | null
  config?: Record<string, unknown> | null
}): Promise<DomainResult<ConversationSource> & { duplicate?: boolean }> {
  if (params.sourceType === 'keyword') {
    if (!params.provider || !params.keywordQuery || !params.normalizedKeyword) {
      return { ok: false, error: 'Keyword sources require provider, keywordQuery, and normalizedKeyword' }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('conversation_sources')
    .insert({
      workspace_id: params.workspaceId,
      source_type: params.sourceType,
      source_url: params.sourceUrl,
      title: params.title ?? null,
      author: params.author ?? null,
      fetch_status: 'pending',
      provider: params.provider ?? null,
      keyword_query: params.keywordQuery ?? null,
      normalized_keyword: params.normalizedKeyword ?? null,
      config: params.config ?? null,
    })
    .select().single()
  if (error) {
    // Unique constraint violation — return existing row rather than failing
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('conversation_sources')
        .select()
        .eq('workspace_id', params.workspaceId)
        .eq('source_url', params.sourceUrl)
        .eq('source_type', params.sourceType)
        .single()
      if (existing) return { ok: true, data: toSource(existing), duplicate: true }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, data: toSource(data) }
}

export async function countKeywordMonitors(workspaceId: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { count } = await supabase
    .from('conversation_sources')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('source_type', 'keyword')
    .eq('active', true)
  return count ?? 0
}

export async function updateConversationSource(
  id: string, workspaceId: string,
  updates: Partial<{ active: boolean; title: string; author: string; authority_score: number }>
): Promise<DomainResult<ConversationSource>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('conversation_sources')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).eq('workspace_id', workspaceId).select().single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toSource(data) }
}

export async function deleteConversationSource(id: string, workspaceId: string): Promise<DomainResult<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('conversation_sources').delete().eq('id', id).eq('workspace_id', workspaceId)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function markSourceStatus(id: string, status: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  await supabase.from('conversation_sources').update({ fetch_status: status }).eq('id', id)
}

export async function markSourceSuccess(
  id: string,
  itemCount: number,
  fetchStatus?: string,
  fetchItemCount?: number,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { last_fetched_at: now, consecutive_failures: 0 }
  if (itemCount > 0) updates.last_successful_fetch_at = now
  if (fetchStatus    != null) updates.fetch_status     = fetchStatus
  if (fetchItemCount != null) updates.fetch_item_count = fetchItemCount
  await supabase.from('conversation_sources').update(updates).eq('id', id)
}

export async function markSourceError(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('conversation_sources')
    .select('consecutive_failures')
    .eq('id', id)
    .single()
  await supabase.from('conversation_sources').update({
    last_fetched_at: now,
    last_error_at: now,
    fetch_status: 'error',
    consecutive_failures: ((data?.consecutive_failures as number) ?? 0) + 1,
  }).eq('id', id)
}

// ─── Followed Authors ─────────────────────────────────────────────────────────

export async function listFollowedAuthors(workspaceId: string): Promise<DomainResult<ConversationFollowedAuthor[]>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('conversation_followed_authors')
    .select('*').eq('workspace_id', workspaceId).order('name')
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data.map(toAuthor) }
}

export async function insertFollowedAuthor(params: {
  workspaceId: string; name: string; url?: string | null; publication?: string | null
}): Promise<DomainResult<ConversationFollowedAuthor>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('conversation_followed_authors')
    .insert({ workspace_id: params.workspaceId, name: params.name, url: params.url ?? null, publication: params.publication ?? null })
    .select().single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toAuthor(data) }
}

export async function deleteFollowedAuthor(id: string, workspaceId: string): Promise<DomainResult<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('conversation_followed_authors').delete().eq('id', id).eq('workspace_id', workspaceId)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

// ─── Items ────────────────────────────────────────────────────────────────────

// Returns null data (not an error) if item already exists.
export async function insertConversationItemIfNew(params: {
  sourceId: string; workspaceId: string; externalId: string; contentHash: string | null
  canonicalUrl: string | null; contentType: ConversationContentType
  title: string | null; author: string | null; authorUrl: string | null
  publication: string | null; sourceUrl: string; excerpt: string | null
  bodyMarkdown: string | null; heroImage: string | null; publishedAt: string | null
  metadata: Record<string, unknown>
  // Provider-native identifiers (connector-backed providers like LinkedIn-via-Unipile).
  provider?: string | null; providerItemId?: string | null; providerSocialId?: string | null
  providerUrl?: string | null; providerMetadata?: Record<string, unknown> | null
}): Promise<DomainResult<ConversationItem | null>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('conversation_items')
    .insert({
      source_id: params.sourceId, workspace_id: params.workspaceId, external_id: params.externalId,
      content_hash: params.contentHash, canonical_url: params.canonicalUrl, content_type: params.contentType,
      title: params.title, author: params.author, author_url: params.authorUrl, publication: params.publication,
      source_url: params.sourceUrl, excerpt: params.excerpt, body_markdown: params.bodyMarkdown,
      hero_image: params.heroImage, published_at: params.publishedAt, metadata: params.metadata,
      provider: params.provider ?? null, provider_item_id: params.providerItemId ?? null,
      provider_social_id: params.providerSocialId ?? null, provider_url: params.providerUrl ?? null,
      provider_metadata: params.providerMetadata ?? null,
    })
    .select().maybeSingle()
  if (error) {
    // 23505 = unique_violation: (source_id, external_id), (workspace_id, canonical_url),
    // or the provider dedupe indexes (workspace_id, provider, provider_social_id|item_id).
    if (error.code === '23505') return { ok: true, data: null }
    return { ok: false, error: error.message }
  }
  return { ok: true, data: data ? toItem(data) : null }
}

export async function getRecentConversationItems(workspaceId: string, days = 14): Promise<DomainResult<ConversationItem[]>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('conversation_items')
    .select('id, title, excerpt, published_at, source_id, workspace_id, external_id, content_hash, canonical_url, content_type, author, author_url, publication, source_url, body_markdown, summary, hero_image, metadata, created_at')
    .eq('workspace_id', workspaceId)
    .gte('created_at', since)
    .order('published_at', { ascending: false })
    .limit(50)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data.map(toItem) }
}

// ─── Themes ───────────────────────────────────────────────────────────────────

// Upserts a theme by content_hash: updates last_seen_at + theme_score if exists, creates if not.
// Resets theme_status to 'active' on re-detection.
export async function upsertConversationTheme(params: {
  workspaceId: string; title: string; summary: string; themeScore: number
  contentHash: string; itemIds: string[]
}): Promise<DomainResult<ConversationTheme>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data: existing } = await supabase
    .from('conversation_themes')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('content_hash', params.contentHash)
    .maybeSingle()

  let themeId: string

  if (existing) {
    const { error } = await supabase
      .from('conversation_themes')
      .update({ theme_score: params.themeScore, last_seen_at: new Date().toISOString(), theme_status: 'active' })
      .eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
    themeId = existing.id
  } else {
    const { data: created, error } = await supabase
      .from('conversation_themes')
      .insert({
        workspace_id: params.workspaceId, title: params.title, summary: params.summary,
        theme_score: params.themeScore, content_hash: params.contentHash,
        first_detected_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
      })
      .select('id').single()
    if (error) return { ok: false, error: error.message }
    themeId = created.id
  }

  if (params.itemIds.length > 0) {
    await supabase.from('conversation_theme_items')
      .upsert(params.itemIds.map((item_id: string) => ({ theme_id: themeId, item_id })), { onConflict: 'theme_id,item_id' })
  }

  const { data: theme, error: fetchErr } = await supabase
    .from('conversation_themes').select('*').eq('id', themeId).single()
  if (fetchErr) return { ok: false, error: fetchErr.message }
  return { ok: true, data: toTheme(theme) }
}

export async function listConversationThemes(workspaceId: string): Promise<DomainResult<ConversationTheme[]>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('conversation_themes')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('active', true)
    .in('theme_status', ['active', 'cooling'])
    .order('theme_score', { ascending: false })
    .limit(20)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data.map(toTheme) }
}

// Age stale themes: active → cooling (14d), cooling → archived (45d).
export async function ageConversationThemes(workspaceId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const now = Date.now()
  const coolingThreshold = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()
  const archiveThreshold = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString()
  await Promise.all([
    supabase.from('conversation_themes')
      .update({ theme_status: 'cooling' })
      .eq('workspace_id', workspaceId).eq('theme_status', 'active').lt('last_seen_at', coolingThreshold),
    supabase.from('conversation_themes')
      .update({ theme_status: 'archived' })
      .eq('workspace_id', workspaceId).eq('theme_status', 'cooling').lt('last_seen_at', archiveThreshold),
  ])
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function listConversationOpportunities(
  workspaceId: string,
  options: { status?: ConversationOpportunityStatus; limit?: number; offset?: number; minScore?: number } = {}
): Promise<DomainResult<ConversationOpportunity[]>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0
  let q = supabase
    .from('conversation_opportunities')
    .select(`*, item:conversation_items(*, source:conversation_sources(id, source_type, title, author, source_url, authority_score))`)
    .eq('workspace_id', workspaceId)
    .order('overall_score', { ascending: false })
    .range(offset, offset + limit - 1)
  if (options.status) q = q.eq('status', options.status)
  if (options.minScore && options.minScore > 0) q = q.gte('overall_score', options.minScore)
  const { data, error } = await q
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data.map(toOpportunity) }
}

export async function insertConversationOpportunities(
  opportunities: Array<{
    workspaceId: string; itemId: string; themeId?: string | null
    opportunityType: ConversationOpportunityType; title: string; explanation: string
    whyThisMatters?: string | null
    relevanceScore: number; timelinessScore: number; uniquenessScore: number
    opportunityScore: number; authorityScore: number; overallScore: number
  }>
): Promise<DomainResult<void>> {
  if (opportunities.length === 0) return { ok: true, data: undefined }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('conversation_opportunities')
    .upsert(
      opportunities.map(o => ({
        workspace_id: o.workspaceId, item_id: o.itemId, theme_id: o.themeId ?? null,
        opportunity_type: o.opportunityType, title: o.title, explanation: o.explanation,
        why_this_matters: o.whyThisMatters ?? null,
        relevance_score: o.relevanceScore, timeliness_score: o.timelinessScore,
        uniqueness_score: o.uniquenessScore, opportunity_score: o.opportunityScore,
        authority_score: o.authorityScore, overall_score: o.overallScore,
      })),
      { onConflict: 'item_id,opportunity_type', ignoreDuplicates: true }
    )
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

// Phase 4 linking pass: set theme_id on opportunities whose item belongs to a detected theme.
export async function linkOpportunitiesToThemes(workspaceId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: themeItems } = await supabase
    .from('conversation_theme_items')
    .select('theme_id, item_id, theme:conversation_themes!inner(workspace_id)')
    .eq('theme.workspace_id', workspaceId)
  if (!themeItems || themeItems.length === 0) return

  const itemToTheme = new Map<string, string>()
  for (const row of themeItems) {
    itemToTheme.set(row.item_id as string, row.theme_id as string)
  }

  for (const [itemId, themeId] of itemToTheme) {
    await supabase
      .from('conversation_opportunities')
      .update({ theme_id: themeId })
      .eq('item_id', itemId)
      .eq('workspace_id', workspaceId)
      .is('theme_id', null)
  }
}

// Suppress duplicate opportunities: same theme + same type within the current ISO week.
// Keeps highest overall_score, suppresses the rest.
export async function suppressSimilarOpportunities(workspaceId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const weekStart = getISOWeekStart()
  const { data: opps } = await supabase
    .from('conversation_opportunities')
    .select('id, theme_id, opportunity_type, overall_score, generated_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .not('theme_id', 'is', null)
    .gte('generated_at', weekStart)
  if (!opps || opps.length === 0) return

  const groups = new Map<string, typeof opps>()
  for (const opp of opps) {
    const key = `${opp.theme_id}:${opp.opportunity_type}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(opp)
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue
    const sorted = [...group].sort((a, b) => (b.overall_score as number) - (a.overall_score as number))
    const toSuppress = sorted.slice(1).map((o: { id: string }) => o.id)
    await supabase
      .from('conversation_opportunities')
      .update({ status: 'suppressed', suppressed_reason: 'same_theme_type_week' })
      .in('id', toSuppress)
  }
}

function getISOWeekStart(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString()
}

export async function updateConversationOpportunityStatus(
  id: string, workspaceId: string, status: ConversationOpportunityStatus
): Promise<DomainResult<ConversationOpportunity>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('conversation_opportunities')
    .update({ status })
    .eq('id', id).eq('workspace_id', workspaceId).select().single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toOpportunity(data) }
}

// ─── Responses ────────────────────────────────────────────────────────────────

export async function insertConversationResponse(params: {
  workspaceId: string; opportunityId: string; responseType: string; content: string
  model?: string | null; generationMetadata?: Record<string, unknown> | null
}): Promise<DomainResult<ConversationResponse>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('conversation_responses')
    .insert({
      workspace_id: params.workspaceId, opportunity_id: params.opportunityId,
      response_type: params.responseType, content: params.content,
      model: params.model ?? null, generation_metadata: params.generationMetadata ?? null,
    })
    .select().single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toResponse(data) }
}

export async function listConversationResponses(
  workspaceId: string,
  options: { opportunityId?: string; limit?: number } = {}
): Promise<DomainResult<ConversationResponse[]>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  let q = supabase
    .from('conversation_responses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 50)
  if (options.opportunityId) q = q.eq('opportunity_id', options.opportunityId)
  const { data, error } = await q
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data.map(toResponse) }
}

// Marks a drafted response as published — used by the copy-only "mark as posted manually"
// flow (Phase 4A). NO provider/outbound action occurs here; this only records that the
// user posted the comment themselves. Merges generation_metadata.postedVia='manual'
// without clobbering the existing snapshot.
export async function publishConversationResponse(params: {
  id: string; workspaceId: string; content?: string | null
  publishedChannel: string; publishedUrl?: string | null
}): Promise<DomainResult<ConversationResponse>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: existing } = await supabase
    .from('conversation_responses')
    .select('generation_metadata')
    .eq('id', params.id).eq('workspace_id', params.workspaceId).maybeSingle()

  const generationMetadata = { ...(existing?.generation_metadata ?? {}), postedVia: 'manual' }
  const update: Record<string, unknown> = {
    status: 'published',
    published_channel: params.publishedChannel,
    published_url: params.publishedUrl ?? null,
    published_at: new Date().toISOString(),
    generation_metadata: generationMetadata,
  }
  if (params.content != null) update.content = params.content

  const { data, error } = await supabase
    .from('conversation_responses')
    .update(update)
    .eq('id', params.id).eq('workspace_id', params.workspaceId)
    .select().single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toResponse(data) }
}

// ─── Followed context (for pipeline authority boosts) ────────────────────────

export async function loadFollowedContext(workspaceId: string): Promise<{
  authorNames: string[]
  publicationUrls: string[]
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const [authorsRes, pubsRes] = await Promise.all([
    supabase.from('conversation_followed_authors').select('name').eq('workspace_id', workspaceId).eq('active', true),
    supabase.from('conversation_followed_publications').select('url').eq('workspace_id', workspaceId).eq('active', true),
  ])
  return {
    authorNames: ((authorsRes.data ?? []) as { name: string }[]).map(a => a.name.toLowerCase()),
    publicationUrls: ((pubsRes.data ?? []) as { url: string }[]).map(p => p.url),
  }
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export async function getConversationPreferences(workspaceId: string): Promise<DomainResult<ConversationPreferences>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('workspace_feed_settings')
    .select('conversation_preferences')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  const prefs = (data?.conversation_preferences as Partial<ConversationPreferences>) ?? {}
  return {
    ok: true,
    data: {
      focusTopics: prefs.focusTopics ?? DEFAULT_PREFERENCES.focusTopics,
      blockedKeywords: prefs.blockedKeywords ?? DEFAULT_PREFERENCES.blockedKeywords,
      minOpportunityScore: prefs.minOpportunityScore ?? DEFAULT_PREFERENCES.minOpportunityScore,
      mutedSources: prefs.mutedSources ?? DEFAULT_PREFERENCES.mutedSources,
    },
  }
}

export async function upsertConversationPreferences(
  workspaceId: string,
  prefs: Partial<ConversationPreferences>
): Promise<DomainResult<ConversationPreferences>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const existing = await getConversationPreferences(workspaceId)
  const current = existing.ok ? existing.data : DEFAULT_PREFERENCES
  const merged: ConversationPreferences = {
    focusTopics: prefs.focusTopics ?? current.focusTopics,
    blockedKeywords: prefs.blockedKeywords ?? current.blockedKeywords,
    minOpportunityScore: prefs.minOpportunityScore ?? current.minOpportunityScore,
    mutedSources: prefs.mutedSources ?? current.mutedSources,
  }
  const { error } = await supabase
    .from('workspace_feed_settings')
    .upsert({ workspace_id: workspaceId, conversation_preferences: merged }, { onConflict: 'workspace_id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: merged }
}

// ─── Workspace context ────────────────────────────────────────────────────────

export async function loadConversationWorkspaceContext(workspaceId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const [profileRes, feedRes, recentOutputsRes] = await Promise.all([
    supabase.from('profiles').select('display_name, tone_notes, mental_models, philosophies, target_audiences, sample_content').eq('workspace_id', workspaceId).maybeSingle(),
    supabase.from('workspace_feed_settings').select('content_topics, services, conversation_preferences').eq('workspace_id', workspaceId).maybeSingle(),
    supabase.from('outputs').select('content').eq('workspace_id', workspaceId).eq('status', 'published').order('created_at', { ascending: false }).limit(5),
  ])
  const p = profileRes.data
  const f = feedRes.data
  const prefs = (f?.conversation_preferences as Partial<ConversationPreferences>) ?? {}
  const recentPosts = ((recentOutputsRes.data ?? []) as { content: unknown }[])
    .map(o => (typeof o.content === 'object' && o.content !== null ? (o.content as Record<string, unknown>).body ?? '' : String(o.content ?? '')))
    .filter(Boolean)
    .map((s: unknown) => String(s).slice(0, 200))
  return {
    displayName: (p?.display_name as string) ?? 'the workspace',
    toneNotes: (p?.tone_notes as string) ?? '',
    mentalModels: JSON.stringify(p?.mental_models ?? []),
    philosophies: JSON.stringify(p?.philosophies ?? []),
    targetAudiences: (p?.target_audiences as string[]) ?? [],
    sampleContent: (p?.sample_content as string[]) ?? [],
    contentTopics: (f?.content_topics as string[]) ?? [],
    services: (f?.services as string[]) ?? [],
    focusTopics: prefs.focusTopics ?? [],
    blockedKeywords: prefs.blockedKeywords ?? [],
    recentPublishedPosts: recentPosts as string[],
    activeThemes: [] as { title: string; themeScore: number; sourceCount: number }[],
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSource(r: any): ConversationSource {
  return {
    id: r.id, workspaceId: r.workspace_id, sourceType: r.source_type, sourceUrl: r.source_url,
    title: r.title, author: r.author, active: r.active, authorityScore: r.authority_score ?? 50,
    lastFetchedAt: r.last_fetched_at, lastSuccessfulFetchAt: r.last_successful_fetch_at ?? null,
    lastErrorAt: r.last_error_at ?? null, consecutiveFailures: r.consecutive_failures ?? 0,
    fetchStatus: r.fetch_status ?? null, fetchItemCount: r.fetch_item_count ?? null,
    createdAt: r.created_at,
    provider: r.provider ?? null,
    keywordQuery: r.keyword_query ?? null,
    normalizedKeyword: r.normalized_keyword ?? null,
    config: r.config ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAuthor(r: any): ConversationFollowedAuthor {
  return { id: r.id, workspaceId: r.workspace_id, name: r.name, url: r.url, publication: r.publication, active: r.active, createdAt: r.created_at }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toItem(r: any): ConversationItem {
  return {
    id: r.id, sourceId: r.source_id, workspaceId: r.workspace_id, externalId: r.external_id,
    contentHash: r.content_hash, canonicalUrl: r.canonical_url, contentType: r.content_type,
    title: r.title, author: r.author, authorUrl: r.author_url, publication: r.publication,
    sourceUrl: r.source_url, excerpt: r.excerpt, bodyMarkdown: r.body_markdown, summary: r.summary,
    heroImage: r.hero_image, publishedAt: r.published_at, metadata: r.metadata ?? {}, createdAt: r.created_at,
    provider: r.provider ?? null, providerUrl: r.provider_url ?? null, providerSocialId: r.provider_social_id ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTheme(r: any): ConversationTheme {
  return {
    id: r.id, workspaceId: r.workspace_id, title: r.title, summary: r.summary,
    themeScore: r.theme_score, contentHash: r.content_hash,
    firstDetectedAt: r.first_detected_at, lastSeenAt: r.last_seen_at,
    themeStatus: r.theme_status ?? 'active', active: r.active, createdAt: r.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOpportunity(r: any): ConversationOpportunity {
  return {
    id: r.id, workspaceId: r.workspace_id, itemId: r.item_id, themeId: r.theme_id,
    opportunityType: r.opportunity_type, title: r.title, explanation: r.explanation,
    whyThisMatters: r.why_this_matters ?? null,
    relevanceScore: r.relevance_score, timelinessScore: r.timeliness_score,
    uniquenessScore: r.uniqueness_score, opportunityScore: r.opportunity_score,
    authorityScore: r.authority_score ?? 50, overallScore: r.overall_score,
    status: r.status, suppressedReason: r.suppressed_reason ?? null, generatedAt: r.generated_at,
    item: r.item ? toItem({ ...r.item }) : undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toResponse(r: any): ConversationResponse {
  return {
    id: r.id, workspaceId: r.workspace_id, opportunityId: r.opportunity_id,
    responseType: r.response_type, content: r.content, status: r.status,
    publishedChannel: r.published_channel ?? null, publishedUrl: r.published_url ?? null,
    publishedAt: r.published_at ?? null, model: r.model ?? null,
    generationMetadata: r.generation_metadata ?? null, createdAt: r.created_at,
  }
}
