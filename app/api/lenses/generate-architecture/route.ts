import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { callClaude } from '@/lib/ai/generate'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, description } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const result = await callClaude({
    systemPrompt: `You are an editorial lens architect. Your job is to write the reasoning architecture for a custom editorial lens that will be applied to content.

A reasoning architecture defines:
- The analytical perspective this lens brings
- What it is optimizing for (specific cognitive operations, not generic goals)
- Hard rules: what it must never do or produce
- Anti-patterns to detect and avoid
- What the output should contain

Tone: precise, operational, directive. Write as instructions to an AI analyst, not as a description for a human.

Rules:
- 150–300 words
- No headers or markdown — plain paragraphs
- Make the lens feel distinct and intellectually specific to its named purpose
- Include at least one concrete example of BAD vs GOOD output to calibrate quality
- Do not use the words "powerful", "authentic", "resonant", "valuable", "impactful", or "transformative"
- End with a one-line "Output:" summary listing the key deliverables

Return only the reasoning architecture text. No preamble, no explanation.`,
    userMessage: `Lens name: ${name.trim()}${description?.trim() ? `\nPerspective: ${description.trim()}` : ''}`,
    model: 'claude-sonnet-4-6',
    maxTokens: 600,
    temperature: 0.4,
  })

  return NextResponse.json({ system_prompt: result.content.trim() })
}
