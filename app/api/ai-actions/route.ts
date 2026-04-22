import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput } from '@/lib/domain/output'
import { callClaude } from '@/lib/ai/generate'
import { createClient } from '@/lib/supabase/server'

export type AiActionId =
  | 'sharpen_opener'
  | 'shorter'
  | 'more_direct'
  | 'stronger_cta'
  | 'thread'

const LABELS: Record<AiActionId, string> = {
  sharpen_opener: 'Sharpen opener',
  shorter: 'Shorter',
  more_direct: 'More direct',
  stronger_cta: 'Stronger CTA',
  thread: 'Thread',
}

const MAJOR: AiActionId[] = ['thread']

async function getVoiceContext(workspaceId: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name, tone_notes, sample_content, target_audiences')
    .eq('workspace_id', workspaceId)
    .single()
  if (!data) return ''
  const lines: string[] = []
  if (data.display_name) lines.push(`Author: ${data.display_name}`)
  if (data.tone_notes) lines.push(`Voice: ${data.tone_notes}`)
  if (Array.isArray(data.target_audiences) && data.target_audiences.length > 0)
    lines.push(`Audience: ${(data.target_audiences as string[]).join(', ')}`)
  if (Array.isArray(data.sample_content) && (data.sample_content as string[]).length > 0)
    lines.push(`\nVoice sample:\n${(data.sample_content as string[])[0]}`)
  return lines.length > 0 ? `\n\n## Author context\n${lines.join('\n')}` : ''
}

function buildPrompt(action: AiActionId, voiceContext: string): string {
  const base = `You are a precise writing editor. Return only the improved text — no explanation, no preamble.${voiceContext}`
  const instructions: Record<AiActionId, string> = {
    sharpen_opener: `${base}\n\nTask: Rewrite the opening line (hook) to be more arresting and specific. Return only the new hook.`,
    shorter: `${base}\n\nTask: Cut 30–40% of the post. Keep the core argument and voice. Return only the shortened body.`,
    more_direct: `${base}\n\nTask: Rewrite to be more direct and declarative. Remove hedging language. Return only the improved body.`,
    stronger_cta: `${base}\n\nTask: Rewrite the closing section to be more specific and action-driving. Return only the improved body.`,
    thread: `${base}\n\nTask: Convert this post into a Twitter/X thread of 5–8 tweets. Format as numbered tweets:\n1/ Hook line\n\n2/ Second point\n\netc.`,
  }
  return instructions[action]
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { outputId, action, currentBody, currentTitle } = await req.json() as {
    outputId: string
    action: AiActionId
    currentBody: string
    currentTitle: string
  }

  if (!outputId || !action || !currentBody) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const outputResult = await getOutput(outputId)
  if (!outputResult.ok || outputResult.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const voiceContext = await getVoiceContext(session.workspaceId)
  const systemPrompt = buildPrompt(action, voiceContext)
  const userMessage = action === 'sharpen_opener'
    ? `Hook: ${currentTitle}\n\nBody:\n${currentBody}`
    : `Body:\n${currentBody}`

  const result = await callClaude({
    systemPrompt,
    userMessage,
    maxTokens: MAJOR.includes(action) ? 1500 : 600,
  })

  return NextResponse.json({
    type: MAJOR.includes(action) ? 'major' : 'minor',
    field: action === 'sharpen_opener' ? 'title' : 'body',
    suggestion: result.content.trim(),
    label: LABELS[action],
  })
}
