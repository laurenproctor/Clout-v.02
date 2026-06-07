import { callClaude } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import type { InstagramVisualFormat } from './types'

interface StrategyPreviewResult {
  recommendedFormat: InstagramVisualFormat
  rationale: string
}

interface ClaudeStrategyResponse {
  recommendedFormat: string
  rationale: string
}

const VALID_FORMATS: InstagramVisualFormat[] = [
  'educational_carousel',
  'quote_graphic',
  'framework',
  'narrative_story',
  'data_insight',
]

export async function runStrategyPreview(
  sourceContent: string
): Promise<StrategyPreviewResult> {
  const systemPrompt = [
    'You are an Instagram content strategist. Given source content, recommend the single best Instagram visual format for it.',
    '',
    'Available formats:',
    '- educational_carousel: Multi-slide teaching content with a hook, sequential insights, and CTA. Best for: processes, lessons, how-tos, frameworks with multiple components.',
    '- quote_graphic: Single-slide centered around one memorable idea or observation. Best for: strong standalone quotes, provocative statements, memorable one-liners.',
    '- framework: Visualize a methodology, system, or process with clear sequential steps. Best for: decision frameworks, process maps, mental models.',
    '- narrative_story: Story-driven carousel following hook → situation → tension → discovery → lesson → takeaway. Best for: personal stories, case studies, transformation arcs.',
    '- data_insight: Statistics, trends, and evidence presented visually. Best for: research-backed content, benchmarks, surprising statistics.',
    '',
    'Respond with ONLY valid JSON:',
    JSON.stringify({ recommendedFormat: 'educational_carousel', rationale: 'One or two sentences explaining why this format best serves the content.' }),
  ].join('\n')

  const result = await callClaude({
    systemPrompt,
    userMessage: `Analyze this content and recommend the best Instagram format:\n\n${sourceContent.slice(0, 2000)}`,
    maxTokens: 256,
    temperature: 0,
  })

  try {
    const parsed = parseJson<ClaudeStrategyResponse>(result.content)
    const format = VALID_FORMATS.includes(parsed.recommendedFormat as InstagramVisualFormat)
      ? (parsed.recommendedFormat as InstagramVisualFormat)
      : 'educational_carousel'

    return {
      recommendedFormat: format,
      rationale: parsed.rationale ?? 'This format best fits your content.',
    }
  } catch {
    return {
      recommendedFormat: 'educational_carousel',
      rationale: 'Educational carousel is a strong default for most content — it builds context slide by slide and drives saves.',
    }
  }
}
