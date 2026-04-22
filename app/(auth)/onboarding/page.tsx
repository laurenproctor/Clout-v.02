'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6
type PageState = 'form' | 'generating' | 'results'

interface FormData {
  workspaceName: string
  firstName: string
  lastName: string
  role: string
  industry: string
  expertise: string
  purpose: string
  coreBelief: string
  energizedBy: string
  misconceptions: string
  lessons: string
  channels: string[]
  audienceTargets: string[]
  audiencePerception: string[]
}

interface GenerationResult {
  positioning: string
  postIdeas: Array<{ hook: string; channel: string }>
  draftPost: string
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Workspace',
  2: 'Identity',
  3: 'Purpose',
  4: 'Beliefs',
  5: 'Channels',
  6: 'Audience',
}

const PURPOSE_OPTIONS = [
  'Personal brand',
  'Company',
  'Career growth',
  'Thought leadership',
  'Something new',
]

const CHANNEL_GROUPS: Array<{ label: string; options: string[] }> = [
  { label: 'Social', options: ['LinkedIn', 'X / Twitter', 'Instagram', 'YouTube'] },
  { label: 'Written', options: ['Newsletter', 'Blog', 'Substack'] },
  { label: 'Internal', options: ['Internal comms'] },
]

const BELIEF_EXAMPLES = [
  'Most brands underestimate the staying power of physical retail.',
  'Cold outreach still works — most people just do it wrong.',
  'The best leaders I\'ve met read more than they talk.',
  'Speed beats perfection in early-stage companies.',
  'Culture is the product. Everything else is a feature.',
]

const ENERGIZED_EXAMPLES = [
  'Consumer psychology, behavior change, retail design',
  'Systems thinking, team dynamics, first principles',
  'Product strategy, growth loops, distribution',
  'Storytelling, brand positioning, founder narratives',
]

const MISCONCEPTION_EXAMPLES = [
  'That e-commerce has killed brick-and-mortar.',
  'That AI will replace human creativity.',
  'That you need a big audience to build influence.',
  'That hustle culture is the only path to success.',
]

const LESSON_EXAMPLES = [
  'Invest in fundamentals before chasing trends.',
  'The best salespeople don\'t pitch — they listen.',
  'Clarity beats cleverness every time.',
  'Your network is your leverage. Protect it.',
]

const AUDIENCE_WHO_OPTIONS = [
  'Executives',
  'Founders',
  'Recruiters',
  'Customers',
  'Creatives',
  'Investors',
  'Industry peers',
]

const AUDIENCE_PERCEPTION_OPTIONS = [
  'Expert',
  'Trusted',
  'Bold thinker',
  'Helpful',
  'Operator',
  'Creator',
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [pageState, setPageState] = useState<PageState>('form')
  const [beliefsExpanded, setBeliefsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [editedDraft, setEditedDraft] = useState('')
  const [generatingLabel, setGeneratingLabel] = useState('Building your strategy…')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const [form, setForm] = useState<FormData>({
    workspaceName: '',
    firstName: '',
    lastName: '',
    role: '',
    industry: '',
    expertise: '',
    purpose: '',
    coreBelief: '',
    energizedBy: '',
    misconceptions: '',
    lessons: '',
    channels: [],
    audienceTargets: [],
    audiencePerception: [],
  })

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  const toggleArray = useCallback((key: 'channels' | 'audienceTargets' | 'audiencePerception', value: string) => {
    setForm((f) => {
      const arr = f[key] as string[]
      return {
        ...f,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }, [])

  // ─── Validation ─────────────────────────────────────────────────────────────

  const canAdvance =
    step === 1 ? form.workspaceName.trim().length > 0 :
    step === 2 ? form.firstName.trim().length > 0 :
    step === 3 ? form.purpose.length > 0 :
    true // steps 4-6 can advance without required fields

  // ─── Step submission ─────────────────────────────────────────────────────────

  function stepPayload(s: Step): { stepName: string; data: Record<string, unknown> } | null {
    if (s === 1) return { stepName: 'workspace', data: { name: form.workspaceName } }
    if (s === 2) return { stepName: 'identity', data: { first_name: form.firstName.trim(), last_name: form.lastName.trim(), display_name: [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' '), role: form.role, industry: form.industry, expertise: form.expertise } }
    if (s === 3) return { stepName: 'purpose', data: { purpose: form.purpose } }
    if (s === 4) return { stepName: 'beliefs', data: { profile_insights: { core_belief: form.coreBelief, energized_by: form.energizedBy, misconceptions: form.misconceptions, lessons: form.lessons } } }
    if (s === 5) return { stepName: 'channels', data: { channels: form.channels } }
    if (s === 6) return { stepName: 'audience', data: { audience_targets: form.audienceTargets, audience_perception: form.audiencePerception } }
    return null
  }

  async function postStep(stepName: string, data: Record<string, unknown>) {
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: stepName, data }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error ?? `Failed to save step ${stepName}`)
    }
  }

  async function next() {
    setLoading(true)
    setError(null)

    try {
      const payload = stepPayload(step)
      if (payload) await postStep(payload.stepName, payload.data)

      if (step === 6) {
        await runGeneration()
      } else {
        setStep((s) => (s + 1) as Step)
      }
    } catch {
      setError('Something went wrong. You can skip this step.')
    } finally {
      setLoading(false)
    }
  }

  async function skip() {
    setLoading(true)
    try {
      const payload = stepPayload(step)
      if (payload) await postStep(payload.stepName, payload.data)
    } catch { /* non-fatal */ }
    setLoading(false)
    router.push('/dashboard')
  }

  async function runGeneration() {
    setPageState('generating')

    // Cycle loading labels
    const labels = [
      'Building your strategy…',
      'Writing your first posts…',
      'Preparing your positioning…',
    ]
    let i = 0
    intervalRef.current = setInterval(() => {
      i = (i + 1) % labels.length
      setGeneratingLabel(labels[i])
    }, 2000)

    // 10s timeout fallback
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      router.push('/dashboard')
    }, 10000)

    try {
      const res = await fetch('/api/onboarding/generate', { method: 'POST' })
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      if (res.ok) {
        const data = await res.json()
        setGenerationResult(data)
        setEditedDraft(data.draftPost ?? '')
        setPageState('results')
      } else {
        router.push('/dashboard')
      }
    } catch {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      router.push('/dashboard')
    }
  }

  // ─── Summary panel helpers ───────────────────────────────────────────────────

  const briefObjective = (() => {
    if (!form.purpose && !form.role) return null
    const who = form.firstName || form.workspaceName || 'The client'
    const role = form.role ? `${form.role}${form.industry ? ` in ${form.industry}` : ''}` : form.industry || null
    const purpose = form.purpose ? form.purpose.toLowerCase() : 'thought leadership'
    if (role) return `${who} is a ${role} building influence for ${purpose}.`
    return `${who} is building influence for ${purpose}.`
  })()

  const briefPositioning = (() => {
    if (!form.expertise && !form.coreBelief) return null
    const lines: string[] = []
    if (form.expertise) lines.push(form.expertise)
    if (form.coreBelief) lines.push(`Core conviction: "${form.coreBelief.replace(/^"/, '').replace(/"$/, '')}"`)
    return lines.join(' ')
  })()

  const briefThemes = (() => {
    const themes: string[] = []
    if (form.energizedBy) themes.push(...form.energizedBy.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3))
    if (form.misconceptions) themes.push(`Challenging: ${form.misconceptions.split(/[.!?]/)[0].replace(/^That\s/i, '').trim()}`)
    if (form.lessons) themes.push(form.lessons.split(/[.!?]/)[0].trim())
    return themes.slice(0, 4)
  })()

  const briefDistribution = (() => {
    if (!form.channels.length) return null
    const primary = form.channels.slice(0, 2)
    const rest = form.channels.length > 2 ? `+${form.channels.length - 2} more` : null
    return { primary, rest }
  })()

  const briefAudience = (() => {
    if (!form.audienceTargets.length && !form.audiencePerception.length) return null
    const who = form.audienceTargets.slice(0, 3).join(', ')
    const perception = form.audiencePerception.slice(0, 2).join(' & ')
    if (who && perception) return `Reaching ${who} — positioning as ${perception}.`
    if (who) return `Reaching ${who}.`
    return `Positioning as ${perception}.`
  })()

  // ─── Render: Generating ──────────────────────────────────────────────────────

  if (pageState === 'generating') {
    return (
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="h-1 w-full bg-zinc-200 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-900 rounded-full w-full" />
        </div>
        <div>
          <p className="text-base font-medium text-zinc-900">{generatingLabel}</p>
          <p className="mt-1 text-sm text-zinc-400">This takes about 10 seconds.</p>
        </div>
      </div>
    )
  }

  // ─── Render: Results ─────────────────────────────────────────────────────────

  if (pageState === 'results' && generationResult) {
    return (
      <div className="w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {form.firstName ? `Here's your start, ${form.firstName}.` : "Here's your start."}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Clout built this from your profile. Edit anything before you go.</p>
        </div>

        {/* Positioning */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Your positioning</p>
          <p className="text-sm text-zinc-900 leading-relaxed">{generationResult.positioning}</p>
        </div>

        {/* Post ideas */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Post ideas to get you started</p>
          <div className="space-y-3">
            {generationResult.postIdeas.slice(0, 3).map((idea, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-500">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm text-zinc-900">{idea.hook}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{idea.channel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Draft post */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Your first draft — ready to edit</p>
          <textarea
            className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            rows={10}
            value={editedDraft}
            onChange={(e) => setEditedDraft(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Skip, take me to the dashboard
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Enter dashboard →
          </button>
        </div>
      </div>
    )
  }

  // ─── Render: Form (6 steps) ──────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 flex overflow-hidden">

      {/* LEFT: Form panel */}
      <div className="flex flex-1 flex-col p-12 min-w-0 overflow-y-auto bg-white">

        {/* Logo + time expectation */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-zinc-900 mb-1">Clout</p>
          <p className="text-xs text-zinc-400">Takes about 2 minutes</p>
        </div>

        {/* Progress — all steps clickable */}
        <div className="mb-7 space-y-1.5">
          <div className="flex gap-1">
            {([1, 2, 3, 4, 5, 6] as Step[]).map((s) => (
              <div key={s} className="relative flex-1 group">
                <button
                  onClick={() => setStep(s)}
                  className={cn(
                    'h-0.5 w-full rounded-full transition-colors',
                    s === step ? 'bg-zinc-900' : s < step ? 'bg-zinc-400' : 'bg-zinc-200 group-hover:bg-zinc-400'
                  )}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {STEP_LABELS[s]}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-900">
              {STEP_LABELS[step]}
            </span>
            <span className="text-xs text-zinc-300">{step} / 6</span>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 space-y-5">

          {/* ── Step 1: Workspace ── */}
          {step === 1 && (
            <>
              <StepHeader
                title="Create your workspace"
                subtitle="Your workspace stores your ideas, lenses, drafts, publishing settings, and audience strategy. Use your name for a personal brand, or a company name for a team account."
                why={null}
                reassurance="You can rename it anytime in Settings → Profile. You can create multiple workspaces — one for you, one for a brand, one for a client."
              />
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Workspace name
                </label>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  placeholder="Clout or James Dean"
                  value={form.workspaceName}
                  onChange={(e) => set('workspaceName', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canAdvance && !loading && next()}
                />
              </div>
            </>
          )}

          {/* ── Step 2: Identity ── */}
          {step === 2 && (
            <>
              <StepHeader
                title="Who are you?"
                subtitle="This is the foundation of every piece of content Clout helps you create."
                why="We use this to build sharper positioning."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">First name</label>
                  <input
                    autoFocus
                    className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                    placeholder="James"
                    value={form.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Last name</label>
                  <input
                    className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                    placeholder="Dean"
                    value={form.lastName}
                    onChange={(e) => set('lastName', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Profession / Role</label>
                  <input
                    className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                    placeholder="e.g. Retail Strategist"
                    value={form.role}
                    onChange={(e) => set('role', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Industry</label>
                  <input
                    className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                    placeholder="e.g. Retail, SaaS"
                    value={form.industry}
                    onChange={(e) => set('industry', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">One-line expertise</label>
                <input
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  placeholder="e.g. Helping brands understand shopper behavior"
                  value={form.expertise}
                  onChange={(e) => set('expertise', e.target.value)}
                />
                <p className="mt-1 text-xs text-zinc-400">This becomes the core of your positioning.</p>
              </div>
            </>
          )}

          {/* ── Step 3: Purpose ── */}
          {step === 3 && (
            <>
              <StepHeader
                title="What are you building influence for?"
                subtitle="Choose the direction that best captures your intent."
                why="We use this to shape your content strategy."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div className="space-y-2">
                {PURPOSE_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt}
                    label={opt}
                    selected={form.purpose === opt}
                    onClick={() => set('purpose', opt)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Step 4: Beliefs ── */}
          {step === 4 && (
            <>
              <StepHeader
                title="What do you believe?"
                subtitle="Your philosophy creates content nobody else can write."
                why="We use this to create content nobody else could write."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  What's one belief or perspective you hold strongly?
                </label>
                <textarea
                  autoFocus
                  className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  rows={3}
                  placeholder="e.g. Most brands underestimate the value of physical retail..."
                  value={form.coreBelief}
                  onChange={(e) => set('coreBelief', e.target.value)}
                />
                <ExampleChips label="Examples — click to try one:" examples={BELIEF_EXAMPLES} onSelect={(v) => set('coreBelief', v)} />
              </div>

              {!beliefsExpanded ? (
                <button
                  onClick={() => setBeliefsExpanded(true)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  + Add more context (optional)
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Topics that energize you</label>
                    <textarea
                      className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      rows={2}
                      placeholder="e.g. Consumer psychology, retail design, behavior change..."
                      value={form.energizedBy}
                      onChange={(e) => set('energizedBy', e.target.value)}
                    />
                    <ExampleChips label="Examples:" examples={ENERGIZED_EXAMPLES} onSelect={(v) => set('energizedBy', v)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Misconceptions you challenge</label>
                    <textarea
                      className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      rows={2}
                      placeholder="e.g. That e-commerce has killed brick-and-mortar..."
                      value={form.misconceptions}
                      onChange={(e) => set('misconceptions', e.target.value)}
                    />
                    <ExampleChips label="Examples:" examples={MISCONCEPTION_EXAMPLES} onSelect={(v) => set('misconceptions', v)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Lessons you repeat often</label>
                    <textarea
                      className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      rows={2}
                      placeholder="e.g. Invest in fundamentals over chasing trends..."
                      value={form.lessons}
                      onChange={(e) => set('lessons', e.target.value)}
                    />
                    <ExampleChips label="Examples:" examples={LESSON_EXAMPLES} onSelect={(v) => set('lessons', v)} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Step 5: Channels ── */}
          {step === 5 && (
            <>
              <StepHeader
                title="Where do you publish?"
                subtitle="Select all that apply."
                why="We tailor formats and cadence by platform."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div className="space-y-4">
                {CHANNEL_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((ch) => (
                        <ChipButton
                          key={ch}
                          label={ch}
                          selected={form.channels.includes(ch)}
                          onClick={() => toggleArray('channels', ch)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">Private</p>
                  <ChipButton
                    label="Private Feed"
                    selected={form.channels.includes('Private Feed')}
                    onClick={() => toggleArray('channels', 'Private Feed')}
                  />
                  {form.channels.includes('Private Feed') && (
                    <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                      A personal log only you can see — for raw thoughts, reflections, and ideas not ready to share. An astronaut&rsquo;s mission log, only the mission is life.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Step 6: Audience ── */}
          {step === 6 && (
            <>
              <StepHeader
                title="Who is your audience?"
                subtitle="Knowing who you're speaking to makes everything sharper."
                why="This helps make your content resonate."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Who do you want to reach?</p>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_WHO_OPTIONS.map((opt) => (
                    <ChipButton
                      key={opt}
                      label={opt}
                      selected={form.audienceTargets.includes(opt)}
                      onClick={() => toggleArray('audienceTargets', opt)}
                    />
                  ))}
                  {form.audienceTargets.filter((v) => !AUDIENCE_WHO_OPTIONS.includes(v)).map((opt) => (
                    <ChipButton
                      key={opt}
                      label={opt}
                      selected
                      onClick={() => toggleArray('audienceTargets', opt)}
                    />
                  ))}
                </div>
                <WriteInInput
                  placeholder="Write in your own…"
                  onAdd={(value) => {
                    if (!form.audienceTargets.includes(value)) toggleArray('audienceTargets', value)
                  }}
                />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">What should they think of you?</p>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_PERCEPTION_OPTIONS.map((opt) => (
                    <ChipButton
                      key={opt}
                      label={opt}
                      selected={form.audiencePerception.includes(opt)}
                      onClick={() => toggleArray('audiencePerception', opt)}
                    />
                  ))}
                  {form.audiencePerception.filter((v) => !AUDIENCE_PERCEPTION_OPTIONS.includes(v)).map((opt) => (
                    <ChipButton
                      key={opt}
                      label={opt}
                      selected
                      onClick={() => toggleArray('audiencePerception', opt)}
                    />
                  ))}
                </div>
                <WriteInInput
                  placeholder="Write in your own…"
                  onAdd={(value) => {
                    if (!form.audiencePerception.includes(value)) toggleArray('audiencePerception', value)
                  }}
                />
              </div>
            </>
          )}

        </div>

        {/* Error */}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        {/* Nav */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={loading}
                className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                ← Back
              </button>
            )}
            {step > 1 && (
              <button
                onClick={skip}
                disabled={loading}
                className="text-sm text-zinc-300 hover:text-zinc-500 transition-colors"
              >
                Skip for now →
              </button>
            )}
          </div>
          <button
            onClick={next}
            disabled={!canAdvance || loading}
            className={cn(
              'rounded-md px-5 py-2 text-sm font-medium transition-colors',
              !canAdvance || loading
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 text-white hover:bg-zinc-700'
            )}
          >
            {loading ? 'Saving…' : step === 6 ? 'Build my strategy →' : 'Continue →'}
          </button>
        </div>
      </div>

      {/* RIGHT: Agency brief panel (hidden on mobile) */}
      <div className="hidden md:flex w-2/5 shrink-0 flex-col bg-zinc-900 p-12 overflow-y-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 mb-1">Strategy Brief</p>
          <p className="text-xs text-zinc-700">Builds as you answer. Complete by Step 6.</p>
        </div>

        {/* Client block */}
        <div className="mb-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-2">Client</p>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold text-zinc-100">
              {(form.firstName || form.workspaceName || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {[form.firstName, form.lastName].filter(Boolean).join(' ') || form.workspaceName || <span className="text-zinc-600 italic">Name pending</span>}
              </p>
              {(form.role || form.industry) && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {[form.role, form.industry].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          {briefObjective && (
            <p className="text-xs text-zinc-400 leading-relaxed">{briefObjective}</p>
          )}
        </div>

        <div className="mb-7 h-px bg-zinc-800" />

        {/* Positioning */}
        <div className="mb-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-2">Positioning</p>
          {briefPositioning ? (
            <p className="text-xs text-zinc-300 leading-relaxed">{briefPositioning}</p>
          ) : (
            <p className="text-xs text-zinc-700 italic">Defined in Steps 2 &amp; 4.</p>
          )}
        </div>

        {/* Content themes */}
        {briefThemes.length > 0 && (
          <>
            <div className="mb-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-3">Content Themes</p>
              <div className="space-y-2">
                {briefThemes.map((theme, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                    <p className="text-xs text-zinc-400 leading-relaxed">{theme}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-7 h-px bg-zinc-800" />
          </>
        )}

        {/* Distribution */}
        <div className="mb-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-2">Distribution</p>
          {briefDistribution ? (
            <div className="flex flex-wrap gap-1.5">
              {briefDistribution.primary.map((ch) => (
                <span key={ch} className="rounded bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-200">{ch}</span>
              ))}
              {briefDistribution.rest && (
                <span className="rounded border border-dashed border-zinc-700 px-2 py-0.5 text-xs text-zinc-600">{briefDistribution.rest}</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-700 italic">Selected in Step 5.</p>
          )}
        </div>

        {/* Target audience */}
        <div className="mb-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-2">Target Audience</p>
          {briefAudience ? (
            <p className="text-xs text-zinc-400 leading-relaxed">{briefAudience}</p>
          ) : (
            <p className="text-xs text-zinc-700 italic">Defined in Step 6.</p>
          )}
        </div>

        <div className="mt-auto pt-4">
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-3 text-center">
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Clout Content Strategy</p>
            <p className="mt-0.5 text-xs text-zinc-800">Generated on completion</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Small reusable components ────────────────────────────────────────────────

function StepHeader({
  title,
  subtitle,
  why,
  reassurance,
}: {
  title: string
  subtitle: string
  why: string | null
  reassurance: string
}) {
  return (
    <div className="space-y-1">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      <p className="text-sm text-zinc-500">{subtitle}</p>
      {why && <p className="text-xs text-zinc-400">{why}</p>}
      <p className="text-xs text-zinc-400">{reassurance}</p>
    </div>
  )
}

function RadioCard({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        selected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
      )}
    >
      <div
        className={cn(
          'h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors',
          selected ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
        )}
      />
      <span className={cn('text-sm font-medium', selected ? 'text-zinc-900' : 'text-zinc-600')}>
        {label}
      </span>
    </button>
  )
}

function WriteInInput({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState('')
  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }
  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        className="flex-1 rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
      />
      <button
        onClick={submit}
        className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:border-zinc-400 transition-colors"
      >
        Add
      </button>
    </div>
  )
}

function ChipButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        selected
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
      )}
    >
      {label}
    </button>
  )
}

function ExampleChips({ label, examples, onSelect }: { label?: string; examples: string[]; onSelect: (v: string) => void }) {
  return (
    <div className="mt-2">
      {label && <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onSelect(ex)}
            className="rounded border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-600 transition-colors text-left"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}

