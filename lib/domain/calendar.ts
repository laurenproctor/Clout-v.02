import { createClient } from '@/lib/supabase/server'
import type {
  CalendarConcept,
  NarrativeArc,
  NarrativeHealth,
  IntelligenceSignal,
  ArcFunnelStep,
  NarrativeGoal,
  NarrativeRole,
  FunnelStage,
  ResonancePrediction,
} from '@/types/calendar'
import type { OutputStatus, ChannelPlatform } from '@/types/domain'

// Returns the Monday of the week containing a given ISO date string.
export function getWeekStart(isoDate: string): string {
  const d = new Date(isoDate)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// Returns the ISO date string 7 days after weekStart.
function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString()
}

type OutputRow = Record<string, unknown>
type ChannelRow = { platform?: string; label?: string; account_id?: string } | null

const PLATFORM_DISPLAY: Record<string, string> = {
  linkedin: 'LinkedIn',
  x: 'X',
  twitter: 'X',
  threads: 'Threads',
  substack: 'Substack',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  wordpress: 'WordPress',
  medium: 'Medium',
  google_business_profile: 'Google Business',
  apple_business_connect: 'Apple Business',
}

function humanizePlatform(platform: string): string {
  return (
    PLATFORM_DISPLAY[platform] ??
    platform.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

export async function getCalendarWeek(
  workspaceId: string,
  weekStart: string
): Promise<CalendarConcept[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('outputs')
    .select(`
      id, concept_id, generation_group_id, title, content,
      status, scheduled_at, channel_id,
      goal, narrative_role, narrative_arc_id, narrative_arc_name,
      funnel_stage, resonance_prediction,
      channels (id, platform, label, account_id)
    `)
    .eq('workspace_id', workspaceId)
    .gte('scheduled_at', new Date(weekStart).toISOString())
    .lt('scheduled_at', getWeekEnd(weekStart))
    .neq('status', 'archived')
    .order('scheduled_at', { ascending: true })

  if (error) throw new Error(`getCalendarWeek: ${error.message}`)

  const outputs = (data ?? []) as OutputRow[]

  const groups = new Map<string, OutputRow[]>()
  for (const output of outputs) {
    const key =
      (output.concept_id as string | null) ??
      (output.generation_group_id as string | null) ??
      (output.id as string)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(output)
  }

  const concepts: CalendarConcept[] = []
  for (const [conceptId, posts] of groups) {
    const primary = posts[0]
    const headline =
      (primary.title as string | null) ??
      ((primary.content as { body?: string } | null)?.body?.slice(0, 120)) ??
      'Untitled'

    concepts.push({
      conceptId,
      headline,
      scheduledAt: primary.scheduled_at as string,
      goal: (primary.goal as NarrativeGoal | null) ?? null,
      narrativeRole: (primary.narrative_role as NarrativeRole | null) ?? null,
      narrativeArcId: (primary.narrative_arc_id as string | null) ?? null,
      narrativeArcName: (primary.narrative_arc_name as string | null) ?? null,
      funnelStage: (primary.funnel_stage as FunnelStage | null) ?? null,
      resonancePrediction:
        (primary.resonance_prediction as ResonancePrediction | null) ?? null,
      lensNames: [],
      posts: posts.map((p) => {
        const ch = p.channels as ChannelRow
        const platform = ((ch?.platform ?? 'linkedin') as ChannelPlatform)
        return {
          id: p.id as string,
          platform,
          accountName: ch?.label ?? ch?.account_id ?? humanizePlatform(platform),
          handle: null,
          status: p.status as OutputStatus,
          scheduledAt: p.scheduled_at as string | null,
          channelId: (p.channel_id as string | null) ?? '',
        }
      }),
    })
  }

  return concepts.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )
}

export async function getNarrativeHealth(
  workspaceId: string
): Promise<NarrativeHealth> {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data } = await supabase
    .from('outputs')
    .select('goal, narrative_role, published_at, created_at')
    .eq('workspace_id', workspaceId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .in('status', ['published', 'approved', 'queued'])

  const outputs = (data ?? []) as OutputRow[]
  const strengths: string[] = []
  const gaps: string[] = []
  let score = 100

  const founderPosts = outputs.filter((o) => o.narrative_role === 'founder')
  if (founderPosts.length === 0) {
    score -= 20
    gaps.push('No founder narrative detected — audience losing personal connection')
  } else {
    strengths.push('Founder voice present in recent content')
  }

  const goals = new Set(outputs.map((o) => o.goal).filter(Boolean))
  if (goals.size < 3) {
    score -= 15
    gaps.push(`Limited goal diversity — only ${goals.size} goal type(s) this month`)
  } else {
    strengths.push(`Good goal diversity — ${goals.size} distinct objectives this month`)
  }

  const conversionCount = outputs.filter(
    (o) => o.goal === 'leads' || o.goal === 'subscribers'
  ).length
  if (conversionCount === 0) {
    score -= 15
    gaps.push('Zero conversion-oriented content in last 30 days')
  } else {
    strengths.push(`${conversionCount} conversion post(s) this month`)
  }

  const authorityCount = outputs.filter((o) => o.goal === 'authority').length
  if (authorityCount >= 3) {
    strengths.push(`Strong authority cadence — ${authorityCount} posts this month`)
  }

  return { score: Math.max(0, score), strengths, gaps }
}

export async function getIntelligenceSignals(
  workspaceId: string
): Promise<IntelligenceSignal[]> {
  const supabase = await createClient()
  const signals: IntelligenceSignal[] = []

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data } = await supabase
    .from('outputs')
    .select('goal, narrative_role, created_at, status')
    .eq('workspace_id', workspaceId)
    .gte('created_at', fourteenDaysAgo.toISOString())
    .in('status', ['published', 'approved', 'queued'])
    .order('created_at', { ascending: false })

  const outputs = (data ?? []) as OutputRow[]

  const founderPosts = outputs.filter((o) => o.narrative_role === 'founder')
  if (founderPosts.length === 0) {
    signals.push({
      level: 'danger',
      label: 'No founder voice',
      detail: 'detected in 14 days',
    })
  }

  const conversionPosts = outputs.filter(
    (o) => o.goal === 'leads' || o.goal === 'subscribers'
  )
  if (conversionPosts.length === 0) {
    signals.push({
      level: 'warn',
      label: 'Conversion content',
      detail: '— 0 posts in 14 days',
    })
  }

  const authorityPosts = outputs.filter((o) => o.goal === 'authority')
  if (authorityPosts.length >= 3) {
    signals.push({
      level: 'good',
      label: 'Authority posts',
      detail: 'on strong cadence this period',
    })
  }

  const goalCounts = outputs.reduce<Record<string, number>>((acc, o) => {
    if (o.goal) acc[o.goal as string] = (acc[o.goal as string] ?? 0) + 1
    return acc
  }, {})
  const dominant = Object.entries(goalCounts).sort((a, b) => b[1] - a[1])[0]
  if (dominant && dominant[1] >= 5) {
    signals.push({
      level: 'warn',
      label: 'Narrative redundancy',
      detail: `— ${dominant[1]} ${dominant[0]} posts this period`,
    })
  }

  return signals
}

export async function getNarrativeArcs(
  workspaceId: string,
  weekStart: string
): Promise<NarrativeArc[]> {
  const concepts = await getCalendarWeek(workspaceId, weekStart)

  const arcMap = new Map<string, CalendarConcept[]>()

  for (const concept of concepts) {
    if (concept.narrativeArcId) {
      if (!arcMap.has(concept.narrativeArcId))
        arcMap.set(concept.narrativeArcId, [])
      arcMap.get(concept.narrativeArcId)!.push(concept)
    }
  }

  const arcs: NarrativeArc[] = []

  for (const [arcId, arcConcepts] of arcMap) {
    const first = arcConcepts[0]
    const allFunnelSteps: ArcFunnelStep[] = [
      'Problem',
      'Reframe',
      'Evidence',
      'Framework',
      'CTA',
    ].map((label) => {
      const roleMap: Record<string, NarrativeRole> = {
        Problem: 'tension',
        Reframe: 'contrarian',
        Evidence: 'evidence',
        Framework: 'framework',
        CTA: 'cta',
      }
      const role = roleMap[label]
      const hasConcept = arcConcepts.some((c) => c.narrativeRole === role)
      const activeRole = first.narrativeRole
      return {
        label,
        state: hasConcept ? 'done' : role === activeRole ? 'active' : 'pending',
      }
    })

    const totalPosts = arcConcepts.reduce((sum, c) => sum + c.posts.length, 0)
    const platforms = [
      ...new Set(
        arcConcepts.flatMap((c) => c.posts.map((p) => p.platform))
      ),
    ]

    arcs.push({
      arcId,
      arcName: first.narrativeArcName ?? 'Unnamed Arc',
      arcDescription: '',
      goal: first.goal,
      status: 'active',
      resonance: first.resonancePrediction,
      stage: 'Expansion',
      platforms,
      totalConcepts: arcConcepts.length,
      totalPosts,
      weeksRunning: 1,
      funnelSteps: allFunnelSteps,
      concepts: arcConcepts,
    })
  }

  return arcs
}
