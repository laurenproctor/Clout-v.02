import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface GenerateResult {
  content: string
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}

export async function callClaude(params: {
  systemPrompt: string
  userMessage: string
  model?: string
  maxTokens?: number
}): Promise<GenerateResult> {
  const model = params.model ?? 'claude-sonnet-4-6'
  const start = Date.now()

  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 2048,
    system: params.systemPrompt,
    messages: [{ role: 'user', content: params.userMessage }],
  })

  const content = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  return {
    content,
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    durationMs: Date.now() - start,
  }
}

export function buildGenerationSystemPrompt(params: {
  lensSystemPrompt: string
  profileContext: {
    displayName: string | null
    toneNotes: string | null
    mentalModels: Array<{ name: string; description: string }>
    philosophies: Array<{ name: string; description: string }>
    targetAudiences: string[]
    sampleContent: string[]
    channelConfig?: {
      platform: string
      config: Record<string, unknown>
    } | null
  }
}): string {
  const { lensSystemPrompt, profileContext: p } = params

  const lines: string[] = [lensSystemPrompt, '']

  if (p.displayName) {
    lines.push(`## About the thought leader`)
    lines.push(`Name: ${p.displayName}`)
  }

  if (p.toneNotes) {
    lines.push(`\nTone: ${p.toneNotes}`)
  }

  if (p.targetAudiences.length > 0) {
    lines.push(`\nTarget audiences: ${p.targetAudiences.join(', ')}`)
  }

  if (p.mentalModels.length > 0) {
    lines.push(`\n## Mental models`)
    p.mentalModels.forEach((m) => {
      lines.push(`- **${m.name}:** ${m.description}`)
    })
  }

  if (p.philosophies.length > 0) {
    lines.push(`\n## Philosophies`)
    p.philosophies.forEach((ph) => {
      lines.push(`- **${ph.name}:** ${ph.description}`)
    })
  }

  if (p.sampleContent && p.sampleContent.length > 0) {
    lines.push(`\n## Writing samples (match this voice)`)
    p.sampleContent.slice(0, 2).forEach((sample, i) => {
      lines.push(`\nSample ${i + 1}:\n${sample}`)
    })
  }

  lines.push(`\n## Output format`)
  lines.push(
    'Respond with a JSON object: { "body": "...", "hook": "...", "hashtags": ["..."] }'
  )
  lines.push('body: the main content (markdown ok). hook: the opening line. hashtags: 3-5 tags.')

  if (p.channelConfig) {
    const { platform, config } = p.channelConfig
    lines.push(`\n## Target channel: ${platform}`)

    if (platform === 'linkedin') {
      const charLimit = (config.char_limit as number) ?? 3000
      const hashtags = (config.hashtag_count as number) ?? 5
      lines.push(`- Character limit: ${charLimit}`)
      lines.push(`- Include ${hashtags} relevant hashtags`)
      if (config.include_hook) lines.push('- Start with a strong hook line')
    } else if (platform === 'newsletter') {
      const wordLimit = (config.word_limit as number) ?? 800
      lines.push(`- Word limit: approximately ${wordLimit} words`)
      if (config.include_subject) lines.push('- Include a subject line in the "hook" field')
    } else if (platform === 'twitter') {
      const charLimit = (config.char_limit as number) ?? 280
      lines.push(`- Character limit: ${charLimit} per tweet`)
      if (config.thread_max) lines.push(`- If a thread, max ${config.thread_max} tweets`)
    }
  }

  return lines.join('\n')
}

export function buildMultiDraftSystemPrompt(params: Parameters<typeof buildGenerationSystemPrompt>[0]): string {
  const base = buildGenerationSystemPrompt(params)
  return base.replace(
    /## Output format[\s\S]*/,
    `## Output format
Respond with a JSON array of exactly 3 post drafts, each from a genuinely distinct angle.

[
  { "angle": "Personal story", "body": "...", "hook": "...", "hashtags": ["..."] },
  { "angle": "Contrarian take", "body": "...", "hook": "...", "hashtags": ["..."] },
  { "angle": "Practical insight", "body": "...", "hook": "...", "hashtags": ["..."] }
]

Rules:
- Each draft must feel different — different structure, emotional register, entry point.
- body: the full post (markdown ok). hook: the opening line. hashtags: 3-5 tags.
- Write in the author's voice as defined above. Do not break character.
- Do not repeat the same opening phrase or structural pattern across drafts.
- Output ONLY the JSON array. No explanation, no wrapper object.`
  )
}
