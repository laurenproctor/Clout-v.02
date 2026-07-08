import { callClaude } from '@/lib/ai/generate'
import {
  type RecommendContentInput,
  type RecommendationResult,
  type RecommendedFormat,
  FORMAT_LABELS,
  isRecommendedFormat,
} from '@/lib/create/recommendTypes'

const SYSTEM = `You are a content strategist for a multi-channel publishing tool. A user has given you a raw idea or source and you must recommend the single best PRIMARY format to create first, then suggest how to adapt it.

Return ONLY valid JSON matching this schema exactly (no markdown, no commentary):
{
  "recommendedPrimaryFormat": "linkedin" | "blog" | "threads" | "instagram" | "image" | "note" | "substack_email",
  "rationale": "one or two sentences explaining why this format is the best starting point",
  "suggestedAdaptations": [ { "channel": "<channel name>", "role": "<what that adaptation does>" } ],
  "normalizedInput": "a clean, self-contained restatement of the idea to feed into a generator",
  "title": "a short working title (max 8 words)"
}

Guidance:
- Pick the format that best fits the idea's shape and intent. Timely opinions and professional takes → linkedin. Expanded, evergreen, SEO-friendly pieces → blog. Fast conversational takes → threads. Visual/quotable/aesthetic ideas → instagram or image. Short editorial reflections → note. Long-form editorial to a subscriber base → substack_email.
- suggestedAdaptations: 3 to 5 entries across DIFFERENT channels than the primary, each with a distinct role (e.g. "Threads: conversational distillation", "Blog: expanded SEO version", "Instagram: quote graphic", "Substack note: short editorial reflection").
- normalizedInput must stand alone without the original phrasing crutches.
- Return ONLY the JSON object.`

const FALLBACK_ADAPTATIONS = [
  { channel: 'Threads', role: 'Conversational distillation' },
  { channel: 'Blog post', role: 'Expanded SEO version' },
  { channel: 'Instagram', role: 'Quote graphic or carousel' },
  { channel: 'Substack note', role: 'Short editorial reflection' },
]

function buildUserMessage(input: RecommendContentInput): string {
  const lines: string[] = []
  lines.push(`Intake type: ${input.inputType}`)
  if (input.angle) lines.push(`Angle: ${input.angle}`)
  if (input.goal) lines.push(`Goal: ${input.goal}`)
  if (input.startingPoint && input.startingPoint !== 'auto') {
    lines.push(
      `The user has already chosen a preferred starting point: ${FORMAT_LABELS[input.startingPoint]}. Strongly prefer "${input.startingPoint}" as recommendedPrimaryFormat unless the material is clearly unsuited to it.`
    )
  }
  lines.push('', 'Idea / source material:', input.rawInput)
  return lines.join('\n')
}

/**
 * Recommend the best primary format for a universal-create brief.
 * Honors an explicit startingPoint override, and falls back to a safe LinkedIn
 * recommendation if the model returns unusable output.
 */
export async function recommendContentRoute(
  input: RecommendContentInput
): Promise<RecommendationResult> {
  // If the user made an explicit non-auto choice, we still call the model to
  // produce rationale/adaptations/title, but the prompt biases toward their pick.
  let result: RecommendationResult
  try {
    const res = await callClaude({
      systemPrompt: SYSTEM,
      userMessage: buildUserMessage(input),
      model: 'claude-sonnet-4-6',
      maxTokens: 700,
    })
    const jsonMatch = res.content.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : res.content) as Partial<RecommendationResult>
    result = normalize(parsed, input)
  } catch {
    result = fallback(input)
  }

  // A concrete user choice is authoritative over the model.
  if (input.startingPoint && input.startingPoint !== 'auto') {
    result.recommendedPrimaryFormat = input.startingPoint
  }
  return result
}

function normalize(
  parsed: Partial<RecommendationResult>,
  input: RecommendContentInput
): RecommendationResult {
  const format: RecommendedFormat = isRecommendedFormat(parsed.recommendedPrimaryFormat)
    ? parsed.recommendedPrimaryFormat
    : 'linkedin'
  const adaptations = Array.isArray(parsed.suggestedAdaptations)
    ? parsed.suggestedAdaptations
        .filter(
          (a): a is { channel: string; role: string } =>
            !!a && typeof a.channel === 'string' && typeof a.role === 'string'
        )
        .slice(0, 5)
    : []
  return {
    recommendedPrimaryFormat: format,
    rationale:
      typeof parsed.rationale === 'string' && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : 'This is the strongest first home for the idea; other channels can adapt from it.',
    suggestedAdaptations: adaptations.length > 0 ? adaptations : FALLBACK_ADAPTATIONS,
    normalizedInput:
      typeof parsed.normalizedInput === 'string' && parsed.normalizedInput.trim()
        ? parsed.normalizedInput.trim()
        : input.rawInput,
    title:
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : deriveTitle(input.rawInput),
  }
}

function fallback(input: RecommendContentInput): RecommendationResult {
  return {
    recommendedPrimaryFormat: 'linkedin',
    rationale:
      'A LinkedIn-first post is a reliable starting point for this idea; you can adapt it into other channels afterward.',
    suggestedAdaptations: FALLBACK_ADAPTATIONS,
    normalizedInput: input.rawInput,
    title: deriveTitle(input.rawInput),
  }
}

function deriveTitle(raw: string): string {
  const words = raw.trim().split(/\s+/).slice(0, 8).join(' ')
  return words.length > 0 ? words : 'Untitled idea'
}
