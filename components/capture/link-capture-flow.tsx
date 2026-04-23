'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ExternalLink, Copy, Check, Sparkles, ArrowRight, X, ChevronDown, PenLine } from 'lucide-react'

const STEPS = ['Reading source', 'Finding angles', 'Matching your voice', 'Writing drafts']

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

// Heuristic insights — production version would return these from the API
function getAngleInsight(angle: string): string {
  const a = angle.toLowerCase()
  if (a.includes('contrarian') || a.includes('challenge') || a.includes('wrong') || a.includes('myth'))
    return 'Challenges a widely-held assumption. Readers stop scrolling when their existing beliefs are questioned — this angle earns engagement through productive friction.'
  if (a.includes('personal') || a.includes('story') || a.includes('experience') || a.includes('lesson'))
    return 'Grounds the idea in lived experience. Abstract claims become credible when anchored to specifics only you could know — this is the angle that builds trust over time.'
  if (a.includes('tactical') || a.includes('how') || a.includes('framework') || a.includes('practical'))
    return 'Extracts the actionable core. Readers who act on your content remember you. This angle converts passive readers into people who credit you when results show up.'
  return 'Surfaces a dimension of the source others will miss. Being first to the unexpected angle is how thought leaders build reputations — this positions you ahead of the reaction curve.'
}

export function LinkCaptureFlow({ url, lensId, onComplete, onError, onReset }: LinkCaptureFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>('preview')
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const didProcess = useRef(false)

  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', '') } catch { return url }
  })()

  useEffect(() => {
    fetch(`/api/capture/url-meta?url=${encodeURIComponent(url)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.title) setPageTitle(data.title) })
      .catch(() => {})
  }, [url])

  useEffect(() => {
    if (flowState === 'drafts_ready') {
      // Two-frame delay ensures CSS transition fires
      requestAnimationFrame(() => requestAnimationFrame(() => setOverlayVisible(true)))
    }
  }, [flowState])

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
        didProcess.current = false // allow retry
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        setErrorMsg(msg)
        setFlowState('error')
        onError(msg)
      })
  }

  function handleCopy(draft: Draft) {
    navigator.clipboard.writeText(draft.body || draft.preview).then(() => {
      setCopiedId(draft.output_id)
      setTimeout(() => setCopiedId(null), 2200)
    })
  }

  function handleCloseOverlay() {
    setOverlayVisible(false)
    setTimeout(onReset, 280)
  }

  // ── Source strip (reused in preview + processing + error) ──────────────────
  const sourceStrip = (
    <div className="flex items-center gap-2.5">
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        alt=""
        className="w-4 h-4 rounded-sm flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <div className="flex-1 min-w-0">
        {pageTitle && <p className="text-[13px] font-medium text-zinc-900 truncate leading-tight">{pageTitle}</p>}
        <p className="text-[12px] text-zinc-400 truncate">{domain}</p>
      </div>
      <button type="button" onClick={onReset} className="text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0 p-1" aria-label="Clear">✕</button>
    </div>
  )

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  if (flowState === 'preview') {
    return (
      <div className="flex flex-col gap-3">
        {sourceStrip}
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
    )
  }

  // ── PROCESSING — minimal progress bar, no pills ─────────────────────────────
  if (flowState === 'processing') {
    return (
      <div className="flex flex-col gap-3">
        {sourceStrip}
        <div className="py-5 space-y-4">
          {/* Segmented progress bar */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-0.5 flex-1 rounded-full transition-all duration-700',
                  i < stepIdx ? 'bg-zinc-900' : i === stepIdx ? 'bg-zinc-400' : 'bg-zinc-100'
                )}
              />
            ))}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-zinc-900">{STEPS[stepIdx]}<span className="inline-flex gap-0.5 ml-2 relative top-[-1px]">{[0,1,2].map((j) => <span key={j} className="w-1 h-1 rounded-full bg-zinc-400 inline-block" style={{ animation: 'lcf-bounce 1.1s ease-in-out infinite', animationDelay: `${j * 0.18}s` }} />)}</span></p>
            <p className="text-[12px] text-zinc-400 mt-1">Usually takes 10–15 seconds</p>
          </div>
        </div>
        <style>{`@keyframes lcf-bounce { 0%,80%,100%{opacity:.3;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }`}</style>
      </div>
    )
  }

  // ── DRAFTS READY — full-screen modal overlay ───────────────────────────────
  if (flowState === 'drafts_ready' && drafts.length > 0) {
    return (
      <>
        <style>{`
          @keyframes lcf-bounce { 0%,80%,100%{opacity:.3;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }
          @keyframes lcf-card-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
          .lcf-card { animation: lcf-card-in 0.38s cubic-bezier(.22,1,.36,1) both; }
          @keyframes lcf-header-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
          .lcf-header { animation: lcf-header-in 0.32s cubic-bezier(.22,1,.36,1) 0.08s both; }
        `}</style>

        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-[3px] transition-opacity duration-300',
            overlayVisible ? 'opacity-100' : 'opacity-0'
          )}
          onClick={handleCloseOverlay}
        />

        {/* Panel */}
        <div
          className={cn(
            'fixed z-50 flex flex-col bg-white shadow-2xl',
            // Positioning: full-width panel from 5vh top to near-bottom
            'inset-x-0 bottom-0 top-[4vh]',
            'md:inset-x-6 md:top-[5vh] md:bottom-5 md:rounded-2xl',
            'lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[960px] lg:top-[6vh] lg:bottom-6 lg:rounded-2xl',
            'transition-all duration-300 ease-out',
            overlayVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          )}
        >
          {/* ── Header ── */}
          <div className="lcf-header flex items-start justify-between gap-6 px-8 pt-8 pb-6 border-b border-zinc-100 flex-shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">Content ready</p>
              <h2 className="text-[24px] font-semibold leading-[1.2] tracking-tight text-zinc-950">
                Turn great sources into original<br className="hidden sm:block" /> content in your voice.
              </h2>
              <p className="mt-2 text-[15px] text-zinc-500">
                We found {drafts.length} strong angle{drafts.length !== 1 ? 's' : ''} from this source.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseOverlay}
              className="flex-shrink-0 mt-1 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Source card ── */}
          <div className="flex-shrink-0 px-8 py-3.5 border-b border-zinc-100 bg-zinc-50/70">
            <div className="flex items-center gap-3">
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                alt=""
                className="w-[18px] h-[18px] rounded-sm flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div className="flex-1 min-w-0">
                {pageTitle ? (
                  <p className="text-[13px] font-semibold text-zinc-800 truncate leading-tight">{pageTitle}</p>
                ) : null}
                <p className="text-[12px] text-zinc-400">{domain}</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View source
              </a>
            </div>
          </div>

          {/* ── Draft cards ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {drafts.map((draft, i) => {
                const isRec = i === 0
                const insight = getAngleInsight(draft.angle)
                const insightOpen = expandedInsight === i

                return (
                  <div
                    key={draft.output_id}
                    className={cn(
                      'lcf-card flex flex-col rounded-xl overflow-hidden',
                      isRec
                        ? 'ring-1 ring-zinc-900 shadow-lg'
                        : 'border border-zinc-200 hover:border-zinc-300 transition-colors'
                    )}
                    style={{ animationDelay: `${0.12 + i * 0.07}s` }}
                  >
                    {/* Card header */}
                    <div className={cn(
                      'px-5 pt-4 pb-3.5 border-b',
                      isRec
                        ? 'bg-zinc-950 border-zinc-800'
                        : 'bg-white border-zinc-100'
                    )}>
                      {isRec ? (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="h-3 w-3 text-amber-400" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">Recommended</span>
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 mb-2">
                          Option {i + 1}
                        </p>
                      )}
                      <p className={cn(
                        'text-[14px] font-semibold leading-snug',
                        isRec ? 'text-white' : 'text-zinc-900'
                      )}>
                        {draft.angle}
                      </p>
                    </div>

                    {/* Draft preview */}
                    <div className="flex-1 px-5 py-4 bg-white">
                      <p className="text-[13px] leading-[1.75] text-zinc-700 line-clamp-7 whitespace-pre-line">
                        {draft.hook || draft.preview}
                      </p>
                    </div>

                    {/* Why this angle works */}
                    <div className="border-t border-zinc-100 bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedInsight(insightOpen ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-3 text-[11px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        Why this angle works
                        <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', insightOpen ? 'rotate-180' : '')} />
                      </button>
                      {insightOpen && (
                        <div className="px-5 pb-4">
                          <p className="text-[12px] leading-relaxed text-zinc-500">{insight}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={cn('border-t p-4 space-y-2.5', isRec ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-100 bg-zinc-50/60')}>
                      {/* Primary CTA */}
                      <button
                        type="button"
                        onClick={() => onComplete(draft.output_id)}
                        className={cn(
                          'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold transition-colors',
                          isRec
                            ? 'bg-white text-zinc-950 hover:bg-zinc-100'
                            : 'bg-zinc-950 text-white hover:bg-zinc-800'
                        )}
                      >
                        Use This Draft
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>

                      {/* Secondary row */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onComplete(draft.output_id)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[12px] font-medium transition-colors border',
                            isRec
                              ? 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 bg-transparent'
                              : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 bg-white'
                          )}
                        >
                          <PenLine className="h-3 w-3" />
                          Studio
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(draft)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[12px] font-medium transition-colors border',
                            isRec
                              ? 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 bg-transparent'
                              : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 bg-white'
                          )}
                        >
                          {copiedId === draft.output_id ? (
                            <><Check className="h-3 w-3 text-green-500" /> Copied</>
                          ) : (
                            <><Copy className="h-3 w-3" /> Copy</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-t border-zinc-100 bg-zinc-50/60">
            <p className="text-[12px] text-zinc-400">
              All {drafts.length} drafts are saved to your Studio.
            </p>
            <button
              type="button"
              onClick={handleCloseOverlay}
              className="text-[12px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (flowState === 'error') {
    return (
      <div className="flex flex-col gap-3">
        {sourceStrip}
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-lg">⚠</div>
          <p className="text-[14px] font-medium text-zinc-900">{errorMsg || 'Could not process this URL'}</p>
          <p className="text-[12px] text-zinc-400">Try again or paste a different link.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFlowState('preview')}
              className="text-[13px] font-semibold text-white bg-zinc-900 rounded-[10px] px-4 py-2 hover:bg-zinc-700 transition-colors"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={onReset}
              className="text-[13px] font-medium text-zinc-900 border border-zinc-200 rounded-[10px] px-4 py-2 hover:border-zinc-400 transition-colors"
            >
              Different link
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
