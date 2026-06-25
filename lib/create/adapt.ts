// Anchor → platform-native adaptation. Given an approved LinkedIn anchor body,
// produce ONE platform-native draft for Threads or X — preserving the core idea
// while making platform-appropriate changes (length, cadence, hashtag rules).
// Reuses the syndication platform editorial models so adapted posts feel native.
import { callClaude, campaignPromptLines } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import { buildBrandVoicePromptBlock } from '@/lib/brand/buildBrandVoicePromptBlock'
import type { BrandContext } from '@/lib/brand/getBrandContext'
import { THREADS_PLATFORM_MODEL } from '@/lib/syndication/platforms/threads'
import { X_PLATFORM_MODEL } from '@/lib/syndication/platforms/x'
import type { PlatformBehaviorModel } from '@/lib/syndication/types/platform'
import type { AdaptTargetPlatform } from '@/lib/create/types'

const PLATFORM_MODELS: Record<AdaptTargetPlatform, PlatformBehaviorModel> = {
  threads: THREADS_PLATFORM_MODEL as PlatformBehaviorModel,
  x: X_PLATFORM_MODEL as PlatformBehaviorModel,
}

const PLATFORM_LABEL: Record<AdaptTargetPlatform, string> = {
  threads: 'Threads',
  x: 'X',
}

// Hard limit for X — enforced in the prompt and re-checked after generation.
export const X_MAX_CHARS = 280

export interface AdaptResult {
  body: string
  hashtags: string[]
  campaignName: string
}

interface ClaudeAdaptResponse {
  body: string
  hashtags?: string[]
  campaignName?: string
}

function buildAdaptSystemPrompt(
  platform: AdaptTargetPlatform,
  brandContext: BrandContext | undefined,
  campaignContext: { goal: string; purpose: string | null } | null | undefined,
): string {
  const m = PLATFORM_MODELS[platform]
  const lines: string[] = [
    `# ${PLATFORM_LABEL[platform]} Adaptation`,
    ``,
    `You are adapting an existing, approved LinkedIn post into a native ${PLATFORM_LABEL[platform]} post.`,
    `Preserve the core idea, claim, and point of view of the source. Do NOT invent new facts.`,
    `Make it feel native to ${PLATFORM_LABEL[platform]}: rework length, cadence, hook, and hashtags to platform norms — do not just truncate the LinkedIn post.`,
    ``,
    m.rhetoricalEnvironment,
    ``,
  ]

  if (m.preWritingFramework) {
    lines.push(`## Pre-Writing Framework`, m.preWritingFramework, ``)
  }

  lines.push(
    `## Structural Rules`,
    m.structuralRules.map((r) => `- ${r}`).join('\n'),
    ``,
    `## Length`,
    m.lengthTarget,
    ``,
    `## Anti-Patterns — These Disqualify the Post`,
    m.antiPatterns.map((a) => `- ${a}`).join('\n'),
    ``,
  )

  if (m.hashtagRule) {
    lines.push(`## Hashtag Rule`, m.hashtagRule, ``)
  }

  lines.push(...buildBrandVoicePromptBlock(brandContext))

  const campaignLines = campaignPromptLines(campaignContext)
  if (campaignLines.length > 0) {
    lines.push(...campaignLines, '')
  }

  lines.push(
    `## Output Format`,
    `Respond with ONLY valid JSON matching this exact schema:`,
    ``,
    JSON.stringify({
      body: '...',
      hashtags: ['optional', 'tags', 'without', 'the', 'hash'],
      campaignName: 'A short, specific headline describing this post (used as the studio title)',
    }, null, 2),
  )

  return lines.join('\n')
}

function buildAdaptUserMessage(anchorBody: string, anchorHashtags: string[]): string {
  const lines = [
    `## Source LinkedIn post (the approved anchor)`,
    ``,
    anchorBody,
  ]
  if (anchorHashtags.length > 0) {
    lines.push(``, `Source hashtags: ${anchorHashtags.map((t) => `#${t.replace(/^#+/, '')}`).join(' ')}`)
  }
  lines.push(
    ``,
    `## Instruction`,
    ``,
    `Adapt the post above into a single native post that keeps its core idea. Return only the JSON object.`,
  )
  return lines.join('\n')
}

function normalizeAdaptResult(parsed: ClaudeAdaptResponse): AdaptResult {
  const hashtags = (parsed.hashtags ?? [])
    .map((t) => t.replace(/^#+/, '').trim())
    .filter(Boolean)
  return {
    body: parsed.body.trim(),
    hashtags,
    campaignName: parsed.campaignName?.trim() || 'Adapted post',
  }
}

export async function adaptAnchorToPlatform(params: {
  anchorBody: string
  anchorHashtags: string[]
  targetPlatform: AdaptTargetPlatform
  brandContext?: BrandContext
  campaignContext?: { goal: string; purpose: string | null } | null
}): Promise<AdaptResult> {
  const { anchorBody, anchorHashtags, targetPlatform, brandContext, campaignContext } = params

  const systemPrompt = buildAdaptSystemPrompt(targetPlatform, brandContext, campaignContext ?? null)
  const res = await callClaude({
    systemPrompt,
    userMessage: buildAdaptUserMessage(anchorBody, anchorHashtags),
    maxTokens: 1200,
  })

  let result = normalizeAdaptResult(parseJson<ClaudeAdaptResponse>(res.content))

  // X has a hard 280-char limit. Never silently return overlong copy — make one
  // bounded compression pass if the model overshoots.
  if (targetPlatform === 'x' && result.body.length > X_MAX_CHARS) {
    const retry = await callClaude({
      systemPrompt,
      userMessage: [
        buildAdaptUserMessage(anchorBody, anchorHashtags),
        ``,
        `Your previous attempt was ${result.body.length} characters — too long.`,
        `Rewrite it to fit within ${X_MAX_CHARS} characters without losing the core idea. Return only the JSON object.`,
      ].join('\n'),
      maxTokens: 1200,
    })
    const tightened = normalizeAdaptResult(parseJson<ClaudeAdaptResponse>(retry.content))
    // Keep whichever is within limit; prefer the tightened result.
    if (tightened.body.length <= X_MAX_CHARS || tightened.body.length < result.body.length) {
      result = tightened
    }
  }

  return result
}
