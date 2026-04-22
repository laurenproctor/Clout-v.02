'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const STEPS = [
  'Reading source',
  'Finding angles',
  'Matching your voice',
  'Writing drafts',
]

interface Draft {
  output_id: string
  angle: string
  hook: string
  preview: string
  body?: string
}

interface LinkCaptureFlowProps {
  url: string
  lensId: string
  onComplete: (outputId: string) => void
  onError: (msg: string) => void
  onReset: () => void
}

type FlowState = 'preview' | 'processing' | 'drafts_ready' | 'error'

export function LinkCaptureFlow({ url, lensId, onComplete, onError, onReset }: LinkCaptureFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>('preview')
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set())
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const didProcess = useRef(false)

  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', '') } catch { return url }
  })()

  // Fetch title immediately on mount
  useEffect(() => {
    fetch(`/api/capture/url-meta?url=${encodeURIComponent(url)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.title) setPageTitle(data.title) })
      .catch(() => {})
  }, [url])

  // Advance steps during processing
  useEffect(() => {
    if (flowState !== 'processing') return
    setStepIdx(0)
    stepTimer.current = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1))
    }, 2200)
    return () => { if (stepTimer.current) clearInterval(stepTimer.current) }
  }, [flowState])

  function handleGenerate() {
    if (didProcess.current) return
    didProcess.current = true
    setFlowState('processing')

    fetch('/api/capture/url/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, lens_id: lensId || undefined }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to process URL')
        return data
      })
      .then((data) => {
        if (stepTimer.current) clearInterval(stepTimer.current)
        if (data.page_title && !pageTitle) setPageTitle(data.page_title)
        setDrafts(data.drafts ?? [])
        setStepIdx(STEPS.length - 1)
        setTimeout(() => setFlowState('drafts_ready'), 400)
      })
      .catch((err) => {
        if (stepTimer.current) clearInterval(stepTimer.current)
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        setErrorMsg(msg)
        setFlowState('error')
        onError(msg)
      })
  }

  function handleCopy(draft: Draft) {
    const text = draft.body || draft.preview
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIds((prev) => new Set(prev).add(draft.output_id))
      setTimeout(() => {
        setCopiedIds((prev) => { const s = new Set(prev); s.delete(draft.output_id); return s })
      }, 2000)
    })
  }

  function handleSave(draft: Draft) {
    // Output already persisted in DB — surface confirmation
    setSavedIds((prev) => new Set(prev).add(draft.output_id))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Source strip — always visible once URL detected */}
      <div className="flex items-center gap-2.5">
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt=""
          className="w-4 h-4 rounded-sm flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="flex-1 min-w-0">
          {pageTitle && (
            <p className="text-[13px] font-medium text-zinc-900 truncate leading-tight">{pageTitle}</p>
          )}
          <p className="text-[12px] text-zinc-400 truncate">{domain}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0 p-1"
          aria-label="Clear"
        >
          ✕
        </button>
      </div>

      {/* ── PREVIEW — waiting for user to confirm ── */}
      {flowState === 'preview' && (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-zinc-500 leading-relaxed">
            Clout will read this page and write 3 drafts in your voice — each from a different angle.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="w-full bg-zinc-900 text-white rounded-xl py-3 text-[14px] font-semibold hover:bg-zinc-700 transition-colors"
          >
            Generate 3 drafts
          </button>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {flowState === 'processing' && (
        <div className="flex flex-col gap-3 py-2">
          {STEPS.map((step, i) => {
            const done = i < stepIdx
            const active = i === stepIdx
            return (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-500',
                    done
                      ? 'bg-zinc-900 text-white'
                      : active
                      ? 'border-2 border-zinc-900 text-zinc-900'
                      : 'border-2 border-zinc-200 text-zinc-300'
                  )}
                >
                  {done ? '✓' : ''}
                </span>
                <span
                  className={cn(
                    'text-[13px] transition-all duration-300',
                    done ? 'text-zinc-400 line-through decoration-zinc-300' : active ? 'text-zinc-900 font-medium' : 'text-zinc-300'
                  )}
                >
                  {step}
                </span>
                {active && (
                  <span className="flex gap-0.5 ml-auto">
                    {[0, 1, 2].map((j) => (
                      <span
                        key={j}
                        className="w-1 h-1 rounded-full bg-zinc-400"
                        style={{ animation: `dot-bounce 1.2s ease-in-out infinite`, animationDelay: `${j * 0.2}s` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            )
          })}
          <style>{`
            @keyframes dot-bounce {
              0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
              40% { opacity: 1; transform: translateY(-3px); }
            }
          `}</style>
        </div>
      )}

      {/* ── DRAFTS READY ── */}
      {flowState === 'drafts_ready' && drafts.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase">
            3 drafts in your voice
          </p>
          {drafts.map((draft, i) => (
            <div
              key={draft.output_id}
              className="rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 transition-colors"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 pt-3.5 pb-2 border-b border-zinc-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {draft.angle}
                </span>
                <span className="text-[11px] text-zinc-300">
                  {i === 0 ? '1 of 3' : i === 1 ? '2 of 3' : '3 of 3'}
                </span>
              </div>
              {/* Draft body preview */}
              <div className="px-4 py-3">
                <p className="text-[13px] leading-[1.65] text-zinc-800 line-clamp-5 whitespace-pre-line">
                  {draft.hook || draft.preview}
                </p>
              </div>
              {/* Per-card actions */}
              <div className="flex items-center gap-0 border-t border-zinc-100 px-2">
                <button
                  type="button"
                  onClick={() => onComplete(draft.output_id)}
                  className="flex-1 py-2.5 text-[12px] font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors rounded-bl-xl"
                >
                  Open in Studio →
                </button>
                <div className="w-px h-5 bg-zinc-100" />
                <button
                  type="button"
                  onClick={() => handleCopy(draft)}
                  className="px-4 py-2.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  {copiedIds.has(draft.output_id) ? 'Copied ✓' : 'Copy'}
                </button>
                <div className="w-px h-5 bg-zinc-100" />
                <button
                  type="button"
                  onClick={() => handleSave(draft)}
                  className="px-4 py-2.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors rounded-br-xl"
                >
                  {savedIds.has(draft.output_id) ? 'Saved ✓' : 'Save'}
                </button>
              </div>
            </div>
          ))}
          <p className="text-[12px] text-zinc-400 text-center">
            All 3 drafts are saved to your studio.
          </p>
        </div>
      )}

      {/* ── ERROR ── */}
      {flowState === 'error' && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-lg">⚠</div>
          <p className="text-[14px] font-medium text-zinc-900">
            {errorMsg || 'Could not process this URL'}
          </p>
          <p className="text-[12px] text-zinc-400">
            Try a different link, or paste the text directly.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="text-[13px] font-medium text-zinc-900 border border-zinc-200 rounded-[10px] px-4 py-2 hover:border-zinc-400 transition-colors"
          >
            Try another link
          </button>
        </div>
      )}
    </div>
  )
}
