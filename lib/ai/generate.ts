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

  lines.push(`\n## Output format`)
  lines.push(
    'Respond with a JSON object: { "body": "...", "hook": "...", "hashtags": ["..."] }'
  )
  lines.push('body: the main content (markdown ok). hook: the opening line. hashtags: 3-5 tags.')

  return lines.join('\n')
}
