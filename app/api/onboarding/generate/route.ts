import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import {
  getProfileForGeneration,
  createOnboardingGeneration,
  updateOnboardingGeneration,
} from '@/lib/domain/onboarding'
import { callClaude } from '@/lib/ai/generate'

const SYSTEM_PROMPT = `You are a content strategy AI. Given a thought leader's profile, generate:
1. A positioning statement (1-2 sentences)
2. Three post ideas with hook text and channel tag
3. One ready-to-edit draft post formatted for their primary channel

Respond with valid JSON only, no markdown wrapper. Shape:
{
  "positioning": "string",
  "postIdeas": [
    { "hook": "string", "channel": "string" },
    { "hook": "string", "channel": "string" },
    { "hook": "string", "channel": "string" }
  ],
  "draftPost": "string"
}`

// POST /api/onboarding/generate
// Generates positioning, post ideas, and a draft post from the user's onboarding profile.
export async function POST(_req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = session

  // 1. Fetch profile data
  const profileResult = await getProfileForGeneration({ workspaceId })
  if (!profileResult.ok) {
    return NextResponse.json({ error: profileResult.error }, { status: 500 })
  }
  const profile = profileResult.data

  // 2. Create generation record before calling AI
  const genResult = await createOnboardingGeneration({ workspaceId })
  if (!genResult.ok) {
    return NextResponse.json({ error: genResult.error }, { status: 500 })
  }

  // 3. Build user message from profile data
  const primaryChannel = profile.channels[0] ?? 'LinkedIn'
  const channelsDisplay = profile.channels.slice(0, 2).join(', ') || 'Not specified'
  const userMessage = [
    `Name: ${profile.displayName ?? 'Not provided'}`,
    `Role: ${profile.role ?? 'Not provided'}`,
    `Industry: ${profile.industry ?? 'Not provided'}`,
    `Expertise: ${profile.expertise ?? 'Not provided'}`,
    `Purpose: ${profile.purpose ?? 'Not provided'}`,
    `Core belief: ${profile.profileInsights?.core_belief ?? 'Not provided'}`,
    `Primary channels: ${channelsDisplay}`,
    `Audience targets: ${profile.audienceTargets.join(', ') || 'Not specified'}`,
    `Audience perception: ${profile.audiencePerception.join(', ') || 'Not specified'}`,
    ``,
    `Format the draft post for ${primaryChannel}.`,
  ].join('\n')

  // 4. Call Claude
  let aiResponse: { positioning: string; postIdeas: Array<{ hook: string; channel: string }>; draftPost: string }

  try {
    const result = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 1500,
    })

    aiResponse = JSON.parse(result.content)
  } catch {
    await updateOnboardingGeneration({
      workspaceId,
      positioning: '',
      postIdeas: [],
      draftPost: '',
      status: 'failed',
    })
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }

  // 5. Persist results
  const updateResult = await updateOnboardingGeneration({
    workspaceId,
    positioning: aiResponse.positioning,
    postIdeas: aiResponse.postIdeas,
    draftPost: aiResponse.draftPost,
    status: 'complete',
  })

  if (!updateResult.ok) {
    return NextResponse.json({ error: updateResult.error }, { status: 500 })
  }

  return NextResponse.json({
    positioning: aiResponse.positioning,
    postIdeas: aiResponse.postIdeas,
    draftPost: aiResponse.draftPost,
  })
}
