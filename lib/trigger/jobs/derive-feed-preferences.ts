import { task, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'
import { callClaude } from '@/lib/ai/generate'
import type { Json } from '@/types/db'

interface CandidateTopic {
  topic: string
  confidence: number
  mentions: number
  first_suggested: string
}

// Stored preference profile (includes accumulated candidate state)
interface FeedPreferences {
  preferred_topics: string[]
  avoided_topics: string[]
  avoided_angles: string[]
  preferred_angles: string[]
  coverage_gaps: string[]
  candidate_topics: CandidateTopic[]
  approved_topics: string[]
  profile_confidence: number
  based_on_n_interactions: number
  last_updated: string
}

// Raw shape of Claude's JSON output (no accumulated fields)
interface ClaudeProfileOutput {
  preferred_topics?: string[]
  avoided_topics?: string[]
  avoided_angles?: string[]
  preferred_angles?: string[]
  coverage_gaps?: string[]
  candidate_topics?: Array<{ topic: string; confidence: number }>
  profile_confidence?: number
}

const SYSTEM_PROMPT = `You are a content intelligence engine. Analyze a user's signal feed interactions to build a preference profile.

Dismissed cards = content they don't want to see more of.
Engaged cards (draft started/copied/edited/published, source opened) = content that resonates and drives action.

Output ONLY a valid JSON object — no markdown, no explanation, no wrapper. Use this exact shape:

{
  "preferred_topics": [],
  "avoided_topics": [],
  "avoided_angles": [],
  "preferred_angles": [],
  "coverage_gaps": [],
  "candidate_topics": [],
  "profile_confidence": 0.0
}

Field guidance:
- preferred_topics: specific topics/themes they consistently engage with (max 10, specific not vague)
- avoided_topics: topics/themes they consistently dismiss (max 10)
- avoided_angles: framing styles they dismiss — e.g. "alarmist", "surface-level overview", "vendor-sponsored" (max 5)
- preferred_angles: framing styles in content they engage with — e.g. "contrarian", "practitioner perspective", "data-driven" (max 5)
- coverage_gaps: adjacent or emerging topics they haven't engaged with yet but would likely find valuable based on patterns (max 3, high confidence only)
- candidate_topics: new topics for content ingestion expansion — topics related to their interests that aren't currently in their feed (max 5). Each must have "topic" (string), "confidence" (0-1 float)
- profile_confidence: 0-1 float reflecting certainty of the profile given interaction volume (low if < 10 interactions, high if > 30)`

function buildUserMessage(
  dismissed: Array<{ title: string; tags: string[]; tone: string }>,
  engaged: Array<{ title: string; tags: string[]; tone: string; interaction_type: string }>,
): string {
  const lines: string[] = []

  lines.push(`DISMISSED (${dismissed.length} cards):`)
  if (dismissed.length === 0) {
    lines.push('  (none)')
  } else {
    for (const c of dismissed) {
      lines.push(`  - "${c.title}" [tags: ${c.tags.join(', ')}] [tone: ${c.tone}]`)
    }
  }

  lines.push('')
  lines.push(`ENGAGED (${engaged.length} cards — draft started, copied, published, source opened):`)
  if (engaged.length === 0) {
    lines.push('  (none)')
  } else {
    for (const c of engaged) {
      lines.push(`  - "${c.title}" [tags: ${c.tags.join(', ')}] [tone: ${c.tone}] [action: ${c.interaction_type}]`)
    }
  }

  return lines.join('\n')
}

function mergeWithExistingCandidates(
  newCandidates: Array<{ topic: string; confidence: number }>,
  existingProfile: FeedPreferences | null,
  existingApproved: string[],
  now: string,
): { updatedCandidates: CandidateTopic[]; newlyApproved: string[] } {
  const updatedCandidates: CandidateTopic[] = []
  const newlyApproved: string[] = []

  for (const candidate of newCandidates) {
    if (existingApproved.includes(candidate.topic)) continue

    const prior = existingProfile?.candidate_topics?.find(c => c.topic === candidate.topic)
    const mentions = (prior?.mentions ?? 0) + 1
    const isApproved = mentions >= 2 || candidate.confidence >= 0.85

    if (isApproved) {
      newlyApproved.push(candidate.topic)
    } else {
      updatedCandidates.push({
        topic: candidate.topic,
        confidence: candidate.confidence,
        mentions,
        first_suggested: prior?.first_suggested ?? now,
      })
    }
  }

  return { updatedCandidates, newlyApproved }
}

export const deriveFeedPreferencesJob = task({
  id: 'derive-feed-preferences',
  retry: { maxAttempts: 2 },
  run: async (payload: { workspace_id: string; user_id: string }) => {
    const { workspace_id, user_id } = payload
    const supabase = createServiceClient()

    await logger.info('derive-feed-preferences: starting', { workspace_id, user_id })

    // Load last 100 interactions with card data
    const { data: interactions, error: intError } = await supabase
      .from('user_signal_interactions')
      .select('interaction_type, signal_card_id, signal_cards(title, tags, tone)')
      .eq('user_id', user_id)
      .in('interaction_type', ['dismissed', 'card_expanded', 'source_opened', 'draft_started', 'draft_edited', 'draft_copied', 'published'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (intError) {
      await logger.error('Failed to load interactions', { error: intError.message })
      return
    }

    const total = (interactions ?? []).length
    if (total < 5) {
      await logger.info('Not enough interactions to derive profile', { total })
      return
    }

    const POSITIVE_TYPES = new Set(['card_expanded', 'source_opened', 'draft_started', 'draft_edited', 'draft_copied', 'published'])

    const dismissed: Array<{ title: string; tags: string[]; tone: string }> = []
    const engaged: Array<{ title: string; tags: string[]; tone: string; interaction_type: string }> = []

    for (const row of interactions ?? []) {
      const card = row.signal_cards as { title?: string; tags?: string[]; tone?: string } | null
      if (!card?.title) continue

      const entry = {
        title: card.title,
        tags: card.tags ?? [],
        tone: card.tone ?? 'neutral',
        interaction_type: row.interaction_type,
      }

      if (row.interaction_type === 'dismissed') {
        dismissed.push(entry)
      } else if (POSITIVE_TYPES.has(row.interaction_type)) {
        engaged.push(entry)
      }
    }

    // Load existing profile for candidate accumulation
    const { data: ws } = await supabase
      .from('workspace_feed_settings')
      .select('feed_preferences')
      .eq('workspace_id', workspace_id)
      .maybeSingle()

    const existingProfile = (ws?.feed_preferences ?? null) as FeedPreferences | null
    const existingApproved = existingProfile?.approved_topics ?? []

    // Call Claude
    const userMessage = buildUserMessage(dismissed, engaged)
    let parsed: ClaudeProfileOutput

    try {
      const result = await callClaude({
        systemPrompt: SYSTEM_PROMPT,
        userMessage,
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 1024,
        temperature: 0,
      })

      // Extract JSON from response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        await logger.error('Claude did not return valid JSON', { content: result.content.slice(0, 200) })
        return
      }
      parsed = JSON.parse(jsonMatch[0])
    } catch (err) {
      await logger.error('Claude call or JSON parse failed', { error: String(err) })
      return
    }

    const now = new Date().toISOString()

    // Candidate → approved pipeline
    const rawCandidates = (parsed.candidate_topics ?? []).filter(
      c => typeof c.topic === 'string' && typeof c.confidence === 'number'
    )
    const { updatedCandidates, newlyApproved } = mergeWithExistingCandidates(
      rawCandidates,
      existingProfile,
      existingApproved,
      now,
    )

    const approvedTopics = [...existingApproved, ...newlyApproved]

    const fullProfile: FeedPreferences = {
      preferred_topics: parsed.preferred_topics ?? [],
      avoided_topics: parsed.avoided_topics ?? [],
      avoided_angles: parsed.avoided_angles ?? [],
      preferred_angles: parsed.preferred_angles ?? [],
      coverage_gaps: parsed.coverage_gaps ?? [],
      candidate_topics: updatedCandidates,
      approved_topics: approvedTopics,
      profile_confidence: parsed.profile_confidence ?? 0,
      based_on_n_interactions: total,
      last_updated: now,
    }

    // Upsert workspace settings
    const { error: upsertError } = await supabase
      .from('workspace_feed_settings')
      .update({
        feed_preferences: fullProfile as unknown as Json,
        derived_topics: approvedTopics,
        updated_at: now,
      })
      .eq('workspace_id', workspace_id)

    if (upsertError) {
      await logger.error('Failed to save feed preferences', { error: upsertError.message })
      return
    }

    await logger.info('derive-feed-preferences: complete', {
      workspace_id,
      total_interactions: total,
      dismissed: dismissed.length,
      engaged: engaged.length,
      approved_topics: approvedTopics.length,
      newly_approved: newlyApproved.length,
      profile_confidence: fullProfile.profile_confidence,
    })
  },
})
