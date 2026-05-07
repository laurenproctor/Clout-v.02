import { parseJson } from './parseJson'
import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { ArticleMemory, NarrativeStrategy, OutlineSection } from './types'

async function updateArticleMemory(
  ctx: BlogPromptContext,
  currentMemory: ArticleMemory,
  newSection: string
): Promise<ArticleMemory> {
  const system = 'You are an editorial continuity assistant. Return only JSON.'
  const user = `Update the article memory based on this newly written section.

Current memory:
${JSON.stringify(currentMemory, null, 2)}

New section content:
${newSection.slice(0, 1500)}

Return ONLY an updated ArticleMemory JSON object with the same shape. Add new items, do not remove existing ones.`

  const res = await callClaude({ systemPrompt: system, userMessage: user, maxTokens: 800 })
  return parseJson(res.content) as ArticleMemory
}

export async function generateSections(
  ctx: BlogPromptContext,
  narrativeStrategy: NarrativeStrategy,
  outline: OutlineSection[],
  selectedHeadline: string
): Promise<{ markdown: string; wordCount: number; totalInputTokens: number; totalOutputTokens: number }> {
  const memory: ArticleMemory = {
    canonicalClaims: [],
    establishedClaims: [],
    usedStatistics: [],
    narrativeThreads: [],
    unresolvedQuestions: [],
    toneMarkers: [],
    prohibitedRepetition: [],
  }

  const sections: string[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let i = 0; i < outline.length; i++) {
    const section = outline[i]
    const system = buildBlogSystemPrompt({ ...ctx, selectedHeadline })

    const user = `Write section ${i + 1} of ${outline.length} of the article.

Article Headline: ${selectedHeadline}
Core Argument: ${narrativeStrategy.coreArgument}
Tension: ${narrativeStrategy.tension}

This section:
Heading: ${section.heading} (${section.level})
Purpose: ${section.purpose}
Key Points: ${section.keyPoints.join('; ')}
Target Words: ~${section.estimatedWords}

Article Memory (do not contradict or repeat):
- Canonical claims: ${memory.canonicalClaims.join('; ') || 'none yet'}
- Established claims: ${memory.establishedClaims.join('; ') || 'none yet'}
- Used statistics: ${memory.usedStatistics.join('; ') || 'none yet'}
- Prohibited repetition: ${memory.prohibitedRepetition.join('; ') || 'none yet'}

Write ONLY the section content in markdown. Start with the ## or ### heading. No JSON wrapper.`

    const res = await callClaude({
      systemPrompt: system,
      userMessage: user,
      maxTokens: Math.max(1000, section.estimatedWords * 2),
    })

    sections.push(res.content)
    totalInputTokens += res.inputTokens
    totalOutputTokens += res.outputTokens

    // Update memory after each section (lightweight call)
    try {
      const updated = await updateArticleMemory(ctx, memory, res.content)
      Object.assign(memory, updated)
      totalInputTokens += 200
      totalOutputTokens += 100
    } catch {
      // Memory update failure is non-fatal — continue with current memory
    }
  }

  const markdown = sections.join('\n\n')
  const wordCount = markdown.split(/\s+/).length

  return { markdown, wordCount, totalInputTokens, totalOutputTokens }
}
