import { parseJson } from './parseJson'
import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { ImageSpec, NarrativeStrategy, OutlineSection } from './types'

export async function generateImageSpecs(
  ctx: BlogPromptContext,
  narrativeStrategy: NarrativeStrategy,
  outline: OutlineSection[],
  selectedHeadline: string
): Promise<{ hero?: ImageSpec; inline: ImageSpec[]; inputTokens: number; outputTokens: number }> {
  const system = buildBlogSystemPrompt({ ...ctx, selectedHeadline })
  const { request: r } = ctx

  const sectionHeadings = outline.map(s => s.heading).join(', ')

  const user = `Generate image specifications for this article. Do NOT generate actual images — only written specifications.

Headline: ${selectedHeadline}
Core Argument: ${narrativeStrategy.coreArgument}
Image Style: ${r.imageStyle}
Visual Density: ${r.visualDensity}
Sections: ${sectionHeadings}

Return ONLY a JSON object:
{
  "hero": {
    "placement": "hero",
    "description": "string — what the image depicts",
    "style": "string — visual style direction",
    "altText": "string",
    "prompt": "string — AI image generation prompt"
  },
  "inline": [
    {
      "placement": "inline",
      "description": "string",
      "style": "string",
      "altText": "string",
      "prompt": "string"
    }
  ]
}

Inline count: ${r.visualDensity === 'minimal' ? 1 : r.visualDensity === 'balanced' ? 2 : 3}`

  const res = await callClaude({ systemPrompt: system, userMessage: user, maxTokens: 2500 })
  const result = parseJson<{ hero?: ImageSpec; inline: ImageSpec[] }>(res.content)
  return {
    hero: result.hero,
    inline: result.inline ?? [],
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
  }
}
