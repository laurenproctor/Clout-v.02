import { task, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'
import { callClaude } from '@/lib/ai/generate'

const EXTRACT_THE_GOLD_PROMPT = `You are a personal insight coach. The user has shared a raw, private thought. Using their stated mental models and philosophies as a lens, surface the single most valuable insight hidden in this thought. Write it as a rich, personal reflection — not a summary. Speak to them directly.

After the reflection, extract 2-3 specific insights as structured observations.

Respond with JSON:
{
  "content": "A rich 2-3 sentence personal reflection that surfaces the core insight...",
  "insights": [
    { "title": "Short insight title", "body": "One sentence expanding on this insight." }
  ]
}`

function buildEnrichmentPrompt(params: {
  rawContent: string
  mentalModels: Array<{ name: string; description: string }>
  philosophies: Array<{ name: string; description: string }>
  toneNotes: string | null
}): string {
  const lines: string[] = [EXTRACT_THE_GOLD_PROMPT, '']

  if (params.mentalModels.length > 0) {
    lines.push('## Their mental models')
    params.mentalModels.forEach((m) => {
      lines.push(`- **${m.name}:** ${m.description}`)
    })
    lines.push('')
  }

  if (params.philosophies.length > 0) {
    lines.push('## Their philosophies')
    params.philosophies.forEach((p) => {
      lines.push(`- **${p.name}:** ${p.description}`)
    })
    lines.push('')
  }

  if (params.toneNotes) {
    lines.push(`## Their voice\n${params.toneNotes}\n`)
  }

  lines.push('## Their raw thought')
  lines.push(params.rawContent)

  return lines.join('\n')
}

export const enrichPrivateJob = task({
  id: 'enrich-private-capture',
  retry: { maxAttempts: 2 },
  run: async (payload: { capture_id: string; workspace_id: string }) => {
    const { capture_id, workspace_id } = payload
    const supabase = createServiceClient()

    await logger.info('Starting private enrichment', { capture_id })

    // Load capture
    const { data: capture } = await supabase
      .from('captures')
      .select('raw_content, transcript')
      .eq('id', capture_id)
      .single()

    if (!capture) {
      await logger.error('Capture not found', { capture_id })
      return
    }

    const rawContent = capture.transcript ?? capture.raw_content ?? ''
    if (!rawContent.trim()) {
      await logger.warn('Capture has no content to enrich', { capture_id })
      return
    }

    // Load workspace profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('mental_models, philosophies, tone_notes')
      .eq('workspace_id', workspace_id)
      .single()

    // Load the "Extract the Gold" system lens (fallback to built-in prompt if not found)
    const { data: lens } = await supabase
      .from('lenses')
      .select('id, system_prompt')
      .eq('scope', 'system')
      .eq('name', 'Extract the Gold')
      .single()

    const systemPrompt = buildEnrichmentPrompt({
      rawContent,
      mentalModels: (profile?.mental_models as Array<{ name: string; description: string }>) ?? [],
      philosophies: (profile?.philosophies as Array<{ name: string; description: string }>) ?? [],
      toneNotes: profile?.tone_notes as string | null ?? null,
    })

    // Call Claude
    let aiResult
    try {
      aiResult = await callClaude({
        systemPrompt: lens?.system_prompt ?? EXTRACT_THE_GOLD_PROMPT,
        userMessage: systemPrompt,
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 1024,
      })
    } catch (err) {
      await logger.error('Claude call failed', { error: String(err) })
      return
    }

    // Parse response
    let content: string
    let insights: Array<{ title: string; body: string }> = []

    try {
      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        content = parsed.content ?? aiResult.content
        insights = parsed.insights ?? []
      } else {
        content = aiResult.content
      }
    } catch {
      content = aiResult.content
    }

    // Write enrichment
    const { error } = await supabase.from('private_enrichments').insert({
      capture_id,
      workspace_id,
      lens_id: lens?.id ?? null,
      content,
      insights,
      model: 'claude-haiku-4-5-20251001',
      prompt_snapshot: systemPrompt,
    })

    if (error) {
      await logger.error('Failed to write enrichment', { error: error.message })
      return
    }

    await logger.info('Enrichment complete', { capture_id })
  },
})
