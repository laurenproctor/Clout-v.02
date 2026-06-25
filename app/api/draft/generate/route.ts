import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getBrandContext } from '@/lib/brand/getBrandContext'
import { buildBrandVoicePromptBlock } from '@/lib/brand/buildBrandVoicePromptBlock'
import type { DraftRequest } from '@/types/feed'

// Bump when the prompt changes — invalidates draft_cache so stale (pre-brand-voice) drafts
// aren't served. 2.1.0 layers the workspace Brand Voice (tone/notes/negative rules) on top.
const PROMPT_VERSION = '2.1.0'

const VALID_FORMATS = ['linkedin', 'twitter', 'blog', 'newsletter', 'instagram']
const VALID_TONES = ['authoritative', 'conversational', 'provocative', 'educational']

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  linkedin: '~1200 characters, professional narrative, 3–4 paragraphs, no hashtags',
  twitter: '~280 characters, punchy, single insight, optional 1–2 hashtags',
  blog: '~300 word intro paragraph, hook + context + thesis, no hashtags',
  newsletter: '~150 words, conversational, direct address to reader, no hashtags',
  instagram: '~150 words + 5–8 relevant hashtags, visual storytelling language',
}

function buildSystemPrompt(brandName: string, niche: string, tonePreference: string, contentTopics: string[], competitorSummary: string): string {
  return `You are the editorial strategist for ${brandName}, a ${niche} brand.

Voice: ${tonePreference}
Authority areas: ${contentTopics.length > 0 ? contentTopics.join(', ') : 'general thought leadership'}
${competitorSummary ? `\nWhat competitors are covering on this topic:\n${competitorSummary}` : ''}

Your task is NOT to summarize. Your task:
1. Identify the angle on this signal that no competitor has taken
2. Surface the structural implication — not the surface event
3. Position ${brandName} as the defining lens on this topic
4. Build authority, not awareness

Write like someone who has studied this domain for years and has something only they could say. Do not hedge. Do not summarize what everyone already knows. The reader should finish this feeling they learned something uniquely valuable.

Do not include hashtags unless the format is Instagram.
Do not include emojis unless the format is Instagram or Twitter.`
}

function buildUserPrompt(cardTitle: string, gdeltScore: number | null, tone: string, format: string): string {
  return `Write a ${format} post about the following trending topic:
Topic: ${cardTitle}
GDELT Signal Strength: ${gdeltScore !== null ? gdeltScore : 'N/A'} (higher = more coverage velocity)
Requested tone: ${tone}
Format requirements:
- ${FORMAT_INSTRUCTIONS[format]}

Write only the post content. No preamble, no labels, no explanation.`
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: DraftRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { card_id, format, tone, user_id } = body

  if (!card_id || !format || !tone || !user_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }

  if (!VALID_TONES.includes(tone)) {
    return NextResponse.json({ error: 'Invalid tone' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // Check cached draft first (same prompt version)
    const { data: cached } = await supabase
      .from('draft_cache')
      .select('content')
      .eq('card_id', card_id)
      .eq('user_id', user_id)
      .eq('format', format)
      .eq('tone', tone)
      .eq('prompt_version', PROMPT_VERSION)
      .is('invalidated_at', null)
      .single()

    if (cached?.content) {
      return NextResponse.json({ draft: cached.content })
    }

    // Fetch signal card
    const { data: card, error: cardError } = await supabase
      .from('signal_cards')
      .select('*')
      .eq('id', card_id)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('brand_name, niche, tone_preference, content_topics, services')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Build competitor coverage summary (opportunistic; empty if no data)
    const { data: competitorMentions } = await supabase
      .from('competitor_mentions')
      .select('competitor_id, headline, angle_summary')
      .eq('card_id', card_id)
      .limit(3)

    const competitorSummary = (competitorMentions ?? [])
      .map((m: { headline: string; angle_summary: string | null }) =>
        m.angle_summary ? `- ${m.angle_summary}` : `- "${m.headline}"`
      )
      .join('\n')

    // Generate via OpenAI
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI is not configured' }, { status: 503 })
    }
    const openai = new OpenAI({ apiKey: openaiKey })

    // Layer the workspace Brand Voice (tone/notes/negative rules) on top of the user-profile
    // brand fields above, so drafts respect Brand Settings like the other generators.
    const brandVoice = buildBrandVoicePromptBlock(await getBrandContext())
    const systemPrompt = buildSystemPrompt(
      profile.brand_name,
      profile.niche ?? '',
      profile.tone_preference,
      profile.content_topics ?? [],
      competitorSummary
    ) + (brandVoice.length > 0 ? `\n\n${brandVoice.join('\n')}` : '')

    const userPrompt = buildUserPrompt(card.title, card.gdelt_score, tone, format)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const draft = completion.choices[0]?.message?.content?.trim() ?? ''

    // Upsert into draft_cache with provenance
    await supabase.from('draft_cache').upsert(
      {
        card_id,
        user_id,
        format,
        tone,
        content: draft,
        model_id: 'gpt-4o',
        prompt_version: PROMPT_VERSION,
        generated_at: new Date().toISOString(),
        invalidated_at: null,
      },
      { onConflict: 'card_id,user_id,format,tone,prompt_version' }
    )

    return NextResponse.json({ draft })
  } catch (err) {
    const isOpenAIError =
      err instanceof Error && (err.message.includes('OpenAI') || err.message.includes('openai'))
    if (isOpenAIError) {
      return NextResponse.json({ error: 'OpenAI generation failed' }, { status: 502 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
