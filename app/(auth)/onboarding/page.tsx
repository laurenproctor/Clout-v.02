'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6
type PageState = 'form' | 'generating' | 'results'

interface FormData {
  workspaceName: string
  displayName: string
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

const CHANNEL_OPTIONS = [
  'LinkedIn',
  'X / Twitter',
  'Newsletter',
  'Blog',
  'Instagram',
  'YouTube',
  'Internal comms',
  'Substack',
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
    displayName: '',
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
    step === 2 ? form.displayName.trim().length > 0 :
    step === 3 ? form.purpose.length > 0 :
    true // steps 4-6 can advance without required fields

  // ─── Step submission ─────────────────────────────────────────────────────────

  function stepPayload(s: Step): { stepName: string; data: Record<string, unknown> } | null {
    if (s === 1) return { stepName: 'workspace', data: { name: form.workspaceName } }
    if (s === 2) return { stepName: 'identity', data: { display_name: form.displayName, role: form.role, industry: form.industry, expertise: form.expertise } }
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
      console.warn(`Onboarding step ${stepName}:`, d.error)
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

  const summaryBrief = (() => {
    const parts: string[] = []
    if (form.purpose) parts.push(`Building ${form.purpose.toLowerCase()}`)
    if (form.role) parts.push(`as ${form.role}`)
    if (form.channels.length > 0) parts.push(`publishing on ${form.channels.slice(0, 2).join(' & ')}`)
    if (form.audienceTargets.length > 0) parts.push(`reaching ${form.audienceTargets.slice(0, 2).join(', ')}`)
    if (form.audiencePerception.length > 0) parts.push(`known as ${form.audiencePerception[0]}`)
    if (parts.length === 0) return 'Complete each step to see your tailored strategy.'
    return parts.join(' · ') + '.'
  })()

  const summaryTags = [
    form.purpose && { label: form.purpose, filled: true },
    form.role && { label: form.role, filled: true },
    form.channels[0] && { label: form.channels[0], filled: true },
    form.audienceTargets[0] && { label: form.audienceTargets[0], filled: true },
    !form.purpose && { label: 'Purpose ···', filled: false },
    !form.channels[0] && { label: 'Channels ···', filled: false },
    !form.audienceTargets[0] && { label: 'Audience ···', filled: false },
  ].filter(Boolean) as Array<{ label: string; filled: boolean }>

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
            {form.displayName ? `Here's your start, ${form.displayName.split(' ')[0]}.` : "Here's your start."}
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
    <div className="flex w-full max-w-3xl gap-0 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">

      {/* LEFT: Form panel */}
      <div className="flex flex-1 flex-col p-8 min-w-0">

        {/* Logo + time expectation */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-zinc-900 mb-1">Clout</p>
          <p className="text-xs text-zinc-400">Takes about 2 minutes</p>
        </div>

        {/* Progress */}
        <div className="mb-7 space-y-1.5">
          <div className="flex gap-1">
            {([1, 2, 3, 4, 5, 6] as Step[]).map((s) => (
              <div
                key={s}
                className={cn(
                  'h-0.5 flex-1 rounded-full transition-colors',
                  s <= step ? 'bg-zinc-900' : 'bg-zinc-200'
                )}
              />
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
                reassurance="You can rename it anytime in Settings → Profile."
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
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Name</label>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  placeholder="James Dean"
                  value={form.displayName}
                  onChange={(e) => set('displayName', e.target.value)}
                />
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
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((ch) => (
                  <ChipButton
                    key={ch}
                    label={ch}
                    selected={form.channels.includes(ch)}
                    onClick={() => toggleArray('channels', ch)}
                  />
                ))}
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
                </div>
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
                </div>
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

      {/* RIGHT: Summary panel (hidden on mobile) */}
      <div className="hidden md:flex w-64 shrink-0 flex-col bg-zinc-900 p-7 gap-0">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-4">Your Clout profile</p>

        {/* Profile card */}
        <div className="rounded-lg bg-zinc-800 p-4 mb-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-zinc-100">
            {form.displayName ? form.displayName.charAt(0).toUpperCase() : form.workspaceName.charAt(0).toUpperCase() || 'C'}
          </div>
          <p className="text-sm font-semibold text-white leading-tight">
            {form.workspaceName || 'Your workspace'}
          </p>
          {form.role && (
            <p className="mt-0.5 text-xs text-zinc-500">{form.role}{form.industry ? ` · ${form.industry}` : ''}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summaryTags.slice(0, 5).map((t) => (
              <span
                key={t.label}
                className={cn(
                  'rounded px-1.5 py-0.5 text-xs font-medium',
                  t.filled
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'border border-dashed border-zinc-700 text-zinc-600'
                )}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mb-4 h-px bg-zinc-800" />

        {/* Strategy brief */}
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2">Strategy brief</p>
        <p className="text-xs text-zinc-500 leading-relaxed italic">{summaryBrief}</p>

        <div className="mt-auto pt-4 text-center text-xs text-zinc-700">Builds as you answer ↑</div>
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
