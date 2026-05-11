import { callClaude } from '@/lib/ai/generate'
import { THREADS_PLATFORM_MODEL } from '../platforms/threads'
import type { SyndicationIntelligence } from '../types/intelligence'
import type { ThreadNarrativeArc, ThreadPost, ThreadPostRole } from '../types/thread'
import { THREAD_ROLE_DESCRIPTIONS } from '../types/thread'

// All posts are generated in a single model call.
// Serial calls collapse narrative state — the model loses the thread.
export async function generateThread(
  arc: ThreadNarrativeArc,
  intelligence: SyndicationIntelligence,
  sourceUrl?: string,
  notes?: string,
): Promise<ThreadPost[]> {
  const systemPrompt = buildThreadSystemPrompt(arc, intelligence, sourceUrl, notes)
  const userMessage = `Generate a ${arc.postCount}-post Threads thread. Output valid JSON only.`

  const result = await callClaude({
    systemPrompt,
    userMessage,
    model: 'claude-sonnet-4-6',
    maxTokens: arc.postCount * 300,
  })

  return parseThreadResponse(result.content, arc)
}

function buildThreadSystemPrompt(
  arc: ThreadNarrativeArc,
  intelligence: SyndicationIntelligence,
  sourceUrl?: string,
  notes?: string,
): string {
  const model = THREADS_PLATFORM_MODEL
  const arcDescription = arc.roles
    .map((role, i) => `Post ${i + 1} [${role}]: ${THREAD_ROLE_DESCRIPTIONS[role]}`)
    .join('\n')

  const notesSection = notes?.trim()
    ? `## User direction\n\n${notes.trim()}\n\n`
    : ''

  const sourceLine = sourceUrl
    ? `\n\nSource URL (weave in naturally where appropriate): ${sourceUrl}`
    : ''

  return `You write platform-native Threads thread sequences that feel socially alive — not segmented content.

A good thread is not A → B → C. It is a social experience with pacing, tension, and something unresolved at the end.
The arc below is a guide, not a mandate. If the content calls for deviation, deviate.
Human threads loop, interrupt, partially resolve, re-escalate.

${notesSection}## What this thread is about

**Core idea:** ${intelligence.thesis}
**Audience:** ${intelligence.audience}
**Emotional register:** ${intelligence.emotional_style}
**What makes it shareable:** ${intelligence.spreadability_patterns.join('; ')}${sourceLine}

## Threads platform context

${model.rhetoricalEnvironment}

### Rules for every post
${model.structuralRules.map(r => `- ${r}`).join('\n')}

### Never do these
${model.antiPatterns.slice(0, 8).map(a => `- ${a}`).join('\n')}

## Narrative arc (guide, not template)

${arcDescription}

## Requirements

- Generate all ${arc.postCount} posts in a single pass — you need to hold the full arc in mind
- Each post must be independently readable by someone who arrives mid-thread
- No two posts should open with the same syntactic structure
- Vary sentence length and emotional register between posts
- Soft limit: under 200 characters per post. Hard limit: 500 characters per post
- Do not start any post with a number ("1.", "2/7", etc.) — numbering will be added by the UI

## Output format

Return a JSON array with exactly ${arc.postCount} objects. Each object has:
- "role": the arc role for this post (${arc.roles.join(', ')})
- "content": the post text only

Example shape:
[
  { "role": "hook", "content": "..." },
  { "role": "tension", "content": "..." }
]

Output ONLY the JSON array. No preamble, no explanation, no markdown fences.`
}

function parseThreadResponse(raw: string, arc: ThreadNarrativeArc): ThreadPost[] {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()

  let parsed: Array<{ role: string; content: string }>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Fallback: split by newlines and assign roles sequentially
    const lines = cleaned.split('\n').filter(l => l.trim().length > 0)
    parsed = lines.slice(0, arc.postCount).map((content, i) => ({
      role: arc.roles[i] ?? 'payoff',
      content: content.trim(),
    }))
  }

  return parsed.slice(0, arc.postCount).map((item, i) => ({
    index: i,
    role: (item.role as ThreadPostRole) ?? arc.roles[i] ?? 'payoff',
    content: item.content.trim(),
    charCount: item.content.trim().length,
  }))
}
