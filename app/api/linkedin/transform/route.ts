import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { callClaude } from '@/lib/ai/generate'

const TRANSFORM_INSTRUCTIONS: Record<string, string> = {
  'Shorten':       'Cut this post down significantly — remove filler, redundancy, and weak sentences. Preserve the core insight and the hook. Target 30–50% fewer words.',
  'Expand':        'Expand this post with more depth, texture, and specificity. Add a concrete example, a supporting observation, or a sharper closing tension. Keep the voice consistent.',
  'Stronger Hook': 'Rewrite ONLY the opening line (first 1–2 sentences). Make it scroll-stopping — a bold claim, an unexpected stat, or a tension-forward statement. Do not change the rest.',
  'Executive Tone':'Rewrite in a concise, high-signal executive register. Reduce emotional language. Prioritize precision and authority. Short sentences. No filler.',
  'More Concise':  'Tighten every sentence. Remove adjectives that add no information, cut filler phrases, and trim passive constructions. Same meaning, fewer words.',
  'Add Tension':   'Rework the post to introduce more narrative tension — a challenge, a counter-intuitive truth, or a stakes-raising observation. The reader should feel compelled to respond.',
  'Rewrite':       'Rewrite this post from scratch with the same core idea but a completely different angle, structure, or hook. Fresh take, same subject.',
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { body: postBody, transform } = body as { body?: string; transform?: string }

  if (!postBody?.trim()) {
    return Response.json({ error: 'body is required' }, { status: 400 })
  }
  if (!transform || !TRANSFORM_INSTRUCTIONS[transform]) {
    return Response.json({ error: 'Invalid transform' }, { status: 400 })
  }

  const instruction = TRANSFORM_INSTRUCTIONS[transform]

  const result = await callClaude({
    systemPrompt: [
      'You are an expert LinkedIn ghostwriter. You are applying a specific transformation to a LinkedIn post.',
      'Return ONLY the transformed post text — no explanation, no preamble, no quotes, no markdown wrapper.',
      'Preserve line breaks between paragraphs. Do not add hashtags unless they were already present.',
      '',
      `TRANSFORMATION: ${instruction}`,
    ].join('\n'),
    userMessage: postBody,
    maxTokens: 1024,
    temperature: 0.7,
  })

  return Response.json({ body: result.content.trim() })
}
