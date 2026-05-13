import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { ArticleMemory, NarrativeStrategy, OutlineSection } from './types'

export async function generateSections(
  ctx: BlogPromptContext,
  narrativeStrategy: NarrativeStrategy,
  outline: OutlineSection[],
  selectedHeadline: string,
  onSectionComplete?: (sectionIndex: number, total: number) => void,
  totalTargetWords?: number
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
  const effectiveTotalWords = totalTargetWords ?? outline.reduce((s, sec) => s + sec.estimatedWords, 0)

  for (let i = 0; i < outline.length; i++) {
    const section = outline[i]
    const system = buildBlogSystemPrompt({ ...ctx, selectedHeadline })

    const wordsWritten = sections.join(' ').split(/\s+/).filter(Boolean).length
    const wordsRemaining = effectiveTotalWords - wordsWritten
    const sectionsRemaining = outline.length - i

    const user = `Write section ${i + 1} of ${outline.length} of the article.

Article Headline: ${selectedHeadline}
Core Argument: ${narrativeStrategy.coreArgument}
Tension: ${narrativeStrategy.tension}

This section:
Heading: ${section.heading} (${section.level})
Purpose: ${section.purpose}
Key Points: ${section.keyPoints.join('; ')}
Required Words: ${section.estimatedWords} words (±5%)
Words written so far: ${wordsWritten} | Words remaining across ${sectionsRemaining} section(s): ${wordsRemaining}

WORD COUNT IS MANDATORY. Write exactly ${section.estimatedWords} words for this section. Count as you write. Do not cut the section short — develop each key point fully until you reach the target.

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
    onSectionComplete?.(i + 1, outline.length)

    // Update memory inline (no extra API call — extract key phrases from section text)
    const words = res.content.split(/\s+/)
    const firstSentence = res.content.split(/[.!?]/)[0]?.trim() ?? ''
    if (firstSentence) memory.canonicalClaims.push(firstSentence.slice(0, 120))
    memory.prohibitedRepetition.push(...words.slice(0, 5).join(' ').split(' '))
  }

  const markdown = sections.join('\n\n')
  const wordCount = markdown.split(/\s+/).length

  return { markdown, wordCount, totalInputTokens, totalOutputTokens }
}
