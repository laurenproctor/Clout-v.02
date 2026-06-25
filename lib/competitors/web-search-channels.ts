// ============================================================
// Layer 2 producer — find a competitor's official channels via web search,
// then convert the evidence into a small, schema-validated object.
// ============================================================
//
// Two steps on purpose: the web-search call gathers evidence (and is NOT asked
// to emit strict JSON), then a cheap, separate extraction call with a forced
// tool produces structured output. Returned URLs are re-validated downstream by
// the discovery engine, so this schema stays lenient (plain strings).

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { callClaudeWebSearch } from '@/lib/ai/claude-web-search'
import type { WebSearchChannels } from '@/lib/competitors/discover-socials'
import type { SocialPlatform } from '@/types/feed'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ChannelsSchema = z.object({
  name: z.string().optional(),
  socials: z
    .object({
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      facebook: z.string().optional(),
      tiktok: z.string().optional(),
      threads: z.string().optional(),
      pinterest: z.string().optional(),
    })
    .partial()
    .optional(),
  newsletter_url: z.string().optional(),
  substack_url: z.string().optional(),
  rss_url: z.string().optional(),
})

const EXTRACTION_INPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    name: { type: 'string', description: "The company's display name" },
    socials: {
      type: 'object',
      description: "Only the company's OWN official profile URLs",
      properties: Object.fromEntries(
        ['twitter', 'linkedin', 'instagram', 'youtube', 'facebook', 'tiktok', 'threads', 'pinterest'].map(
          (p) => [p, { type: 'string' }]
        )
      ),
      additionalProperties: false,
    },
    newsletter_url: { type: 'string' },
    substack_url: { type: 'string' },
    rss_url: { type: 'string' },
  },
}

function maxSearchesFor(missingCount: number): number {
  if (missingCount <= 2) return 2
  if (missingCount <= 5) return 3
  return 5
}

export async function discoverChannelsViaWebSearch(args: {
  domain: string
  companyName: string
  missing: SocialPlatform[]
}): Promise<WebSearchChannels | null> {
  const { domain, companyName, missing } = args

  // Step 1 — evidence-oriented web search.
  const search = await callClaudeWebSearch({
    maxSearches: maxSearchesFor(missing.length),
    systemPrompt:
      'You are a research assistant that finds a company\'s OFFICIAL social media and ' +
      'marketing channels. Only report a profile when you are confident it is the ' +
      "company's own official account (matching its name and domain) — not a fan page, " +
      'employee, reseller, or unrelated same-name brand. If you cannot confirm a platform, ' +
      'say so rather than guessing. Report the exact profile URLs you find.',
    userMessage:
      `Find the official channels for "${companyName}" (website: ${domain}).\n` +
      `Focus on these platforms: ${missing.join(', ')}.\n` +
      'Also note an official newsletter/Substack or RSS feed if you find one. ' +
      'For each, give the exact URL and briefly why you believe it is official.',
  })

  if (!search.text.trim() && search.citations.length === 0) return null

  // Step 2 — structured extraction with a forced tool.
  let extraction
  try {
    extraction = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:
        'Extract ONLY the official channel URLs the research clearly attributes to the ' +
        "company's own accounts. Omit anything uncertain, generic, or belonging to a " +
        'different entity. Prefer canonical profile URLs.',
      messages: [
        {
          role: 'user',
          content:
            `Company: ${companyName} (${domain})\n\n` +
            `Research notes:\n${search.text.slice(0, 8000)}\n\n` +
            `Source URLs:\n${search.citations.map((c) => c.url).join('\n').slice(0, 2000)}`,
        },
      ],
      tools: [
        {
          name: 'record_channels',
          description: 'Record the official channel URLs found for the company.',
          input_schema: EXTRACTION_INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'record_channels' },
    })
  } catch {
    return null
  }

  const toolUse = extraction.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') return null

  const parsed = ChannelsSchema.safeParse(toolUse.input)
  if (!parsed.success) return null

  return parsed.data as WebSearchChannels
}
