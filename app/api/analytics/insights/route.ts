import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { jsonrepair } from 'jsonrepair'
import { getSession } from '@/lib/auth/session'
import { callClaude } from '@/lib/ai/generate'

const InsightsSchema = z.array(z.string().min(10)).min(1).max(6)

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json() as {
    overview: { totalSessions: number; totalConversions: number }
    lensPerformance: Array<{ lens_id: string; avg_traffic: number | null; avg_conversion_rate: number | null; lenses?: { name: string } | null }>
    narrativePerformance: Array<{ narrative_type: string; avg_engagement_rate: number | null; avg_conversion_rate: number | null; sample_size: number }>
    sourceBreakdown: Array<{ source: string; sessions: number }>
  }

  const systemPrompt = `You are an editorial intelligence system for a professional content creator.
Your job is not to report what happened — it is to reason about WHY ideas spread and what that means strategically.

Analyze the analytics data and generate 3–4 strategic insights that address:
- Why did the top-performing content resonate? (rhetorical structure, emotional cadence, specificity, narrative tension, framing style)
- Which lenses or narrative approaches created durable authority vs. short-term spikes?
- What does the pattern suggest about the audience's intellectual interests or unmet needs?
- What should the creator publish next, and why — based on momentum, gaps, or compounding opportunity?

Write in a direct, executive tone. One sentence per insight. Specific and strategic, not generic.
Do NOT write: "LinkedIn drove the most sessions." That is reporting, not intelligence.
DO write: "Framework-lens content drove 3× longer sessions than authority-lens content, suggesting the audience responds to operational specificity over credentialed positioning."

IMPORTANT: Respond with ONLY a valid JSON array of strings. No markdown, no explanation.
Example: ["Insight one.", "Insight two.", "Insight three."]`

  const userMessage = `Analytics summary:
- Total sessions: ${data.overview.totalSessions}
- Total conversions: ${data.overview.totalConversions}
- Top sources: ${data.sourceBreakdown.slice(0, 5).map((s) => `${s.source} (${s.sessions} sessions)`).join(', ')}
- Lens performance: ${data.lensPerformance.slice(0, 5).map((l) => `${(l.lenses as { name?: string } | null)?.name ?? l.lens_id}: ${l.avg_conversion_rate ? (l.avg_conversion_rate * 100).toFixed(1) + '% conv rate' : 'no data'}`).join(', ')}
- Narrative performance: ${data.narrativePerformance.slice(0, 5).map((n) => `${n.narrative_type}: ${n.avg_engagement_rate ? (n.avg_engagement_rate * 100).toFixed(0) + '% engagement' : ''} (n=${n.sample_size})`).join(', ')}`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callClaude({ systemPrompt, userMessage, maxTokens: 512 })
      const repaired = jsonrepair(result.content.trim())
      const parsed = JSON.parse(repaired)
      const validated = InsightsSchema.parse(parsed)
      return NextResponse.json({ insights: validated })
    } catch (err) {
      console.error(`insights attempt ${attempt + 1} failed:`, err)
    }
  }

  return NextResponse.json({ insights: [] })
}
