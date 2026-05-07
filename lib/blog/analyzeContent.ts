import { parseJson } from './parseJson'
import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { ContentAnalysis, NarrativeStrategy, OutlineSection, StrategicInsights } from './types'

function computeSeoMetrics(
  articleMarkdown: string,
  primaryKeyword: string,
  outline: OutlineSection[]
): ContentAnalysis['seo'] {
  const words = articleMarkdown.split(/\s+/)
  const wordCount = words.length
  const keywordCount = words.filter(w =>
    w.toLowerCase().includes(primaryKeyword.toLowerCase().split(' ')[0])
  ).length
  const keywordDensity = wordCount > 0 ? parseFloat(((keywordCount / wordCount) * 100).toFixed(1)) : 0
  const estimatedReadTime = Math.ceil(wordCount / 230)

  // Extract headings from outline
  const headingStructure = outline.map(s => s.level.toUpperCase())

  return {
    keywordDensity,
    titleLength: 0, // Will be set from metadata
    metaDescriptionLength: 0, // Will be set from metadata
    headingStructure,
    estimatedReadTime,
  }
}

export async function analyzeContent(
  ctx: BlogPromptContext,
  narrativeStrategy: NarrativeStrategy,
  articleMarkdown: string,
  outline: OutlineSection[],
  metadata: { metaTitle: string; metaDescription: string; slug: string },
  selectedHeadline: string
): Promise<{
  contentAnalysis: ContentAnalysis
  strategicInsights: StrategicInsights
  inputTokens: number
  outputTokens: number
}> {
  const system = buildBlogSystemPrompt({ ...ctx, selectedHeadline })
  const { request: r } = ctx

  const seoBase = computeSeoMetrics(articleMarkdown, r.primaryKeyword, outline)
  const seoMetrics: ContentAnalysis['seo'] = {
    ...seoBase,
    titleLength: metadata.metaTitle.length,
    metaDescriptionLength: metadata.metaDescription.length,
  }

  const articleExcerpt = articleMarkdown.slice(0, 3000)

  const user = `Perform qualitative editorial analysis and generate strategic insights for this article.

Headline: ${selectedHeadline}
Core Argument: ${narrativeStrategy.coreArgument}
Tension: ${narrativeStrategy.tension}
Content Angle: ${narrativeStrategy.contentAngle}

Article excerpt:
${articleExcerpt}

Qualitative ratings must use: "strong" | "moderate" | "developing" | "needs-work"
Each rating needs a 1-2 sentence explanation that is specific and observational — not generic.

Return ONLY a JSON object:
{
  "editorial": {
    "thesisClarity": { "rating": "...", "explanation": "..." },
    "argumentCoherence": { "rating": "...", "explanation": "..." },
    "topicalCompleteness": { "rating": "...", "explanation": "..." },
    "originalitySignal": { "rating": "...", "explanation": "..." }
  },
  "distribution": {
    "linkedinReadiness": { "rating": "...", "explanation": "..." },
    "newsletterReadiness": { "rating": "...", "explanation": "..." },
    "shareability": { "rating": "...", "explanation": "..." }
  },
  "strategicInsights": {
    "differentiationAngle": "string",
    "audienceTension": "string",
    "dominantLensInfluence": "string",
    "expectedStrengths": ["string"],
    "expectedWeaknesses": ["string"],
    "alternativeAngles": ["string"]
  }
}`

  const res = await callClaude({ systemPrompt: system, userMessage: user, maxTokens: 2000 })
  const parsed = parseJson<{ editorial: ContentAnalysis["editorial"]; distribution: ContentAnalysis["distribution"]; strategicInsights: StrategicInsights }>(res.content)

  const contentAnalysis: ContentAnalysis = {
    seo: seoMetrics,
    editorial: parsed.editorial,
    distribution: parsed.distribution,
  }

  return {
    contentAnalysis,
    strategicInsights: parsed.strategicInsights,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
  }
}
