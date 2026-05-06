# Syndication Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast, generation-first syndication engine that turns one piece of content into platform-native posts for X, LinkedIn, Substack, and Blog using a hidden intelligence layer.

**Architecture:** Lightweight intelligence pass extracts a canonical `SyndicationIntelligence` object from the source, then fires one independent Claude generation call per selected platform in parallel. Platform generators receive only the intelligence object, never raw content. Streaming ndjson delivers outputs to the UI as each platform finishes.

**Tech Stack:** Next.js App Router, TypeScript, Anthropic SDK (`callClaude` from `lib/ai/generate.ts`), Zod, Tailwind CSS, existing `extractContent` from `lib/syndicate/extract/extractContent.ts`, existing `listLenses` from `lib/domain/lens.ts`.

---

## File Map

**Create (new files):**
- `lib/syndication/types/intelligence.ts` — `Platform`, `SyndicationIntelligence`, `SyndicationOutput`, `SyndicationRequest`, `SyndicationPhase`
- `lib/syndication/types/lenses.ts` — `PresetLens`, `SyndicationLens`, preset lens definitions
- `lib/syndication/platforms/x.ts` — X behavior model
- `lib/syndication/platforms/linkedin.ts` — LinkedIn behavior model
- `lib/syndication/platforms/substack.ts` — Substack behavior model
- `lib/syndication/platforms/blog.ts` — Blog behavior model
- `lib/syndication/intelligence/intelligencePrompt.ts` — system + user prompt for intelligence pass
- `lib/syndication/intelligence/extractIntelligence.ts` — orchestrates intelligence pass
- `lib/syndication/generation/generationPrompt.ts` — builds per-platform prompt from intelligence + platform model + lenses
- `lib/syndication/generation/generateOutput.ts` — single platform generation call
- `lib/syndication/extract/extractInput.ts` — wraps URL or raw text → `ExtractedContent`
- `lib/syndication/schemas/syndicationSchema.ts` — Zod input validation
- `app/api/syndication/generate/route.ts` — streaming POST endpoint
- `app/api/syndication/lenses/route.ts` — GET workspace lenses for client
- `app/(dashboard)/syndication/SyndicationClient.tsx` — client component (all UI state)
- `app/(dashboard)/syndication/page.tsx` — server component wrapper (fetches lenses, renders client)

**Modify (existing files):**
- `components/shell/sidebar.tsx` — add Syndication nav link

---

## Task 1: Core Types

**Files:**
- Create: `lib/syndication/types/intelligence.ts`
- Create: `lib/syndication/types/lenses.ts`

- [ ] **Step 1: Create `lib/syndication/types/intelligence.ts`**

```typescript
export type Platform = 'x' | 'linkedin' | 'substack' | 'blog'

export type SyndicationPhase =
  | 'extracting'
  | 'analyzing'
  | 'generating'
  | 'complete'

export interface SyndicationIntelligence {
  thesis: string
  tone: string
  audience: string
  persuasive_mechanics: string[]
  authority_style: string
  emotional_style: string
  spreadability_patterns: string[]
  narrative_style: string
  platform_risks: Partial<Record<Platform, string>>
  key_quotes: string[]
  adaptation_constraints: string[]
}

export interface SyndicationOutput {
  platform: Platform
  content: string
}

export interface SyndicationRequest {
  input: string
  platforms: Platform[]
  lenses: string[]  // preset lens names + workspace lens IDs
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  x: 'X',
  linkedin: 'LinkedIn',
  substack: 'Substack',
  blog: 'Blog',
}

export const PLATFORM_DESCRIPTORS: Record<Platform, string> = {
  x: 'Short-form · conversational · quotable',
  linkedin: 'Professional · authority-driven',
  substack: 'Editorial · immersive · long-form',
  blog: 'Structured · evergreen · searchable',
}
```

- [ ] **Step 2: Create `lib/syndication/types/lenses.ts`**

```typescript
export type PresetLensName =
  | 'Contrarian'
  | 'Founder'
  | 'Intellectual'
  | 'Technical'
  | 'Emotional'
  | 'Operator'
  | 'Luxury'
  | 'Investor'

export interface PresetLens {
  name: PresetLensName
  description: string
  rhetoricalModifier: string
}

export const PRESET_LENSES: PresetLens[] = [
  {
    name: 'Contrarian',
    description: 'Challenges conventional wisdom, surfaces the counter-intuitive angle',
    rhetoricalModifier: 'Challenge the dominant assumption. Find the inversion. Make the reader reconsider what they took for granted.',
  },
  {
    name: 'Founder',
    description: 'Frames through operational experience and product thinking',
    rhetoricalModifier: 'Write from the perspective of someone who has built things and lived with the consequences. Specific, operational, earned.',
  },
  {
    name: 'Intellectual',
    description: 'Elevates the argument to a conceptual or philosophical register',
    rhetoricalModifier: 'Raise the level of abstraction. Find the underlying principle. Connect to broader systems of ideas.',
  },
  {
    name: 'Technical',
    description: 'Grounds claims in mechanism and precision',
    rhetoricalModifier: 'Favor precision over polish. Explain the mechanism. Name the components. Reward technical readers.',
  },
  {
    name: 'Emotional',
    description: 'Leads with felt experience and human stakes',
    rhetoricalModifier: 'Lead with the human stakes. Make the reader feel the weight before explaining the structure.',
  },
  {
    name: 'Operator',
    description: 'Prioritizes execution clarity and practical decision-making',
    rhetoricalModifier: 'Write for someone who needs to act on this. Practical, direct, clear about what to do and why.',
  },
  {
    name: 'Luxury',
    description: 'Signals exclusivity, taste, and high-stakes positioning',
    rhetoricalModifier: 'Write with restraint and precision. Signal through what is left unsaid. Quality over quantity in every sentence.',
  },
  {
    name: 'Investor',
    description: 'Frames through return, risk, and capital allocation thinking',
    rhetoricalModifier: 'Frame through leverage, asymmetry, and long-term compounding. Think in bets, not tasks.',
  },
]

export interface SyndicationLens {
  id: string             // preset lens name OR workspace lens UUID
  name: string
  rhetoricalModifier: string
  isPreset: boolean
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/syndication/types/intelligence.ts lib/syndication/types/lenses.ts
git commit -m "feat(syndication): add core types — SyndicationIntelligence, Platform, lenses"
```

---

## Task 2: Platform Behavior Models

**Files:**
- Create: `lib/syndication/platforms/x.ts`
- Create: `lib/syndication/platforms/linkedin.ts`
- Create: `lib/syndication/platforms/substack.ts`
- Create: `lib/syndication/platforms/blog.ts`

- [ ] **Step 1: Create `lib/syndication/platforms/x.ts`**

```typescript
export const X_PLATFORM_MODEL = {
  platform: 'x' as const,
  rhetoricalEnvironment: `X (formerly Twitter) is a compression-first network. Ideas compete for attention in a stream of constant novelty. The dominant currency is quotability — ideas that can be extracted, screenshot, and reshared.

Readers arrive with short attention and high novelty tolerance. They reward identity-legible takes, tension-first openings, and earned brevity. They punish self-congratulation, empty hedging, and low-density prose.`,
  structuralRules: [
    'Front-load tension or the sharpest version of the thesis — do not build to it',
    'Every sentence must earn its place; cut anything that does not add compression or momentum',
    'The opening line determines everything — it must be quotable or provocative or precise',
    'Short paragraphs (1–2 lines max), not essays',
    'End with either a question, a hard statement, or a compressed insight — not a call to action',
  ],
  lengthTarget: '150–280 characters for single posts; 4–8 tight tweets if threading',
  antiPatterns: [
    'Do not open with "I" followed by self-description',
    'Do not use filler phrases: "here is what I learned", "a quick thread on", "buckle up"',
    'Do not preserve the source\'s pacing or sentence order',
    'Do not conclude with "what do you think?" or similar open solicitations',
    'Do not use emoji as structural punctuation',
  ],
}
```

- [ ] **Step 2: Create `lib/syndication/platforms/linkedin.ts`**

```typescript
export const LINKEDIN_PLATFORM_MODEL = {
  platform: 'linkedin' as const,
  rhetoricalEnvironment: `LinkedIn is a professional-identity network where authority and transformation are the dominant currencies. Readers arrive looking to signal their own sophistication through what they engage with.

The most effective content on LinkedIn combines demonstrated competence with a practical or philosophical insight the reader can carry into their work. Vulnerability is accepted when it is followed by growth or lesson. Contrarianism is accepted when it comes with earned credentials.`,
  structuralRules: [
    'Open with a hook that establishes either a problem the reader recognizes or a claim they want to interrogate',
    'Build through professional specificity — name industries, roles, patterns, decisions',
    'The core insight should be extractable as a one-sentence takeaway',
    'Moderate length: 150–400 words; long enough to demonstrate thinking, short enough to respect the reader',
    'Close with either a direct implication for the reader or a restatement of the thesis at higher altitude',
  ],
  lengthTarget: '150–400 words',
  antiPatterns: [
    'Do not open with "I am excited to share" or "Thrilled to announce"',
    'Do not use the phrase "in today\'s world" or "in this day and age"',
    'Do not list lessons as "5 things I learned" without structural reasoning',
    'Do not add hollow affirmations: "This is so important", "Love this"',
    'Do not use emoji as chapter breaks',
    'Avoid the LinkedIn inspirational cadence: short line / short line / short line / one-word punch',
  ],
}
```

- [ ] **Step 3: Create `lib/syndication/platforms/substack.ts`**

```typescript
export const SUBSTACK_PLATFORM_MODEL = {
  platform: 'substack' as const,
  rhetoricalEnvironment: `Substack is a long-form, subscription-native environment where readers arrive with deliberate attention and expect immersive prose. The dominant expectation is a writer with a developed worldview engaging seriously with an idea.

Readers tolerate — and reward — complexity, digression, and pacing variation when they serve the argument. Substack readers have opted into the relationship; they expect depth in return.`,
  structuralRules: [
    'Open with a scene, question, or observation that earns the reader\'s trust before the thesis arrives',
    'Allow the argument to develop through layering — introduce tension, develop it, resolve it with nuance',
    'Pacing can vary: fast sections earn slow sections',
    'Key quotes and specific details from the source should survive the adaptation — they are load-bearing',
    'End with a closing that elevates the argument to its most resonant abstraction, not a practical list',
  ],
  lengthTarget: '400–900 words',
  antiPatterns: [
    'Do not compress ideas that require space to land',
    'Do not adopt the punchy line-break cadence of X or LinkedIn',
    'Do not list conclusions — develop them',
    'Do not explain what you are about to argue before arguing it',
    'Do not use SEO-style headers ("What Is X", "Why X Matters")',
  ],
}
```

- [ ] **Step 4: Create `lib/syndication/platforms/blog.ts`**

```typescript
export const BLOG_PLATFORM_MODEL = {
  platform: 'blog' as const,
  rhetoricalEnvironment: `Blog content lives in search and reference contexts. Readers arrive from Google or direct links seeking explanations, frameworks, or authoritative takes on a specific topic. They are less likely to have prior relationship with the author.

The dominant expectations are: clear structure, scannable hierarchy, and durable utility. Content that remains correct and useful 12 months after publication is ideal.`,
  structuralRules: [
    'Open with a title that is specific and searchable; subtitles should clarify rather than tease',
    'Use a clear introduction that states the topic and the reader\'s takeaway',
    'Structure with H2/H3 headings that allow scanning — readers will not read linearly',
    'Each section should be self-contained: a reader who enters mid-article should be able to orient quickly',
    'Conclude with a practical summary or actionable synthesis',
  ],
  lengthTarget: '500–1200 words with clear section structure',
  antiPatterns: [
    'Do not write a title that could apply to any post on the topic ("Thoughts on X")',
    'Do not open without clearly identifying what the post is about',
    'Do not use cliffhangers or withhold the core insight until the end',
    'Do not write dense, unbroken paragraphs without visual relief',
    'Do not use tone that is so casual it undermines authority or so formal it reduces utility',
  ],
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/syndication/platforms/
git commit -m "feat(syndication): add platform behavior models for X, LinkedIn, Substack, Blog"
```

---

## Task 3: Input Extraction (URL + Text)

**Files:**
- Create: `lib/syndication/extract/extractInput.ts`

The existing `extractContent` in `lib/syndicate/extract/extractContent.ts` only handles URLs. This task adds a thin wrapper that handles both URL and raw text inputs.

- [ ] **Step 1: Create `lib/syndication/extract/extractInput.ts`**

```typescript
import { extractContent } from '@/lib/syndicate/extract/extractContent'
import type { ExtractedContent } from '@/lib/syndicate/types/analysis'

function isUrl(input: string): boolean {
  try {
    const url = new URL(input.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function rawTextToExtractedContent(text: string): ExtractedContent {
  const trimmed = text.trim()
  const words = trimmed.split(/\s+/)
  const wordCount = words.length
  const estimatedReadTime = Math.ceil(wordCount / 200)

  // Use first sentence as a title approximation
  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim() ?? ''
  const title = firstSentence.length > 80
    ? firstSentence.slice(0, 80) + '…'
    : firstSentence

  return {
    url: '',
    title,
    content: trimmed,
    excerpt: trimmed.slice(0, 200),
    sections: [{ text: trimmed }],
    chunks: [{
      id: 'chunk-0',
      text: trimmed,
      tokenCount: Math.ceil(trimmed.length / 4),
      order: 0,
    }],
    estimatedReadTime,
  }
}

export async function extractInput(input: string): Promise<ExtractedContent> {
  const trimmed = input.trim()

  if (isUrl(trimmed)) {
    return extractContent(trimmed)
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (wordCount < 50) {
    throw new Error('LOW_SIGNAL: Content too short for syndication')
  }

  return rawTextToExtractedContent(trimmed)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/syndication/extract/extractInput.ts
git commit -m "feat(syndication): add extractInput — handles URL and raw text inputs"
```

---

## Task 4: Intelligence Pass

**Files:**
- Create: `lib/syndication/intelligence/intelligencePrompt.ts`
- Create: `lib/syndication/intelligence/extractIntelligence.ts`

- [ ] **Step 1: Create `lib/syndication/intelligence/intelligencePrompt.ts`**

```typescript
export function buildIntelligenceSystemPrompt(): string {
  return `You are a content intelligence engine. Your job is to extract structured understanding from a piece of content so it can be reconstructed natively for different platforms.

You are NOT summarizing the content.
You are NOT rewriting the content.
You are identifying the underlying mechanics that make the content work — so those mechanics can be preserved and adapted.

## Your job

Extract:
- thesis: The single core claim or argument. One precise sentence. Not a topic, not a theme — the actual claim.
- tone: The dominant register. Examples: "dry wit with intellectual authority", "earnest vulnerability with operational precision", "confident contrarianism". Be specific.
- audience: Who this content was written for and what they care about. Be specific about their context, not just demographics.
- persuasive_mechanics: The specific rhetorical moves that make this content land. Examples: "delayed thesis after credibility establishment", "status displacement through example inversion", "authority softening before sharp claim".
- authority_style: How the writer establishes credibility. Examples: "operational specificity", "institutional name-dropping", "lived experience", "conceptual precision".
- emotional_style: The emotional register and how it is used. Examples: "earned vulnerability before critique", "controlled indignation", "intellectual excitement as invitation".
- spreadability_patterns: What makes this content shareable or memorable. Examples: "quotable compression of complex idea", "identity-signaling thesis readers can screenshot", "tension that invites disagreement".
- narrative_style: How the content is structured temporally. Examples: "confession → competence → insight", "status quo → disruption → implication", "question → evidence → counter-intuitive synthesis".
- platform_risks: For each platform (x, linkedin, substack, blog), one sentence about what makes adaptation challenging. Be honest about weak fits.
- key_quotes: 2–4 direct quotes from the content that are load-bearing — the sentences that most concentrate the content's energy.
- adaptation_constraints: What must be preserved in any adaptation for the content to remain honest and effective.

## Quality rules

- Thesis must be a single declarative claim, not a question or a topic.
- Persuasive mechanics must name the mechanism, not just the effect. "Status displacement" not "impressive".
- Forbidden words: engaging, authentic, resonant, valuable, powerful, relatable, inspiring, impactful.
- All observations must be derivable from the text — no projections.

## Output format

Return ONLY a valid JSON object matching this exact schema. No preamble, no explanation.

{
  "thesis": string,
  "tone": string,
  "audience": string,
  "persuasive_mechanics": string[],
  "authority_style": string,
  "emotional_style": string,
  "spreadability_patterns": string[],
  "narrative_style": string,
  "platform_risks": { "x"?: string, "linkedin"?: string, "substack"?: string, "blog"?: string },
  "key_quotes": string[],
  "adaptation_constraints": string[]
}`
}

export function buildIntelligenceUserMessage(content: { title: string; text: string }): string {
  const header = content.title ? `Title: ${content.title}\n\n` : ''
  return `${header}${content.text}`
}
```

- [ ] **Step 2: Create `lib/syndication/intelligence/extractIntelligence.ts`**

```typescript
import { callClaude } from '@/lib/ai/generate'
import { buildIntelligenceSystemPrompt, buildIntelligenceUserMessage } from './intelligencePrompt'
import type { ExtractedContent } from '@/lib/syndicate/types/analysis'
import type { SyndicationIntelligence } from '../types/intelligence'

export async function extractIntelligence(
  extracted: ExtractedContent,
): Promise<SyndicationIntelligence> {
  const result = await callClaude({
    systemPrompt: buildIntelligenceSystemPrompt(),
    userMessage: buildIntelligenceUserMessage({
      title: extracted.title,
      text: extracted.content,
    }),
    model: 'claude-sonnet-4-6',
    maxTokens: 1024,
  })

  let parsed: unknown
  try {
    // Strip markdown code fences if present
    const clean = result.content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    throw new Error('INTELLIGENCE_PARSE_FAILED: Could not parse intelligence object')
  }

  // Basic shape validation
  const obj = parsed as Record<string, unknown>
  if (
    typeof obj.thesis !== 'string' ||
    typeof obj.tone !== 'string' ||
    !Array.isArray(obj.persuasive_mechanics)
  ) {
    throw new Error('INTELLIGENCE_INVALID: Missing required fields')
  }

  return obj as unknown as SyndicationIntelligence
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/syndication/intelligence/
git commit -m "feat(syndication): add intelligence pass — lightweight extraction of canonical SyndicationIntelligence"
```

---

## Task 5: Platform Generation

**Files:**
- Create: `lib/syndication/generation/generationPrompt.ts`
- Create: `lib/syndication/generation/generateOutput.ts`

- [ ] **Step 1: Create `lib/syndication/generation/generationPrompt.ts`**

```typescript
import type { Platform, SyndicationIntelligence } from '../types/intelligence'
import type { SyndicationLens } from '../types/lenses'
import { X_PLATFORM_MODEL } from '../platforms/x'
import { LINKEDIN_PLATFORM_MODEL } from '../platforms/linkedin'
import { SUBSTACK_PLATFORM_MODEL } from '../platforms/substack'
import { BLOG_PLATFORM_MODEL } from '../platforms/blog'

const PLATFORM_MODELS = {
  x: X_PLATFORM_MODEL,
  linkedin: LINKEDIN_PLATFORM_MODEL,
  substack: SUBSTACK_PLATFORM_MODEL,
  blog: BLOG_PLATFORM_MODEL,
}

export function buildGenerationSystemPrompt(
  platform: Platform,
  intelligence: SyndicationIntelligence,
  lenses: SyndicationLens[],
): string {
  const model = PLATFORM_MODELS[platform]

  const lensSection = lenses.length > 0
    ? `\n## Active lenses\n\nThe following rhetorical lenses have been selected. Apply them as framing modifiers — they shape HOW the content is expressed, not WHAT it says.\n\n${lenses.map(l => `**${l.name}:** ${l.rhetoricalModifier}`).join('\n\n')}`
    : ''

  const platformRisk = intelligence.platform_risks[platform]
  const riskNote = platformRisk
    ? `\n## Adaptation challenge\n\n${platformRisk}\n\nAcknowledge this challenge in your reconstruction — work around it, don't ignore it.`
    : ''

  return `You are a platform-native content reconstruction engine. You do NOT rewrite content. You reconstruct it — preserving its persuasive intelligence while rebuilding its structure, pacing, and expression for a specific rhetorical environment.

## Source intelligence

You have been given a structured analysis of the source content. This is your only input. Do not invent facts. Do not exceed what the source intelligence supports.

**Thesis:** ${intelligence.thesis}

**Tone:** ${intelligence.tone}

**Audience:** ${intelligence.audience}

**Persuasive mechanics:** ${intelligence.persuasive_mechanics.join('; ')}

**Authority style:** ${intelligence.authority_style}

**Emotional style:** ${intelligence.emotional_style}

**Spreadability patterns:** ${intelligence.spreadability_patterns.join('; ')}

**Narrative style:** ${intelligence.narrative_style}

**Adaptation constraints:** ${intelligence.adaptation_constraints.join('; ')}

**Key quotes (preserve these if they survive compression):**
${intelligence.key_quotes.map(q => `- "${q}"`).join('\n')}

## Platform: ${model.platform.toUpperCase()}

${model.rhetoricalEnvironment}

### Structural rules
${model.structuralRules.map(r => `- ${r}`).join('\n')}

### Target length
${model.lengthTarget}

### Anti-patterns (never do these)
${model.antiPatterns.map(a => `- ${a}`).join('\n')}
${lensSection}${riskNote}

## Hard constraints (apply to all platforms)

- NEVER produce content that feels summarized, templated, or AI-generated
- NEVER open with the author's name, "I", or self-referential framing unless it serves the hook
- NEVER use "Here are N lessons/things/ways"
- NEVER use empty hooks: "This changed everything", "I wish someone told me this"
- NEVER preserve the source's sentence order — reconstruct, do not rearrange
- NEVER add hashtags unless the platform requires them (blog only: none; X: max 1 if natural)
- The output must feel independently written for ${model.platform}, not adapted FROM somewhere else

## Output format

Return ONLY the final content. No preamble, no explanation, no metadata. Just the post/essay/article text ready to be copied and used.`
}

export function buildGenerationUserMessage(platform: Platform): string {
  const platformNames: Record<Platform, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    substack: 'Substack newsletter',
    blog: 'blog post',
  }
  return `Reconstruct this content for ${platformNames[platform]}. Output only the final text.`
}
```

- [ ] **Step 2: Create `lib/syndication/generation/generateOutput.ts`**

```typescript
import { callClaude } from '@/lib/ai/generate'
import { buildGenerationSystemPrompt, buildGenerationUserMessage } from './generationPrompt'
import type { Platform, SyndicationIntelligence, SyndicationOutput } from '../types/intelligence'
import type { SyndicationLens } from '../types/lenses'

export async function generateOutput(
  platform: Platform,
  intelligence: SyndicationIntelligence,
  lenses: SyndicationLens[],
): Promise<SyndicationOutput> {
  const result = await callClaude({
    systemPrompt: buildGenerationSystemPrompt(platform, intelligence, lenses),
    userMessage: buildGenerationUserMessage(platform),
    model: 'claude-sonnet-4-6',
    maxTokens: 2048,
  })

  return {
    platform,
    content: result.content.trim(),
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/syndication/generation/
git commit -m "feat(syndication): add per-platform generation — generationPrompt and generateOutput"
```

---

## Task 6: Input Schema

**Files:**
- Create: `lib/syndication/schemas/syndicationSchema.ts`

- [ ] **Step 1: Create `lib/syndication/schemas/syndicationSchema.ts`**

```typescript
import { z } from 'zod'

export const syndicationRequestSchema = z.object({
  input: z
    .string()
    .min(1, 'Please provide a URL or paste your content.')
    .max(50_000, 'Content is too long.'),
  platforms: z
    .array(z.enum(['x', 'linkedin', 'substack', 'blog']))
    .min(1, 'Select at least one platform.'),
  lenses: z.array(z.string()).max(2, 'Select a maximum of 2 lenses.').default([]),
})

export type SyndicationRequestInput = z.infer<typeof syndicationRequestSchema>
```

- [ ] **Step 2: Commit**

```bash
git add lib/syndication/schemas/syndicationSchema.ts
git commit -m "feat(syndication): add Zod input schema with 2-lens max enforcement"
```

---

## Task 7: API Routes

**Files:**
- Create: `app/api/syndication/generate/route.ts`
- Create: `app/api/syndication/lenses/route.ts`

- [ ] **Step 1: Create `app/api/syndication/generate/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { syndicationRequestSchema } from '@/lib/syndication/schemas/syndicationSchema'
import { extractInput } from '@/lib/syndication/extract/extractInput'
import { extractIntelligence } from '@/lib/syndication/intelligence/extractIntelligence'
import { generateOutput } from '@/lib/syndication/generation/generateOutput'
import { listLenses } from '@/lib/domain/lens'
import { PRESET_LENSES } from '@/lib/syndication/types/lenses'
import type { SyndicationLens } from '@/lib/syndication/types/lenses'
import type { Platform } from '@/lib/syndication/types/intelligence'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = syndicationRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    )
  }

  const { input, platforms, lenses: lensIds } = parsed.data
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      try {
        // Resolve lens objects from preset names + workspace lens IDs
        const resolvedLenses: SyndicationLens[] = []
        if (lensIds.length > 0) {
          const workspaceLensesResult = await listLenses({ workspaceId: session.workspaceId })
          const workspaceLenses = workspaceLensesResult.ok ? workspaceLensesResult.data : []

          for (const id of lensIds) {
            const preset = PRESET_LENSES.find((l) => l.name === id)
            if (preset) {
              resolvedLenses.push({
                id: preset.name,
                name: preset.name,
                rhetoricalModifier: preset.rhetoricalModifier,
                isPreset: true,
              })
              continue
            }
            const workspaceLens = workspaceLenses.find((l) => l.id === id)
            if (workspaceLens) {
              resolvedLenses.push({
                id: workspaceLens.id,
                name: workspaceLens.name,
                rhetoricalModifier: workspaceLens.systemPrompt,
                isPreset: false,
              })
            }
          }
        }

        // Step 1: Extract content
        send({ type: 'progress', phase: 'extracting' })
        const extracted = await extractInput(input)

        // Step 2: Intelligence pass
        send({ type: 'progress', phase: 'analyzing' })
        const intelligence = await extractIntelligence(extracted)

        // Step 3: Parallel platform generation
        send({ type: 'progress', phase: 'generating' })

        await Promise.allSettled(
          platforms.map(async (platform: Platform) => {
            try {
              const output = await generateOutput(platform, intelligence, resolvedLenses)
              send({ type: 'output', platform, content: output.content })
            } catch (err) {
              send({
                type: 'platform_error',
                platform,
                message: err instanceof Error ? err.message : 'Generation failed',
              })
            }
          }),
        )

        send({ type: 'complete' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed.'

        let code = 'GENERATION_FAILED'
        let userMessage = "Something went wrong. Please try again."

        if (message.startsWith('FETCH_FAILED')) {
          code = 'FETCH_FAILED'
          userMessage = "We couldn't reach that URL. Check that it's publicly accessible."
        } else if (message.startsWith('EXTRACTION_FAILED')) {
          code = 'EXTRACTION_FAILED'
          userMessage = "We couldn't extract readable content — the page may be paywalled or bot-protected."
        } else if (message.startsWith('LOW_SIGNAL')) {
          code = 'LOW_SIGNAL'
          userMessage = 'Content is too short. Paste at least 50–100 words for strong platform adaptations.'
        }

        send({ type: 'error', error: { code, message: userMessage } })
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
```

- [ ] **Step 2: Create `app/api/syndication/lenses/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { PRESET_LENSES } from '@/lib/syndication/types/lenses'
import type { SyndicationLens } from '@/lib/syndication/types/lenses'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceLensesResult = await listLenses({ workspaceId: session.workspaceId })
  const workspaceLenses = workspaceLensesResult.ok ? workspaceLensesResult.data : []

  const presets: SyndicationLens[] = PRESET_LENSES.map((l) => ({
    id: l.name,
    name: l.name,
    rhetoricalModifier: l.rhetoricalModifier,
    isPreset: true,
  }))

  const workspace: SyndicationLens[] = workspaceLenses.map((l) => ({
    id: l.id,
    name: l.name,
    rhetoricalModifier: l.systemPrompt,
    isPreset: false,
  }))

  return NextResponse.json({ lenses: [...presets, ...workspace] })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/syndication/
git commit -m "feat(syndication): add generate and lenses API routes"
```

---

## Task 8: UI — Client Component

**Files:**
- Create: `app/(dashboard)/syndication/SyndicationClient.tsx`

This is the main interactive component. The server component wrapper (Task 9) renders this with lenses pre-fetched.

- [ ] **Step 1: Create `app/(dashboard)/syndication/SyndicationClient.tsx`**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Platform, SyndicationOutput, SyndicationPhase } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS, PLATFORM_DESCRIPTORS } from '@/lib/syndication/types/intelligence'
import type { SyndicationLens } from '@/lib/syndication/types/lenses'

const ALL_PLATFORMS: Platform[] = ['x', 'linkedin', 'substack', 'blog']

type CardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; content: string }
  | { status: 'error'; message: string }

type UIState =
  | { status: 'idle' }
  | { status: 'running'; phase: SyndicationPhase }
  | { status: 'partial' | 'complete' }
  | { status: 'error'; message: string }

interface FocusedCard {
  platform: Platform
  content: string
}

interface Props {
  availableLenses: SyndicationLens[]
}

export function SyndicationClient({ availableLenses }: Props) {
  const [input, setInput] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['x', 'linkedin', 'substack', 'blog'])
  const [selectedLenses, setSelectedLenses] = useState<string[]>([])
  const [ui, setUi] = useState<UIState>({ status: 'idle' })
  const [cards, setCards] = useState<Partial<Record<Platform, CardState>>>({})
  const [focused, setFocused] = useState<FocusedCard | null>(null)
  const [sourceVisible, setSourceVisible] = useState(false)

  const isRunning = ui.status === 'running'
  const hasResults = ui.status === 'partial' || ui.status === 'complete'

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    )
  }

  function toggleLens(lensId: string) {
    setSelectedLenses((prev) => {
      if (prev.includes(lensId)) return prev.filter((l) => l !== lensId)
      if (prev.length >= 2) return prev  // max 2 lenses
      return [...prev, lensId]
    })
  }

  async function handleGenerate() {
    if (!input.trim() || selectedPlatforms.length === 0 || isRunning) return

    // Reset state
    setUi({ status: 'running', phase: 'extracting' })
    setCards(
      Object.fromEntries(selectedPlatforms.map((p) => [p, { status: 'loading' as const }])),
    )
    setFocused(null)
    setSourceVisible(false)

    try {
      const res = await fetch('/api/syndication/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          platforms: selectedPlatforms,
          lenses: selectedLenses,
        }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          let frame: Record<string, unknown>
          try {
            frame = JSON.parse(trimmed)
          } catch {
            continue
          }

          if (frame.type === 'progress') {
            setUi({ status: 'running', phase: frame.phase as SyndicationPhase })
          } else if (frame.type === 'output') {
            const platform = frame.platform as Platform
            const content = frame.content as string
            setCards((prev) => ({ ...prev, [platform]: { status: 'done', content } }))
            setUi({ status: 'partial' })
          } else if (frame.type === 'platform_error') {
            const platform = frame.platform as Platform
            setCards((prev) => ({
              ...prev,
              [platform]: { status: 'error', message: frame.message as string },
            }))
          } else if (frame.type === 'complete') {
            setUi({ status: 'complete' })
          } else if (frame.type === 'error') {
            const err = frame.error as { message: string }
            setUi({ status: 'error', message: err.message })
          }
        }
      }
    } catch {
      setUi({ status: 'error', message: 'Something went wrong. Check the URL and try again.' })
    }
  }

  function handleReset() {
    setInput('')
    setUi({ status: 'idle' })
    setCards({})
    setFocused(null)
    setSelectedLenses([])
  }

  async function handleRegenerate(platform: Platform) {
    if (!input.trim()) return
    setCards((prev) => ({ ...prev, [platform]: { status: 'loading' } }))
    if (focused?.platform === platform) setFocused(null)

    try {
      const res = await fetch('/api/syndication/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          platforms: [platform],
          lenses: selectedLenses,
        }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          let frame: Record<string, unknown>
          try { frame = JSON.parse(trimmed) } catch { continue }
          if (frame.type === 'output') {
            const content = frame.content as string
            setCards((prev) => ({ ...prev, [platform]: { status: 'done', content } }))
          }
        }
      }
    } catch {
      setCards((prev) => ({
        ...prev,
        [platform]: { status: 'error', message: 'Regeneration failed. Try again.' },
      }))
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => null)
  }

  const phaseLabels: Record<SyndicationPhase, string> = {
    extracting: 'Extracting content…',
    analyzing: 'Analyzing narrative intelligence…',
    generating: 'Generating platform versions…',
    complete: 'Complete',
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-5xl px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-medium text-zinc-900 leading-tight mb-2">
            Syndication Engine
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">
            Turn one piece of content into platform-native versions for every major network.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-5 mb-8">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isRunning}
            placeholder="Paste a post, article, thread, or essay — or drop in a URL…"
            rows={4}
            className={cn(
              'w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-300 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-0',
              'disabled:opacity-50 transition-opacity',
            )}
          />

          {/* Platform toggles */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  disabled={isRunning}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    selectedPlatforms.includes(platform)
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {PLATFORM_LABELS[platform]}
                </button>
              ))}
            </div>
          </div>

          {/* Lens chips */}
          {availableLenses.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Lenses</p>
                {selectedLenses.length === 2 && (
                  <span className="text-xs text-zinc-300">max 2 selected</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableLenses.map((lens) => {
                  const isSelected = selectedLenses.includes(lens.id)
                  const isDisabled = isRunning || (!isSelected && selectedLenses.length >= 2)
                  return (
                    <button
                      key={lens.id}
                      onClick={() => toggleLens(lens.id)}
                      disabled={isDisabled}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        isSelected
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                      )}
                    >
                      {lens.name}
                      {!lens.isPreset && (
                        <span className="ml-1 text-zinc-400">·</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isRunning || !input.trim() || selectedPlatforms.length === 0}
              className={cn(
                'rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors',
                'hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {isRunning ? 'Generating…' : 'Generate Versions'}
            </button>

            {isRunning && ui.status === 'running' && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse" />
                <span className="text-xs text-zinc-400">{phaseLabels[ui.phase]}</span>
              </div>
            )}

            {hasResults && !isRunning && (
              <button
                onClick={handleReset}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Start over
              </button>
            )}
          </div>

          {/* Error */}
          {ui.status === 'error' && (
            <p className="text-xs text-red-500">{ui.message}</p>
          )}
        </div>

        {/* Results */}
        {hasResults && (
          <div className="space-y-6">
            {/* Source collapsible */}
            <div className="border border-zinc-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setSourceVisible((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <span className="font-medium">Source Content</span>
                <span>{sourceVisible ? '▲' : '▼'}</span>
              </button>
              {sourceVisible && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {input}
                  </p>
                </div>
              )}
            </div>

            {/* Card grid */}
            {focused ? (
              /* Focused edit mode */
              <div className="space-y-4">
                <button
                  onClick={() => setFocused(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  ← All versions
                </button>
                <div className="rounded-lg border border-zinc-200 p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
                      {PLATFORM_LABELS[focused.platform]}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {PLATFORM_DESCRIPTORS[focused.platform]}
                    </p>
                    {selectedLenses.length > 0 && (
                      <p className="text-xs text-zinc-300 mt-1">
                        Applied: {selectedLenses.join(' + ')}
                      </p>
                    )}
                  </div>
                  <textarea
                    value={focused.content}
                    onChange={(e) => setFocused({ ...focused, content: e.target.value })}
                    rows={12}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => copyToClipboard(focused.content)}
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleRegenerate(focused.platform)}
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      Regenerate {PLATFORM_LABELS[focused.platform]} Version
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Grid overview */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedPlatforms.map((platform) => {
                  const card = cards[platform] ?? { status: 'idle' }
                  return (
                    <PlatformCard
                      key={platform}
                      platform={platform}
                      card={card}
                      selectedLenses={selectedLenses}
                      onFocus={(content) => setFocused({ platform, content })}
                      onCopy={copyToClipboard}
                      onRegenerate={() => handleRegenerate(platform)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PlatformCard({
  platform,
  card,
  selectedLenses,
  onFocus,
  onCopy,
  onRegenerate,
}: {
  platform: Platform
  card: CardState
  selectedLenses: string[]
  onFocus: (content: string) => void
  onCopy: (text: string) => void
  onRegenerate: () => void
}) {
  // Visible line heights differ per platform to reinforce native feel
  const previewLines: Record<Platform, number> = {
    x: 4,
    linkedin: 6,
    substack: 10,
    blog: 8,
  }
  const lines = previewLines[platform]

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 p-4 space-y-3 flex flex-col',
        card.status === 'done' && 'cursor-pointer hover:border-zinc-400 transition-colors',
      )}
      onClick={() => card.status === 'done' && onFocus(card.content)}
    >
      <div>
        <p className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
          {PLATFORM_LABELS[platform]}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">{PLATFORM_DESCRIPTORS[platform]}</p>
        {selectedLenses.length > 0 && (
          <p className="text-xs text-zinc-300 mt-1">Applied: {selectedLenses.join(' + ')}</p>
        )}
      </div>

      {card.status === 'loading' && (
        <div className="space-y-2 flex-1">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-3 rounded bg-zinc-100 animate-pulse',
                i === lines - 1 ? 'w-2/3' : 'w-full',
              )}
            />
          ))}
        </div>
      )}

      {card.status === 'done' && (
        <>
          <p
            className="text-sm text-zinc-700 leading-relaxed flex-1"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: lines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            } as React.CSSProperties}
          >
            {card.content}
          </p>
          <div
            className="flex flex-wrap gap-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onCopy(card.content)}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Copy
            </button>
            <button
              onClick={() => onFocus(card.content)}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onRegenerate}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Regenerate {PLATFORM_LABELS[platform]} Version
            </button>
          </div>
        </>
      )}

      {card.status === 'error' && (
        <div className="space-y-2">
          <p className="text-xs text-red-500">{card.message}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate() }}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/syndication/SyndicationClient.tsx"
git commit -m "feat(syndication): add SyndicationClient — grid overview, focused edit, streaming state"
```

---

## Task 9: Page + Navigation

**Files:**
- Create: `app/(dashboard)/syndication/page.tsx`
- Modify: `components/shell/sidebar.tsx`

- [ ] **Step 1: Read the current sidebar file to understand the nav link pattern**

Read `components/shell/sidebar.tsx` and identify the pattern used for nav links (which icon component, which Link/href pattern, how active states are handled).

- [ ] **Step 2: Create `app/(dashboard)/syndication/page.tsx`**

```tsx
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { PRESET_LENSES } from '@/lib/syndication/types/lenses'
import type { SyndicationLens } from '@/lib/syndication/types/lenses'
import { SyndicationClient } from './SyndicationClient'
import { redirect } from 'next/navigation'

export default async function SyndicationPage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const workspaceLensesResult = await listLenses({ workspaceId: session.workspaceId })
  const workspaceLenses = workspaceLensesResult.ok ? workspaceLensesResult.data : []

  const presets: SyndicationLens[] = PRESET_LENSES.map((l) => ({
    id: l.name,
    name: l.name,
    rhetoricalModifier: l.rhetoricalModifier,
    isPreset: true,
  }))

  const workspace: SyndicationLens[] = workspaceLenses.map((l) => ({
    id: l.id,
    name: l.name,
    rhetoricalModifier: l.systemPrompt,
    isPreset: false,
  }))

  return <SyndicationClient availableLenses={[...presets, ...workspace]} />
}
```

- [ ] **Step 3: Add Syndication nav link to sidebar**

Read `components/shell/sidebar.tsx` fully, then add a "Syndication" nav item following the same pattern as existing items. Use an appropriate icon (e.g. `ArrowsRightLeft` or `Share2` from lucide-react). Link to `/syndication`.

- [ ] **Step 4: Verify the app builds without TypeScript errors**

```bash
npx tsc --noEmit
```

Fix any type errors before proceeding.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/syndication/" components/shell/sidebar.tsx
git commit -m "feat(syndication): add page and sidebar nav link"
```

---

## Task 10: End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to `/syndication` and verify the page loads**

Expected: Header "Syndication Engine", textarea input, platform toggles (all 4 selected), lens chips, "Generate Versions" button.

- [ ] **Step 3: Test with a real URL**

Paste a publicly accessible article URL (e.g. any Substack post or blog article). Click "Generate Versions". Expected:
- Progress indicator shows: "Extracting content…" → "Analyzing narrative intelligence…" → "Generating platform versions…"
- Platform cards appear as skeletons then fill in independently as each completes
- All 4 platform cards show distinct content with different apparent density/length

- [ ] **Step 4: Test Copy action**

Click "Copy" on any card. Verify clipboard contains the generated text.

- [ ] **Step 5: Test focused edit mode**

Click a platform card. Expected: transitions to focused edit view showing full content in textarea, back button, Regenerate button with platform name.

- [ ] **Step 6: Test Regenerate**

In focused edit mode, click "Regenerate X Version". Expected: content updates with a new generation (may differ from first).

- [ ] **Step 7: Test lens selection**

Select 2 lenses. Attempt to select a 3rd — verify the 3rd cannot be selected (button disabled). Generate versions. Verify "Applied: Lens1 + Lens2" appears on cards.

- [ ] **Step 8: Test text input**

Paste raw text (not a URL, at least 100 words) instead of a URL. Verify the pipeline handles it without error.

- [ ] **Step 9: Test error state**

Paste an invalid or private URL. Verify a user-friendly error message appears (not a raw stack trace).

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "feat(syndication): complete syndication engine — intelligence pass, parallel generation, UI"
```
