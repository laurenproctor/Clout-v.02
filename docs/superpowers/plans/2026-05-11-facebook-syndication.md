# Facebook Syndication Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Facebook as a sixth platform in the Clout syndication engine, with a purpose-built behavior model that optimizes for personal-profile posts with variant controls for Page/brand voice.

**Architecture:** Facebook follows the exact same pattern as the five existing platforms — a `PlatformBehaviorModel` file, a registry entry, and a UI card component. All changes are additive. The "flexible personal/Page" requirement is handled via 6 rewrite variant controls on the card rather than a separate generation mode.

**Tech Stack:** TypeScript, Next.js App Router, React, Zod, Claude API (via existing `generateOutput.ts`). No new dependencies.

> **Note on tests:** This project has no automated test suite. TypeScript compilation (`npx tsc --noEmit`) serves as the primary correctness check after each task. Manual browser verification is the final acceptance step.

---

### Task 1: Extend the Platform type

**Files:**
- Modify: `lib/syndication/types/intelligence.ts`

- [ ] **Step 1: Add `'facebook'` to the `Platform` union and metadata records**

Replace the current contents of `lib/syndication/types/intelligence.ts` with:

```typescript
export type Platform = 'x' | 'linkedin' | 'substack' | 'blog' | 'threads' | 'facebook'

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
  threads: 'Threads',
  facebook: 'Facebook',
}

export const PLATFORM_DESCRIPTORS: Record<Platform, string> = {
  x: 'Short-form · conversational · quotable',
  linkedin: 'Professional · authority-driven',
  substack: 'Editorial · immersive · long-form',
  blog: 'Structured · evergreen · searchable',
  threads: 'Social · conversational · reply-native',
  facebook: 'Personal · story-driven · conversation-first',
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only about `PLATFORM_REGISTRY` not covering `'facebook'` yet (that's fine — we'll fix it in Task 3). If you see other errors, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add lib/syndication/types/intelligence.ts
git commit -m "feat(syndication): add facebook to Platform type and metadata"
```

---

### Task 2: Write the Facebook behavior model

**Files:**
- Create: `lib/syndication/platforms/facebook.ts`

- [ ] **Step 1: Create the behavior model file**

Create `lib/syndication/platforms/facebook.ts`:

```typescript
export const FACEBOOK_PLATFORM_MODEL = {
  platform: 'facebook' as const,

  rhetoricalEnvironment: `Facebook is a personal-social feed where content from friends, family, news publishers, and brands all compete for the same scroll. Unlike LinkedIn (professional credibility) or X (compressed discourse), the dominant register here is personal and social — people arrive to see what their network is doing and thinking, not to be informed or professionally enriched.

What performs well reads like something a trusted friend shared: a personal reaction to an idea, a story triggered by reading something, a genuine question opened to the room. Posts that read like information delivery, marketing copy, or thought leadership land poorly in this context.

The Facebook algorithm prioritizes content that generates comments over passive engagement. Posts that end by genuinely inviting the reader's own experience or opinion consistently outperform posts that close. Link previews auto-generate from shared URLs — the post text should contextualize or react to the content, not summarize it.`,

  preWritingFramework: `Before writing, work through these questions:

1. What's the personal angle? Not "what is this article about" but "what does someone's reaction to this article sound like when they share it with friends?" That's the voice.

2. What are the first 250 characters? Facebook mobile truncates at roughly 3 lines before "See more." If the first 250 characters don't earn the click, the post dies. Write the hook before writing anything else.

3. What does this invite? The best Facebook posts end with an implicit or explicit opening for the reader's own story, opinion, or experience. Not a CTA — a genuine conversational opening.

4. Is this a personal profile post or a Page post? Personal: first-person, narrative, conversational. Page: slightly shorter, benefit-focused, still warm but with a clearer point of action.

5. Would your friend read this and say "interesting, this happened to me too" or "I have thoughts on this"? That's the engagement signal. If they'd just nod and scroll, the post needs a stronger hook or question.`,

  structuralRules: [
    'Open with a hook that works in the first 250 characters — this is what shows before "See more" on mobile',
    'Write in first person with a personal narrative angle — share a reaction, a story, or a perspective, not just the article',
    'Use short conversational paragraphs (1–3 sentences each) — dense blocks break on mobile',
    'End with a genuine engagement hook: a question that invites the reader\'s own experience, story, or opinion',
    'When sharing a URL, let the link preview handle "what is this" — the post text should provide the personal context or reaction',
    'Paragraph breaks are editorial; use them to create rhythm, not just to avoid walls of text',
    'Write at a conversational register: complete sentences, natural rhythm, no hashtags',
    'Personal posts: 150–300 words; Page posts: 80–150 words',
  ],

  lengthTarget: '150–300 words for personal profiles; 80–150 words for Page/brand posts. Long enough to tell a story, short enough not to hit the "wall of text" scroll reflex.',

  antiPatterns: [
    'Hashtags of any kind — hashtags actively suppress organic reach on Facebook; do not include any',
    '"Excited to share," "thrilled to announce," or any variation of excited-to-share language',
    'LinkedIn authority cadence: short-line stacking, competence signaling, credentialed contrarianism',
    'Generic calls to action: "check this out," "link below," "click here," "learn more"',
    'Thread formatting: numbered posts, multi-part arcs — this is a single-post surface',
    'Pure information delivery without a personal frame, reaction, or narrative',
    'Dense prose blocks without paragraph breaks',
    'Corporate passive voice: "it has been noted that," "research suggests"',
    '"In today\'s world," "In this day and age," "In the current landscape"',
    'Hollow engagement bait: "Double tap if you agree," "Tag someone who needs this"',
    'Restating the article headline — the link preview already does this',
  ],
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | head -40
```

Expected: same errors as before (registry not updated yet). No new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/syndication/platforms/facebook.ts
git commit -m "feat(syndication): add Facebook platform behavior model"
```

---

### Task 3: Register Facebook in the platform registry

**Files:**
- Modify: `lib/syndication/registry.ts`

- [ ] **Step 1: Import the model and add the registry entry**

Replace the contents of `lib/syndication/registry.ts` with:

```typescript
import type { Platform } from './types/intelligence'
import type { PlatformBehaviorModel } from './types/platform'
import { X_PLATFORM_MODEL } from './platforms/x'
import { LINKEDIN_PLATFORM_MODEL } from './platforms/linkedin'
import { SUBSTACK_PLATFORM_MODEL } from './platforms/substack'
import { BLOG_PLATFORM_MODEL } from './platforms/blog'
import { THREADS_PLATFORM_MODEL } from './platforms/threads'
import { FACEBOOK_PLATFORM_MODEL } from './platforms/facebook'

// The registry is the single authoritative source for all platform behavior.
// Future fields (validator, formatter, publisher, analytics) are commented as
// stub signatures — add them as each subsystem is built.
export interface PlatformDefinition {
  id: Platform
  label: string
  descriptor: string
  maxTokens: number
  model: PlatformBehaviorModel
  // validator?: (text: string) => import('./validation/types').ValidationResult
  // formatter?: (content: import('@/types/domain').OutputContent) => string
  // publisher?: (...args: unknown[]) => Promise<unknown>
  // analytics?: unknown
}

export const PLATFORM_REGISTRY: Record<Platform, PlatformDefinition> = {
  x: {
    id: 'x',
    label: 'X',
    descriptor: 'Short-form · conversational · quotable',
    maxTokens: 160,
    model: X_PLATFORM_MODEL as PlatformBehaviorModel,
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    descriptor: 'Professional · authority-driven',
    maxTokens: 800,
    model: LINKEDIN_PLATFORM_MODEL as PlatformBehaviorModel,
  },
  substack: {
    id: 'substack',
    label: 'Substack',
    descriptor: 'Editorial · immersive · long-form',
    maxTokens: 1400,
    model: SUBSTACK_PLATFORM_MODEL as PlatformBehaviorModel,
  },
  blog: {
    id: 'blog',
    label: 'Blog',
    descriptor: 'Structured · evergreen · searchable',
    maxTokens: 1600,
    model: BLOG_PLATFORM_MODEL as PlatformBehaviorModel,
  },
  threads: {
    id: 'threads',
    label: 'Threads',
    descriptor: 'Social · conversational · reply-native',
    maxTokens: 220,
    model: THREADS_PLATFORM_MODEL,
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    descriptor: 'Personal · story-driven · conversation-first',
    maxTokens: 600,
    model: FACEBOOK_PLATFORM_MODEL as PlatformBehaviorModel,
  },
}
```

- [ ] **Step 2: Type-check — expect clean**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors. The registry is the keystone — adding `'facebook'` here satisfies `Record<Platform, PlatformDefinition>`. If errors remain, read them carefully and fix.

- [ ] **Step 3: Commit**

```bash
git add lib/syndication/registry.ts
git commit -m "feat(syndication): register Facebook in platform registry"
```

---

### Task 4: Update the Zod validation schema

**Files:**
- Modify: `lib/syndication/schemas/syndicationSchema.ts`

- [ ] **Step 1: Add `'facebook'` to the platforms enum**

Replace the contents of `lib/syndication/schemas/syndicationSchema.ts` with:

```typescript
import { z } from 'zod'

export const syndicationRequestSchema = z.object({
  input: z
    .string()
    .min(1, 'Please provide a URL.')
    .max(50_000, 'Content is too long.'),
  platforms: z
    .array(z.enum(['x', 'linkedin', 'substack', 'blog', 'threads', 'facebook']))
    .min(1, 'Select at least one platform.'),
  notes: z.string().max(50_000).optional(),
})

export type SyndicationRequestInput = z.infer<typeof syndicationRequestSchema>
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/syndication/schemas/syndicationSchema.ts
git commit -m "feat(syndication): add facebook to syndication request schema"
```

---

### Task 5: Build the FacebookCard component

**Files:**
- Create: `app/(dashboard)/syndicate/FacebookCard.tsx`

- [ ] **Step 1: Create the card component**

Create `app/(dashboard)/syndicate/FacebookCard.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { truncateAtWord } from './intelligenceUtils'

const SEE_MORE_CHARS = 250

const REWRITE_VARIANTS = [
  { label: 'More personal', note: 'Lean into first-person narrative and personal reaction. The post should feel like sharing your own experience or response to this idea, not reporting on it.' },
  { label: 'More Page-ready', note: 'Shift toward a brand or creator Page voice. Make it slightly shorter (aim for 80–150 words), more benefit-focused, and appropriate for a business or creator posting to followers — still warm, but less personally narrative.' },
  { label: 'Shorter / punchier', note: 'Tighten this to under 150 words. Cut any setup that doesn\'t earn its place. Every sentence must do work.' },
  { label: 'Add engagement question', note: 'End with a specific, genuine question that invites the reader\'s own experience or opinion. Not a CTA — a real conversational opening that makes someone want to respond.' },
  { label: 'More conversational', note: 'Bring the register down. Casual sentence rhythm, natural word choice, reads like a real person talking to friends. No formality, no polish signals.' },
  { label: 'More emotional', note: 'Lead with emotional stakes and personal resonance. Make the human dimension immediate before the argument or insight lands.' },
]

function wordCount(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length
  return `${words} words`
}

interface Props {
  content: string
  intelligence: SyndicationIntelligence
  onFocus: () => void
  onCopy: () => void
  onRegenerate: (variantNote?: string) => void
}

export default function FacebookCard({ content, intelligence, onFocus, onCopy, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showVariants, setShowVariants] = useState(false)

  const needsTruncation = content.length > SEE_MORE_CHARS
  const displayContent = needsTruncation && !expanded
    ? content.slice(0, SEE_MORE_CHARS).trimEnd()
    : content

  function handleCopy() {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Facebook</span>
          <span className="text-[14px] text-zinc-400">Personal · story-driven · conversation-first</span>
        </div>
        <span className="text-[14px] text-zinc-400">{wordCount(content)}</span>
      </div>

      {/* Post body */}
      <div className="px-5 pb-6 cursor-pointer" onClick={onFocus}>
        <p className="text-[17px] leading-[1.75] text-zinc-800 whitespace-pre-wrap">
          {displayContent}
          {needsTruncation && !expanded && (
            <>
              {'… '}
              <button
                className="text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
                onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
              >
                see more
              </button>
            </>
          )}
        </p>
      </div>

      {/* Intelligence layer */}
      <div className="border-t border-zinc-100">
        <button
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-zinc-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowInsights(v => !v) }}
        >
          <span className="text-[14px] text-zinc-400">Why this may perform well</span>
          <span className="text-[14px] text-zinc-300">{showInsights ? '▴' : '▾'}</span>
        </button>

        {showInsights && (
          <div className="px-5 pb-5 space-y-4 border-t border-zinc-50">
            {intelligence.narrative_style && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Narrative structure</p>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.narrative_style}</p>
              </div>
            )}
            {intelligence.emotional_style && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Emotional register</p>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.emotional_style}</p>
              </div>
            )}
            {intelligence.spreadability_patterns.length > 0 && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Engagement mechanics</p>
                <div className="space-y-1">
                  {intelligence.spreadability_patterns.slice(0, 3).map((p, i) => (
                    <p key={i} className="text-[14px] text-zinc-500 leading-relaxed">· {p}</p>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Audience</p>
              <p className="text-[14px] text-zinc-400 leading-relaxed">{truncateAtWord(intelligence.audience, 80)}</p>
            </div>
            {intelligence.platform_risks?.facebook && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Adaptation note</p>
                <p className="text-[14px] text-zinc-400 leading-relaxed">{intelligence.platform_risks.facebook}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-zinc-100 px-5 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="text-[14px] font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleCopy() }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <span className="text-zinc-200 text-sm select-none">·</span>
          <button
            className="text-[14px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); onFocus() }}
          >
            Edit
          </button>
          <span className="text-zinc-200 text-sm select-none">·</span>
          <button
            className="text-[14px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); onRegenerate() }}
          >
            Regenerate
          </button>
          <span className="text-zinc-200 text-sm select-none">·</span>
          <button
            className="text-[14px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); setShowVariants(v => !v) }}
          >
            Rewrite as {showVariants ? '▴' : '▾'}
          </button>
        </div>

        {showVariants && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-50">
            {REWRITE_VARIANTS.map(v => (
              <button
                key={v.label}
                onClick={(e) => { e.stopPropagation(); setShowVariants(false); onRegenerate(v.note) }}
                className="text-[14px] font-medium text-zinc-500 border border-zinc-200 rounded-full px-2.5 py-1 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/syndicate/FacebookCard.tsx"
git commit -m "feat(syndication): add FacebookCard component with 6 rewrite variants"
```

---

### Task 6: Wire Facebook into PlatformGrid

**Files:**
- Modify: `app/(dashboard)/syndicate/PlatformGrid.tsx`

- [ ] **Step 1: Add FacebookCard import, skeleton entry, and card renderer**

Replace the contents of `app/(dashboard)/syndicate/PlatformGrid.tsx` with:

```typescript
'use client'

import type { Platform, SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS, PLATFORM_DESCRIPTORS } from '@/lib/syndication/types/intelligence'
import XCard from './XCard'
import LinkedInCard from './LinkedInCard'
import SubstackCard from './SubstackCard'
import BlogCard from './BlogCard'
import ThreadsCard from './ThreadsCard'
import FacebookCard from './FacebookCard'

export type CardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; content: string }
  | { status: 'error'; message: string }

interface PlatformGridProps {
  platforms: Platform[]
  cards: Partial<Record<Platform, CardState>>
  intelligence: SyndicationIntelligence | null
  onFocus: (platform: Platform, content: string) => void
  onCopy: (text: string) => void
  onRegenerate: (platform: Platform, variantNote?: string) => void
}

const SKELETON_BARS: Record<Platform, number> = {
  x: 4,
  linkedin: 6,
  substack: 10,
  blog: 8,
  threads: 4,
  facebook: 6,
}

const FULL_WIDTH_PLATFORMS: Platform[] = ['x', 'linkedin', 'threads', 'facebook']

export default function PlatformGrid({
  platforms,
  cards,
  intelligence,
  onFocus,
  onCopy,
  onRegenerate,
}: PlatformGridProps) {

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {platforms.map((platform) => {
        const card = cards[platform] ?? { status: 'idle' as const }

        if (card.status === 'idle') return null

        if (card.status === 'loading') {
          const n = SKELETON_BARS[platform]
          return (
            <div key={platform} className={FULL_WIDTH_PLATFORMS.includes(platform) ? 'col-span-full' : ''}>
              <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold uppercase text-zinc-900">{PLATFORM_LABELS[platform]}</span>
                  </div>
                  <span className="text-sm text-zinc-400 animate-pulse">Generating new version…</span>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: n }).map((_, i) => (
                    <div
                      key={i}
                      className="h-3 rounded bg-zinc-100 animate-pulse"
                      style={{ width: i === n - 1 ? '60%' : i % 3 === 1 ? '85%' : '100%' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        }

        if (card.status === 'error') {
          return (
            <div key={platform} className="rounded-lg border border-zinc-200 p-4 space-y-2">
              <p className="text-sm text-red-500">{card.message}</p>
              <button
                onClick={() => onRegenerate(platform)}
                className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Try again
              </button>
            </div>
          )
        }

        // done
        if (intelligence !== null) {
          const sharedProps = {
            content: card.content,
            intelligence,
            onFocus: () => onFocus(platform, card.content),
            onCopy: () => onCopy(card.content),
            onRegenerate: (variantNote?: string) => onRegenerate(platform, variantNote),
          }
          if (platform === 'x') return <div key={platform} className="col-span-full"><XCard {...sharedProps} /></div>
          if (platform === 'linkedin') return <div key={platform} className="col-span-full"><LinkedInCard {...sharedProps} /></div>
          if (platform === 'threads') return <div key={platform} className="col-span-full"><ThreadsCard {...sharedProps} /></div>
          if (platform === 'facebook') return <div key={platform} className="col-span-full"><FacebookCard {...sharedProps} /></div>
          if (platform === 'substack') return <SubstackCard key={platform} {...sharedProps} />
          if (platform === 'blog') return <BlogCard key={platform} {...sharedProps} />
        }

        // done but no intelligence — simple fallback
        return (
          <div
            key={platform}
            className="rounded-lg border border-zinc-200 p-4 space-y-3 flex flex-col cursor-pointer hover:border-zinc-400 transition-colors"
            onClick={() => onFocus(platform, card.content)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold uppercase text-zinc-900">
                {PLATFORM_LABELS[platform]}
              </span>
              <span className="text-sm text-zinc-400">{PLATFORM_DESCRIPTORS[platform]}</span>
            </div>

            <p
              className="text-sm text-zinc-600 leading-relaxed"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {card.content}
            </p>

            <div className="flex gap-2 flex-wrap pt-1">
              <button
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onCopy(card.content) }}
              >
                Copy
              </button>
              <button
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onFocus(platform, card.content) }}
              >
                Edit
              </button>
              <button
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onRegenerate(platform) }}
              >
                Regenerate
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/syndicate/PlatformGrid.tsx"
git commit -m "feat(syndication): wire FacebookCard into PlatformGrid"
```

---

### Task 7: Add Facebook to the SyndicationClient

**Files:**
- Modify: `app/(dashboard)/syndicate/SyndicationClient.tsx`

- [ ] **Step 1: Add facebook to ALL_PLATFORMS and default selection**

In `app/(dashboard)/syndicate/SyndicationClient.tsx`, make exactly two edits:

**Line 14** — change:
```typescript
const ALL_PLATFORMS: Platform[] = ['x', 'linkedin', 'threads', 'substack', 'blog']
```
to:
```typescript
const ALL_PLATFORMS: Platform[] = ['x', 'linkedin', 'threads', 'substack', 'blog', 'facebook']
```

**Line 30** — change:
```typescript
const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['x', 'linkedin', 'threads', 'substack', 'blog'])
```
to:
```typescript
const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['x', 'linkedin', 'threads', 'substack', 'blog', 'facebook'])
```

- [ ] **Step 2: Final type-check — must be clean**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors. This is the final gate before manual testing.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/syndicate/SyndicationClient.tsx"
git commit -m "feat(syndication): add Facebook to platform selector and default selection"
```

---

### Task 8: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npm run dev
```

Open `http://localhost:3000/syndicate`.

- [ ] **Step 2: Check the platform toggle**

Verify: Facebook appears in the platform selector. It should be toggled on by default alongside the other 5 platforms.

- [ ] **Step 3: Run a generation**

Paste any article URL and click Generate. Watch for:
- Facebook skeleton card (6 loading bars) appears while generating
- Generated content renders in the FacebookCard component
- Card is full-width (not half-width like Substack/Blog)
- Word count appears in the header (e.g., "247 words")
- Content is 150–300 words, personal/narrative voice, no hashtags, ends with a question

- [ ] **Step 4: Verify "See more" truncation**

If generated content exceeds 250 characters, it should be truncated with a "see more" button. Clicking "see more" expands the full post.

- [ ] **Step 5: Verify intelligence section**

Click "Why this may perform well" — it should expand and show:
- Narrative structure
- Emotional register
- Engagement mechanics
- Audience
- Adaptation note (if `platform_risks.facebook` is populated)

- [ ] **Step 6: Test variant controls**

Click "Rewrite as ▾" and verify all 6 variants appear:
- More personal
- More Page-ready
- Shorter / punchier
- Add engagement question
- More conversational
- More emotional

Click "More Page-ready" — it should regenerate a shorter, more brand-appropriate post.

- [ ] **Step 7: Verify no regressions**

Check that the other 5 platform cards (X, LinkedIn, Threads, Substack, Blog) still render and function correctly.
