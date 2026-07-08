'use client'

import { useState } from 'react'
import { ArrowRight, Lightbulb, PenLine, ClipboardPaste, Link2, Mic, Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lens, CaptureSource } from '@/types/domain'
import { RecommendedPathPanel } from '@/components/create/RecommendedPathPanel'
import {
  type RecommendationResult,
  type RecommendedFormat,
  type UniversalInputType,
  ANGLE_OPTIONS,
  GOAL_OPTIONS,
  STARTING_POINT_OPTIONS,
} from '@/lib/create/recommendTypes'

const URL_REGEX = /^https?:\/\/[^\s]{4,}$/

const TOPIC_CHIPS = [
  'Contrarian take on AI replacing managers',
  'Founder lesson from hiring too quickly',
  'Why most company values are useless',
]

interface TabDef {
  id: UniversalInputType
  label: string
  icon: typeof Lightbulb
  enabled: boolean
}

const TABS: TabDef[] = [
  { id: 'topic', label: 'Topic', icon: Lightbulb, enabled: true },
  { id: 'write', label: 'Write', icon: PenLine, enabled: true },
  { id: 'paste', label: 'Paste', icon: ClipboardPaste, enabled: true },
  { id: 'link', label: 'Link', icon: Link2, enabled: true },
  { id: 'voice', label: 'Voice', icon: Mic, enabled: false },
  { id: 'upload', label: 'Upload', icon: Upload, enabled: false },
]

const PLACEHOLDERS: Record<UniversalInputType, string> = {
  topic: 'Write about why open offices are declining',
  write: 'Write your draft, notes, or raw thinking here…',
  paste: 'Paste an article, transcript, email, or set of notes…',
  link: 'https://example.com/article-to-riff-on',
  voice: '',
  upload: '',
}

interface UniversalCreateComposerProps {
  workspaceSlug: string
  brandLenses: Lens[]
  defaultTab?: UniversalInputType
  /** Focus/scroll the channel-specific section. Defaults to scrolling #create-for-channel. */
  onChooseChannel?: () => void
}

export function UniversalCreateComposer({
  workspaceSlug,
  brandLenses,
  defaultTab = 'topic',
  onChooseChannel,
}: UniversalCreateComposerProps) {
  const [activeTab, setActiveTab] = useState<UniversalInputType>(defaultTab)
  const [text, setText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [brandLensId, setBrandLensId] = useState('')
  const [angle, setAngle] = useState('')
  const [goal, setGoal] = useState('')
  const [startingPoint, setStartingPoint] = useState<RecommendedFormat | 'auto'>('auto')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null)
  const [captureId, setCaptureId] = useState<string | null>(null)

  const rawInput = activeTab === 'link' ? linkUrl.trim() : text.trim()
  const canSubmit = rawInput.length > 0 && !loading

  function handleChooseChannel() {
    if (onChooseChannel) {
      onChooseChannel()
      return
    }
    document.getElementById('create-for-channel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function captureSourceFor(tab: UniversalInputType, input: string): CaptureSource {
    if (tab === 'topic') return 'topic'
    if (tab === 'link') return 'url'
    if (tab === 'paste' && URL_REGEX.test(input)) return 'url'
    return 'text'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const source = captureSourceFor(activeTab, rawInput)
      const isUrl = source === 'url'

      // 1. Persist the brief as a Capture (through the authenticated API route —
      //    never import the server-only domain fn into this client component).
      const captureRes = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          raw_content: rawInput,
          source_url: isUrl ? rawInput : null,
          is_private: false,
          tags: [],
        }),
      })

      if (!captureRes.ok) {
        const data = await captureRes.json().catch(() => ({}))
        if (data.code === 'CAPTURE_LIMIT_EXCEEDED') {
          setError('You’ve reached your monthly capture limit. Upgrade to keep creating.')
          return
        }
        setError(data.error ?? 'Could not save your idea. Please try again.')
        return
      }
      const capture = await captureRes.json()

      // 2. Ask Clout to recommend the best primary format.
      const recRes = await fetch('/api/create/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: activeTab,
          rawInput,
          brandLensId: brandLensId || null,
          angle: angle || null,
          goal: goal || null,
          startingPoint,
          captureId: capture.id,
        }),
      })

      if (!recRes.ok) {
        const data = await recRes.json().catch(() => ({}))
        setError(data.error ?? 'Could not generate a recommendation. Please try again.')
        return
      }

      const result = (await recRes.json()) as RecommendationResult
      setCaptureId(capture.id)
      setRecommendation(result)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setRecommendation(null)
    setCaptureId(null)
    setError(null)
  }

  if (recommendation) {
    return (
      <RecommendedPathPanel
        workspaceSlug={workspaceSlug}
        captureId={captureId}
        recommendation={recommendation}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="font-[Signifier] text-xl font-semibold text-zinc-900">Start from anything</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Give Clout a topic, link, note, voice memo, file, or draft. Clout will recommend the best
        format and route it into Studio.
      </p>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-1 border-b border-zinc-100 pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              disabled={!tab.enabled}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-zinc-900 text-white'
                  : tab.enabled
                    ? 'text-zinc-600 hover:bg-zinc-100'
                    : 'cursor-not-allowed text-zinc-300'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {!tab.enabled && (
                <span className="ml-0.5 rounded-full bg-zinc-100 px-1.5 py-px text-[10px] font-normal text-zinc-400">
                  Soon
                </span>
              )}
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        {/* Input */}
        {activeTab === 'link' ? (
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={PLACEHOLDERS.link}
            className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          />
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDERS[activeTab]}
            rows={4}
            className="w-full resize-none rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          />
        )}

        {/* Topic suggestion chips */}
        {activeTab === 'topic' && (
          <div className="mt-2 flex flex-wrap gap-2">
            {TOPIC_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setText(chip)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Optional controls */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Control label="Brand lens">
            <select
              value={brandLensId}
              onChange={(e) => setBrandLensId(e.target.value)}
              className={selectClass}
            >
              <option value="">No brand lens</option>
              {brandLenses.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Control>
          <Control label="Angle">
            <select value={angle} onChange={(e) => setAngle(e.target.value)} className={selectClass}>
              <option value="">Any angle</option>
              {ANGLE_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Control>
          <Control label="Goal">
            <select value={goal} onChange={(e) => setGoal(e.target.value)} className={selectClass}>
              <option value="">Any goal</option>
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Control>
          <Control label="Starting point">
            <select
              value={startingPoint}
              onChange={(e) => setStartingPoint(e.target.value as RecommendedFormat | 'auto')}
              className={selectClass}
            >
              {STARTING_POINT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Control>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recommending…
              </>
            ) : (
              <>
                Recommend format
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleChooseChannel}
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Choose a channel instead
          </button>
        </div>
      </form>
    </div>
  )
}

const selectClass =
  'w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none'

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
    </label>
  )
}
