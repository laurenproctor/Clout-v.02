// lib/visual/generation/extractTemplateProps.ts
// Extracts typed TemplateProps from content + VisualIntent via Claude.
// This determines WHAT the template renders — not how it looks.
// AI extracts the signal. The template decides how to display it.

import { callClaude } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import type { TemplateId, TemplateProps } from '../types/template'
import type { VisualIntent } from '../types/visual'

const SYSTEM_PROMPT = `You extract concise publishing content from source material for visual templates.
You return ONLY valid JSON — no explanation, no markdown.
Rules:
- Headlines: max 8 words, declarative, no ellipsis
- Quotes: max 40 words, verbatim or tightly paraphrased
- Statistics: the exact number plus minimal context phrase (max 15 words)
- Be ruthlessly concise — white space is the design`

function buildUserMessage(
  templateId: TemplateId,
  content: string,
  intent: VisualIntent
): string {
  const schemas: Record<TemplateId, object> = {
    'editorial-hero': {
      templateId: 'editorial-hero',
      headline:   'max 8 words, the core claim',
      subtext:    'optional, max 20 words — supporting context',
      authorCredit: 'optional — author name or source',
    },
    'quote-monolith': {
      templateId:  'quote-monolith',
      quote:       'the key quote or insight, max 40 words',
      attribution: 'optional — who said it or source',
    },
    'stat-monument': {
      templateId: 'stat-monument',
      statistic:  'the number/figure, e.g. "87%" or "3.2x"',
      context:    'what it means, max 15 words',
      label:      'optional — short uppercase label, e.g. "NEW RESEARCH"',
      source:     'optional — citation',
    },
    'split-panel': {
      templateId:  'split-panel',
      headline:    'max 8 words, the core claim',
      subtext:     'optional, max 20 words — supporting context',
      authorCredit: 'optional — author name or source',
    },
    'upper-left': {
      templateId:  'upper-left',
      headline:    'max 8 words, the core claim',
      subtext:     'optional, max 20 words — supporting context',
      authorCredit: 'optional — author name or source',
    },
  }

  return [
    `Extract the strongest publishable content for a "${templateId}" visual template.`,
    ``,
    `Visual direction: ${intent.visualConcept}`,
    `Viewer emotion: ${intent.viewerEmotion}`,
    ``,
    `Source content:`,
    content,
    ``,
    `Return JSON matching this schema exactly:`,
    JSON.stringify(schemas[templateId], null, 2),
  ].join('\n')
}

export async function extractTemplateProps(
  templateId: TemplateId,
  content: string,
  intent: VisualIntent,
  backgroundUrl: string
): Promise<TemplateProps> {
  const result = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage:  buildUserMessage(templateId, content, intent),
    maxTokens:    300,
  })

  const raw = parseJson<Record<string, unknown>>(result.content)
  if (!raw || raw.templateId !== templateId) {
    throw new Error(`extractTemplateProps: Claude returned unexpected schema for ${templateId}`)
  }

  // Inject backgroundUrl (comes from image generation, not Claude)
  const withBackground = { ...raw, backgroundUrl }

  return withBackground as unknown as TemplateProps
}
