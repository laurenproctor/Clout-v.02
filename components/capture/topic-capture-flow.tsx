'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import type { Lens, ResearchSource } from '@/types/domain'
import { GeneratingAsBar } from '@/components/shared/generating-as-bar'
import { AngleOptions } from '@/components/capture/angle-options'

const MICROSTATES = [
  'Researching sources…',
  'Finding key signals…',
  'Shaping your perspective…',
  'Writing draft…',
]

const EXAMPLE_TOPICS = [
  'Write about why open offices are declining',
  'Contrarian take on AI replacing managers',
  'Founder lesson from hiring too quickly',
  'Why most company values are useless',
]

type FlowState = 'idle' | 'researching' | 'drafting' | 'angles_ready' | 'draft_ready' | 'error'

interface TopicCaptureFlowProps {
  lenses: Lens[]
  selectedLensId: string
  onLensChange: (id: string) => void
  profileName: string | null
  onComplete: (outputId: string) => void
  onError: (msg: string) => void
}

export function TopicCaptureFlow({
  lenses,
  selectedLensId,
  onLensChange,
  profileName,
  onComplete,
  onError,
}: TopicCaptureFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [topic, setTopic] = useState('')
  const [microstateIdx, setMicrostateIdx] = useState(0)
  const [microfade, setMicrofade] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sources, setSources] = useState<ResearchSource[]>([])
  const [researchFailed, setResearchFailed] = useState(false)
  const [draftLines, setDraftLines] = useState<string[]>([])
  const [showSources, setShowSources] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [outputId, setOutputId] = useState<string | null>(null)
  const [captureId, setCaptureId] = useState<string | null>(null)
  const [angles, setAngles] = useState<import('@/types/domain').Angle[]>([])
  const [bestAngleGenerating, setBestAngleGenerating] = useState(false)
  const [draftAllGenerating, setDraftAllGenerating] = useState(false)
  const bestOutputIdRef = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function advanceMicrostate(idx: number) {
    setMicrofade(true)
    setTimeout(() => {
      setMicrostateIdx(idx)
      setProgress(Math.round((idx / (MICROSTATES.length - 1)) * 100))
      setMicrofade(false)
    }, 150)
  }

  async function handleSubmit() {
    const trimmed = topic.trim()
    if (!trimmed) return

    setFlowState('researching')
    setMicrostateIdx(0)
    setProgress(0)
    setSources([])
    setResearchFailed(false)

    try {
      // Step 1: Create capture
      const captureRes = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'topic', raw_content: trimmed }),
      })
      if (!captureRes.ok) throw new Error('Failed to save topic')
      const capture = await captureRes.json()
      const captureId: string = capture.id
      setCaptureId(captureId)

      // Step 2: Research
      advanceMicrostate(1)
      const researchRes = await fetch(`/api/capture/${captureId}/research`, {
        method: 'POST',
      })
      if (researchRes.ok) {
        const researchData = await researchRes.json()
        setSources(researchData.sources ?? [])
        if (researchData.research_failed) setResearchFailed(true)
      } else {
        setResearchFailed(true)
      }

      // Step 3: Extract angles (non-blocking — fallback to direct generate on failure)
      advanceMicrostate(2)
      let extractedAngles: import('@/types/domain').Angle[] = []
      try {
        const aRes = await fetch(`/api/capture/${captureId}/extract-angles`, { method: 'POST' })
        if (aRes.ok) {
          const aData = await aRes.json()
          extractedAngles = aData.angles ?? []
        }
      } catch {
        // extraction failed — proceed without angles
      }

      if (extractedAngles.length >= 2) {
        setAngles(extractedAngles)
        setFlowState('angles_ready')
        // Start background generation for best angle immediately
        const groupId = crypto.randomUUID()
        setBestAngleGenerating(true)
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capture_id: captureId,
            lens_id: selectedLensId,
            angle_id: extractedAngles[0].id,
            generation_group_id: groupId,
          }),
        })
          .then(r => r.ok ? r.json() : Promise.reject(r.status))
          .then(gen => { bestOutputIdRef.current = gen.output_id ?? null })
          .catch(() => { bestOutputIdRef.current = null })
          .finally(() => setBestAngleGenerating(false))
        return
      }

      // No strong angles — generate directly
      setFlowState('drafting')
      advanceMicrostate(3)
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: captureId, lens_id: selectedLensId }),
      })
      if (!genRes.ok) throw new Error('Generation failed')
      const genData = await genRes.json()

      const body =
        typeof genData.raw_content === 'string'
          ? genData.raw_content
          : (genData.content as Record<string, unknown>)?.body as string ?? ''

      setDraftLines(body.split('\n\n').filter(Boolean))
      setOutputId(genData.output_id)
      setProgress(100)
      setFlowState('draft_ready')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setErrorMsg(msg)
      setFlowState('error')
      onError(msg)
    }
  }

  async function handleDraftBest() {
    if (bestOutputIdRef.current) {
      onComplete(bestOutputIdRef.current)
      return
    }
    const maxWait = 30000
    const start = Date.now()
    while (Date.now() - start < maxWait) {
      if (bestOutputIdRef.current) { onComplete(bestOutputIdRef.current); return }
      await new Promise(r => setTimeout(r, 400))
    }
    setErrorMsg('Draft timed out. Please try again.')
    setFlowState('error')
  }

  async function handleDraftOne(angle: import('@/types/domain').Angle) {
    const captId = captureId
    if (!captId) return
    const groupId = crypto.randomUUID()
    try {
      const gRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capture_id: captId,
          lens_id: selectedLensId,
          angle_id: angle.id,
          generation_group_id: groupId,
        }),
      })
      if (!gRes.ok) throw new Error('Generation failed')
      const gen = await gRes.json()
      if (gen.output_id) onComplete(gen.output_id)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed')
      setFlowState('error')
    }
  }

  async function handleDraftAll() {
    const captId = captureId
    if (!captId || angles.length < 2) return
    setDraftAllGenerating(true)
    const groupId = crypto.randomUUID()
    const cap = Math.min(angles.length, 4)
    const results = await Promise.allSettled(
      angles.slice(0, cap).map(angle =>
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capture_id: captId,
            lens_id: selectedLensId,
            angle_id: angle.id,
            generation_group_id: groupId,
          }),
        }).then(r => r.ok ? r.json() : Promise.reject(r.status))
      )
    )
    const first = results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<{ output_id: string }> | undefined
    setDraftAllGenerating(false)
    if (first?.value?.output_id) onComplete(first.value.output_id)
  }

  function handleSkipAngles() {
    if (bestOutputIdRef.current) {
      onComplete(bestOutputIdRef.current)
    } else {
      setFlowState('draft_ready')
    }
  }

  function handleRetry() {
    setFlowState('idle')
    setProgress(0)
    setMicrostateIdx(0)
    setDraftLines([])
    setErrorMsg('')
    setResearchFailed(false)
    setSources([])
    setAngles([])
    setBestAngleGenerating(false)
    setDraftAllGenerating(false)
    bestOutputIdRef.current = null
  }

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (flowState === 'idle') {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[15px] font-semibold text-zinc-900">Start with a topic</p>
          <p className="text-[13px] text-zinc-400 mt-1">
            Clout will research it and draft a post in your voice.
          </p>
        </div>

        <textarea
          ref={textareaRef}
          autoFocus
          className="w-full resize-none bg-transparent text-[17px] leading-[1.75] text-zinc-900 placeholder:text-zinc-300 focus:outline-none min-h-[110px]"
          placeholder={EXAMPLE_TOPICS[0]}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />

        {/* Example chips */}
        {!topic && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_TOPICS.slice(1).map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setTopic(ex)
                  textareaRef.current?.focus()
                }}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[12px] font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {lenses.length > 0 && (
          <GeneratingAsBar
            profileName={profileName}
            lenses={lenses}
            selectedLensId={selectedLensId}
            onLensChange={onLensChange}
          />
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!topic.trim()}
          className={cn(
            'self-start flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
            topic.trim()
              ? 'bg-zinc-900 text-white hover:bg-zinc-700'
              : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
          )}
        >
          Research &amp; Draft →
        </button>
      </div>
    )
  }

  // ── RESEARCHING / DRAFTING ────────────────────────────────────────────────
  if (flowState === 'researching' || flowState === 'drafting') {
    return (
      <div className="flex flex-col gap-4 py-2">
        {/* Topic echo */}
        <p className="text-[13px] text-zinc-400 leading-snug line-clamp-2 italic">&ldquo;{topic}&rdquo;</p>

        {/* Progress bar */}
        <div className="h-[3px] rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full bg-zinc-900 rounded-full transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Microstate label */}
        <p
          className={cn(
            'text-[14px] font-medium text-zinc-900 min-h-[22px] transition-opacity duration-150',
            microfade && 'opacity-0'
          )}
        >
          {MICROSTATES[microstateIdx]}
        </p>

        {/* Sources preview (fade in once we have them) */}
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sources.slice(0, 3).map((s) => (
              <span
                key={s.url}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500 max-w-[180px] truncate"
              >
                {hostname(s.url)}
              </span>
            ))}
          </div>
        )}

        {researchFailed && (
          <p className="text-[12px] text-zinc-400">
            Research unavailable right now. Drafting from your topic only.
          </p>
        )}

        <Spinner size="md" className="self-start" label="Drafting" />
      </div>
    )
  }

  // ── ANGLES READY ──────────────────────────────────────────────────────────
  if (flowState === 'angles_ready') {
    return (
      <div className="flex flex-col gap-4 py-2">
        <AngleOptions
          angles={angles}
          bestAngleGenerating={bestAngleGenerating}
          draftAllGenerating={draftAllGenerating}
          onDraftBest={handleDraftBest}
          onDraftOne={handleDraftOne}
          onDraftAll={handleDraftAll}
          onSkip={handleSkipAngles}
        />
      </div>
    )
  }

  // ── DRAFT READY ───────────────────────────────────────────────────────────
  if (flowState === 'draft_ready') {
    return (
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-[12px] font-medium text-green-700 self-start">
          <span>✓</span> Draft ready
        </div>

        <div>
          <p className="text-[12px] font-semibold text-zinc-400 tracking-wide mb-2">
            Here&apos;s your first draft.
          </p>
          {lenses.length > 0 && (
            <GeneratingAsBar
              profileName={profileName}
              lenses={lenses}
              selectedLensId={selectedLensId}
              onLensChange={onLensChange}
              readOnly
            />
          )}
        </div>

        <div className="text-[16px] leading-[1.75] text-zinc-900 space-y-3">
          {draftLines.map((line, i) => (
            <p key={i} className={i === draftLines.length - 1 ? 'font-semibold' : ''}>
              {line}
            </p>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => outputId && onComplete(outputId)}
            className="bg-zinc-900 text-white rounded-[10px] px-4 py-2.5 text-[13px] font-semibold hover:bg-zinc-700 transition-colors"
          >
            Open in Studio →
          </button>
          <button
            type="button"
            onClick={handleRetry}
            className="text-zinc-500 text-[13px] font-medium px-2 py-2.5 hover:text-zinc-900 transition-colors"
          >
            ↻ Try another topic
          </button>
        </div>

        {/* Sources chip */}
        {sources.length > 0 && (
          <div className="border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={() => setShowSources((v) => !v)}
              className="text-[12px] text-zinc-400 flex items-center gap-1.5 hover:text-zinc-600 transition-colors"
            >
              Sources ({sources.length}) {showSources ? '↑' : '↓'}
            </button>
            {showSources && (
              <div className="mt-3 space-y-2">
                {sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 group"
                  >
                    <span className="text-[12px] text-zinc-500 group-hover:text-zinc-900 transition-colors leading-snug">
                      {s.title || hostname(s.url)}
                    </span>
                    <span className="text-[11px] text-zinc-400 shrink-0 mt-px">
                      {hostname(s.url)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-[14px] text-red-600">{errorMsg || 'Something went wrong.'}</p>
      <button
        type="button"
        onClick={handleRetry}
        className="self-start rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
