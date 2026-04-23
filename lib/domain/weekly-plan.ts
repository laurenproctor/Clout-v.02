// lib/domain/weekly-plan.ts
import { DateTime } from 'luxon'
import { createServiceClient } from '@/lib/supabase/service'
import { assignNextSlot } from '@/lib/domain/scheduling'
import type { Output, OutputContent, OutputStatus, WeeklyPlanItem, PerformanceSummary } from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getWeekBucket(): string {
  return DateTime.utc().startOf('week').toISODate()!
}

function extractTopicKey(output: Output): string {
  const text = output.title ?? (output.content as OutputContent).body ?? ''
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
}

function recencyScore(createdAt: string | null): number {
  if (!createdAt) return 0
  const ageDays = DateTime.utc().diff(DateTime.fromISO(createdAt), 'days').days
  if (ageDays > 30) return -1  // stale penalty
  return Math.max(0, 1 - ageDays / 30)
}

const STATUS_RANK: Record<string, number> = {
  approved: 3,
  review:   2,
  draft:    1,
}

export function rankWeeklyCandidates(outputs: Output[]): Output[] {
  const scored = outputs.map((o) => ({
    output: o,
    score: (STATUS_RANK[o.status] ?? 0) + recencyScore(o.createdAt),
    topicKey: extractTopicKey(o),
  }))

  scored.sort((a, b) => b.score - a.score)

  const seenTopics = new Set<string>()
  const result: Output[] = []

  for (const { output, topicKey } of scored) {
    if (topicKey && seenTopics.has(topicKey)) continue
    if (topicKey) seenTopics.add(topicKey)
    result.push(output)
  }

  return result
}

function mapOutputRow(row: Record<string, unknown>): Output {
  return {
    id:                  row.id as string,
    workspaceId:         row.workspace_id as string,
    generationId:        row.generation_id as string,
    channelId:           row.channel_id as string | null,
    status:              row.status as OutputStatus,
    title:               row.title as string | null,
    content:             row.content as OutputContent,
    approvedBy:          row.approved_by as string | null,
    approvedAt:          row.approved_at as string | null,
    providerPostId:      row.provider_post_id as string | null,
    publishedAt:         row.published_at as string | null,
    scheduledAt:         row.scheduled_at as string | null,
    lastPublishError:    row.last_publish_error as string | null,
    approvedForWeek:     (row.approved_for_week as boolean) ?? false,
    weekBucket:          row.week_bucket as string | null,
    performanceSnapshot: row.performance_snapshot as Record<string, unknown> | null,
    createdAt:           row.created_at as string,
    updatedAt:           row.updated_at as string,
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function buildWeeklyPlan(
  workspaceId: string,
  limit = 7,
): Promise<WeeklyPlanItem[]> {
  const supabase = createServiceClient()
  const weekBucket = getWeekBucket()

  const { data: prefs } = await supabase
    .from('scheduling_preferences')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  const { data: approvedRows } = await supabase
    .from('outputs')
    .select('scheduled_at')
    .eq('workspace_id', workspaceId)
    .eq('week_bucket', weekBucket)
    .eq('approved_for_week', true)

  const takenSlots: string[] = (approvedRows ?? [])
    .map((r) => r.scheduled_at)
    .filter(Boolean) as string[]

  const { data: rows, error } = await supabase
    .from('outputs')
    .select('id, workspace_id, generation_id, channel_id, title, content, status, approved_by, approved_at, provider_post_id, published_at, scheduled_at, last_publish_error, approved_for_week, week_bucket, performance_snapshot, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .in('status', ['draft', 'review', 'approved'])
    .eq('approved_for_week', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(`buildWeeklyPlan: ${error.message}`)

  const outputs = (rows ?? []).map(mapOutputRow)
  const ranked = rankWeeklyCandidates(outputs).slice(0, limit)

  const mappedPrefs = prefs ? {
    id:             prefs.id,
    workspaceId:    prefs.workspace_id,
    postsPerWeek:   prefs.posts_per_week,
    preferredDays:  prefs.preferred_days,
    preferredTimes: prefs.preferred_times,
    timezone:       prefs.timezone,
    createdAt:      prefs.created_at,
    updatedAt:      prefs.updated_at,
  } : null

  const taken = [...takenSlots]
  return ranked.map((output, i) => {
    const suggestedSlot = mappedPrefs ? assignNextSlot(mappedPrefs, taken) : null
    if (suggestedSlot) taken.push(suggestedSlot)
    return { output, suggestedSlot, rank: i + 1 }
  })
}

// ─── Approval actions ─────────────────────────────────────────────────────────

export async function approveSelected(
  workspaceId: string,
  approvals: Array<{ outputId: string; scheduledAt: string | null }>,
): Promise<void> {
  const supabase = createServiceClient()
  const weekBucket = getWeekBucket()
  const now = new Date().toISOString()
  const applied: string[] = []

  for (const { outputId, scheduledAt } of approvals) {
    const { error } = await supabase
      .from('outputs')
      .update({
        status:            'queued',
        scheduled_at:      scheduledAt,
        approved_for_week: true,
        week_bucket:       weekBucket,
        updated_at:        now,
      })
      .eq('id', outputId)
      .eq('workspace_id', workspaceId)

    if (error) {
      if (applied.length > 0) {
        await supabase
          .from('outputs')
          .update({
            status:            'approved',
            scheduled_at:      null,
            approved_for_week: false,
            week_bucket:       null,
            updated_at:        now,
          })
          .in('id', applied)
          .eq('workspace_id', workspaceId)
      }
      throw new Error(`approveSelected: failed on ${outputId} — ${error.message}`)
    }

    applied.push(outputId)
  }
}

export async function approveWeek(
  workspaceId: string,
  approvals: Array<{ outputId: string; scheduledAt: string | null }>,
): Promise<void> {
  return approveSelected(workspaceId, approvals)
}

// ─── Performance summary ──────────────────────────────────────────────────────

export async function getPerformanceSummary(
  workspaceId: string,
): Promise<PerformanceSummary> {
  const supabase = createServiceClient()
  const weekBucket = getWeekBucket()
  const since = DateTime.utc().minus({ days: 30 }).toISO()!

  const { data: logs } = await supabase
    .from('publish_logs')
    .select('created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'success')
    .gte('created_at', since)

  const count = logs?.length ?? 0

  // Require at least 3 publishes before surfacing timing insights
  if (count < 3) {
    return { publishedLast30Days: count, topPostingDay: null, topPostingHour: null, weekBucket }
  }

  const dayCounts: Record<number, number> = {}
  const hourCounts: Record<number, number> = {}

  for (const log of logs ?? []) {
    const dt = DateTime.fromISO(log.created_at).toLocal()
    dayCounts[dt.weekday] = (dayCounts[dt.weekday] ?? 0) + 1
    hourCounts[dt.hour]   = (hourCounts[dt.hour]   ?? 0) + 1
  }

  const topDay  = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]
  const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]

  const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return {
    publishedLast30Days: count,
    topPostingDay:  topDay  ? (DAY_NAMES[Number(topDay[0])] ?? null) : null,
    topPostingHour: topHour ? Number(topHour[0]) : null,
    weekBucket,
  }
}
