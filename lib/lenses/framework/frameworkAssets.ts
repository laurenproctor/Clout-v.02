import { callClaude } from '@/lib/ai/generate'
import type { FrameworkCandidate, SocialAssets } from './frameworkTypes'

function buildAssetsSystemPrompt(): string {
  return `You are a social content strategist. You receive a named intellectual framework and produce platform-specific social assets from it.

Rules:
- Every asset must derive from the framework — not from generic content advice
- The framework name should appear in most assets
- Write in a clear, direct, authoritative voice — no hype, no fluff
- LinkedIn: professional but not corporate; real, specific, insightful
- Twitter: crisp, each tweet self-contained; thread reads as escalating insight
- Quote card: the most shareable, citation-worthy line — ≤20 words
- Hook: an opening sentence someone would actually stop scrolling for

Output ONLY a JSON object, no explanation:
{
  "linkedInPost": "string — 150-400 words, framework revealed mid-post",
  "twitterThread": ["tweet 1", "tweet 2", "tweet 3", "tweet 4", "tweet 5"],
  "carouselOutline": ["slide 1 title", "slide 2 title", "slide 3 title", "slide 4 title", "slide 5 title"],
  "quoteCard": "string — ≤20 words, most shareable line",
  "hook": "string — ≤15 words opening sentence",
  "presentationTitle": "string — title case, optionally include subtitle",
  "podcastTalkingPoint": "string — one paragraph, what you'd say to set up the framework in conversation"
}`
}

function buildAssetsUserMessage(candidate: FrameworkCandidate): string {
  const nodeList = candidate.nodes.map(n => `  - ${n.title}${n.description ? `: ${n.description}` : ''}`).join('\n')

  return `Framework to convert into social assets:

Name: ${candidate.frameworkName}
Type: ${candidate.frameworkType}
Core tension: ${candidate.coreTension}
Core insight: ${candidate.coreInsight}
Transferable insight: ${candidate.transferableInsight}
Why it matters: ${candidate.whyItMatters}
Quote: ${candidate.quote}

Nodes:
${nodeList}`
}

export async function buildSocialAssets(top: FrameworkCandidate): Promise<SocialAssets> {
  const result = await callClaude({
    systemPrompt: buildAssetsSystemPrompt(),
    userMessage: buildAssetsUserMessage(top),
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  })

  // Parse JSON response
  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON object in response')
    const parsed = JSON.parse(jsonMatch[0]) as Partial<SocialAssets>

    return {
      linkedInPost: parsed.linkedInPost ?? '',
      twitterThread: Array.isArray(parsed.twitterThread) ? parsed.twitterThread : [],
      carouselOutline: Array.isArray(parsed.carouselOutline) ? parsed.carouselOutline : [],
      quoteCard: parsed.quoteCard ?? top.quote,
      hook: parsed.hook ?? '',
      presentationTitle: parsed.presentationTitle ?? top.frameworkName,
      podcastTalkingPoint: parsed.podcastTalkingPoint ?? '',
    }
  } catch {
    // Fallback: minimal assets from framework fields
    return {
      linkedInPost: '',
      twitterThread: [],
      carouselOutline: top.nodes.map(n => n.title),
      quoteCard: top.quote,
      hook: '',
      presentationTitle: top.frameworkName,
      podcastTalkingPoint: top.coreInsight,
    }
  }
}
