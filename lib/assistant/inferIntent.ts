import { callClaude } from '@/lib/ai/generate'
import type { InferredIntent } from '@/types/domain'

const SYSTEM = `You are an intent classifier for a content creation assistant. Given freeform input, return ONLY valid JSON matching this schema exactly:
{
  "intentClass": "publish" | "reflect" | "brainstorm" | "educate" | "summarize" | "document" | "debate",
  "outputFormat": "post" | "thread" | "newsletter" | "article" | "note",
  "isPrivate": boolean,
  "publishIntent": boolean,
  "tone": "professional" | "casual" | "educational" | "personal" | "reflective" | "contrarian",
  "suggestedChannel": "linkedin" | "twitter" | "newsletter" | null,
  "confidence": {
    "format": 0.0 to 1.0,
    "privacy": 0.0 to 1.0,
    "publishIntent": 0.0 to 1.0,
    "tone": 0.0 to 1.0
  }
}

Classification rules:
- Explicit "write a post/thread/article about X" → high format confidence (>0.85), publishIntent = true
- "these are notes" / "save this" / "private" / journal-like tone → isPrivate = true, reflect or document intent, low publishIntent confidence
- "thoughts on X" without explicit publish framing → moderate confidence, intentClass = reflect or brainstorm
- LinkedIn / professional career / business topics → suggestedChannel = "linkedin"
- Short punchy ideas / takes → outputFormat = "post" or "thread"
- "newsletter" mentioned explicitly → outputFormat = "newsletter", suggestedChannel = "newsletter"
- Ambiguous short input (< 30 words) → confidence scores < 0.65 across the board
- Return ONLY the JSON object. No explanation, no markdown.`

const FALLBACK: InferredIntent = {
  intentClass: 'publish',
  outputFormat: 'post',
  isPrivate: false,
  publishIntent: true,
  tone: 'professional',
  suggestedChannel: 'linkedin',
  confidence: { format: 0.5, privacy: 0.5, publishIntent: 0.5, tone: 0.5 },
}

export async function inferIntent(
  text: string,
  profileName?: string
): Promise<InferredIntent> {
  const userMessage = profileName
    ? `Profile: ${profileName}\n\nInput: ${text}`
    : `Input: ${text}`

  try {
    const result = await callClaude({
      systemPrompt: SYSTEM,
      userMessage,
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 300,
    })
    const parsed = JSON.parse(result.content) as InferredIntent
    return parsed
  } catch {
    return FALLBACK
  }
}
