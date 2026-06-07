'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Lens } from '@/types/domain'
import { GeneratingAsBar } from '@/components/shared/generating-as-bar'
import { AngleOptions } from '@/components/capture/angle-options'

// Set to false in production once real API is wired
const DEMO_MODE = false

const MICROSTATES = [
  'Cleaning audio…',
  'Transcribing your words…',
  'Pulling out key ideas…',
  'Choosing the strongest angle…',
  'Drafting your post…',
]

const DEMO_TRANSCRIPT =
  '"The thing nobody talks about with B2B sales is that the first meeting is never about the product. It\'s about whether the buyer trusts that you understand their world better than they do…"'

const DEMO_THEMES = ['Trust', 'B2B Sales', 'Buyer Psychology']

const DEMO_DRAFT = [
  'Nobody told me the first sales call isn\'t about your product.',
  'I figured it out the hard way — after losing deals I thought I\'d won. The prospect liked the product. But they didn\'t trust that I understood their world.',
  'The best salespeople don\'t pitch. They make the buyer feel seen before they\'ve asked for anything.',
  'That\'s the first meeting. Everything else is paperwork.',
]

type FlowState = 'idle' | 'recording' | 'processing' | 'angles_ready' | 'draft_ready' | 'error'

interface VoiceCaptureFlowProps {
  workspaceId: string
  lenses: Lens[]
  selectedLensId: string
  onLensChange: (id: string) => void
  profileName: string | null
  onComplete: (outputId: string) => void
  onError: (msg: string) => void
}

export function VoiceCaptureFlow({
  workspaceId,
  lenses,
  selectedLensId,
  onLensChange,
  profileName,
  onComplete,
  onError,
}: VoiceCaptureFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [progress, setProgress] = useState(0)
  const [microstateIdx, setMicrostateIdx] = useState(0)
  const [microfade, setMicrofade] = useState(false)
  const [transcriptLines, setTranscriptLines] = useState<string[]>([])
  const [themes, setThemes] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [draftLines, setDraftLines] = useState<string[]>([])
  const [transcript, setTranscript] = useState('')
  const [captureId, setCaptureId] = useState<string | null>(null)
  const [outputId, setOutputId] = useState<string | null>(null)
  const [showCollapsible, setShowCollapsible] = useState(true)
  const [angles, setAngles] = useState<import('@/types/domain').Angle[]>([])
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])
  const [bestAngleGenerating, setBestAngleGenerating] = useState(false)
  const [draftAllGenerating, setDraftAllGenerating] = useState(false)
  const bestOutputIdRef = useRef<string | null>(null)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mimeTypeRef = useRef<string>('audio/webm')

  function getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ]
    if (typeof MediaRecorder === 'undefined') return ''
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
  }

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (progressRef.current) clearTimeout(progressRef.current)
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  function toggleTarget(t: string) {
    setSelectedTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  // ── Recording ──

  async function startRecording() {
    if (DEMO_MODE) {
      setFlowState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
      return
    }

    if (typeof MediaRecorder === 'undefined') {
      setErrorMsg('Audio recording is not supported in this browser. Try Chrome or Safari 14.5+.')
      setFlowState('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const recorderOptions = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, recorderOptions)
      mimeTypeRef.current = recorder.mimeType || mimeType || 'audio/webm'
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const actualMimeType = mimeTypeRef.current
        const blob = new Blob(chunksRef.current, { type: actualMimeType })
        await handleUploadAndProcess(blob, actualMimeType)
      }
      recorder.start()
      mediaRef.current = recorder
      setFlowState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } catch {
      setErrorMsg('Could not access microphone. Please check permissions.')
      setFlowState('error')
    }
  }

  function stopRecording() {
    clearTimers()
    if (DEMO_MODE) {
      beginProcessing({ transcript: DEMO_TRANSCRIPT, themes: DEMO_THEMES })
      return
    }
    mediaRef.current?.stop()
    setFlowState('processing')
  }

  // ── Upload → Transcribe → Generate ──

  async function handleUploadAndProcess(blob: Blob, mimeType: string = 'audio/webm') {
    setFlowState('processing')
    setProgress(0)
    setMicrostateIdx(0)

    try {
      // Upload audio via server-side API (uses service role, bypasses RLS)
      const uploadForm = new FormData()
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
      uploadForm.append('file', blob, `recording.${ext}`)
      uploadForm.append('mimeType', mimeType)
      const uploadRes = await fetch('/api/capture/audio-upload', {
        method: 'POST',
        body: uploadForm,
      })
      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json().catch(() => ({}))
        const detail = uploadErr.error ?? `HTTP ${uploadRes.status}`
        console.error('[voice-capture] audio upload failed:', detail)
        throw new Error(detail)
      }
      const uploadData = await uploadRes.json()
      const audioPath = uploadData.path
      if (!audioPath) {
        console.error('[voice-capture] upload response missing path:', uploadData)
        throw new Error('Upload succeeded but path missing — contact support')
      }

      // Create capture record
      const captureRes = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'voice', audio_path: audioPath }),
      })
      if (!captureRes.ok) throw new Error('Failed to save capture')
      const capture = await captureRes.json()
      setCaptureId(capture.id)

      // Transcribe
      const tRes = await fetch(`/api/capture/${capture.id}/transcribe`, { method: 'POST' })
      if (!tRes.ok) throw new Error('Transcription failed')
      const { transcript: tx } = await tRes.json()
      setTranscript(tx)

      // Extract angles (non-blocking — fallback to direct generate on failure)
      let extractedAngles: import('@/types/domain').Angle[] = []
      try {
        const aRes = await fetch(`/api/capture/${capture.id}/extract-angles`, { method: 'POST' })
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
            capture_id: capture.id,
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
      const gRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: capture.id, lens_id: selectedLensId }),
      })
      if (!gRes.ok) throw new Error('Generation failed')
      const gen = await gRes.json()
      setOutputId(gen.output_id ?? null)

      const body =
        (gen.content as Record<string, unknown> | null)?.body as string | undefined ??
        gen.raw_content ??
        ''
      const lines = body.split('\n\n').filter(Boolean)
      setDraftLines(lines.length > 0 ? lines : body ? [body] : ['Draft ready — open in Studio to view.'])
      setFlowState('draft_ready')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setFlowState('error')
      onError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  // ── Processing animation (demo + real) ──

  function beginProcessing({ transcript: tx, themes: th }: { transcript: string; themes: string[] }) {
    setFlowState('processing')
    setProgress(0)
    setMicrostateIdx(0)
    setTranscriptLines([])
    setThemes([])
    setTranscript(tx)

    const totalMs = DEMO_MODE ? 4000 : 8000
    const startTime = Date.now()

    function tick() {
      const elapsed2 = Date.now() - startTime
      const pct = Math.min(100, (elapsed2 / totalMs) * 100)
      setProgress(pct)

      const newIdx = Math.min(
        MICROSTATES.length - 1,
        Math.floor(pct / (100 / MICROSTATES.length))
      )
      setMicrostateIdx((prev) => {
        if (newIdx !== prev) {
          setMicrofade(true)
          setTimeout(() => setMicrofade(false), 150)
        }
        return newIdx
      })

      // Progressive transcript reveal
      if (pct > 20) setTranscriptLines([tx.slice(0, Math.floor(tx.length * 0.4))])
      if (pct > 50) setTranscriptLines([tx.slice(0, Math.floor(tx.length * 0.7))])
      if (pct > 75) setTranscriptLines([tx])

      // Themes appear mid-way
      if (pct > 60) setThemes(th)

      if (pct < 100) {
        progressRef.current = setTimeout(tick, 60)
      } else {
        if (DEMO_MODE) {
          setTimeout(() => {
            setDraftLines(DEMO_DRAFT)
            setFlowState('draft_ready')
          }, 400)
        }
        // real mode: handleUploadAndProcess handles final state
      }
    }
    tick()
  }

  // In real mode, kick off animation alongside the real pipeline
  useEffect(() => {
    if (flowState === 'processing' && !DEMO_MODE && transcript === '') {
      beginProcessing({ transcript: '…', themes: [] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowState])

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  function handleUseDraft() {
    if (outputId) onComplete(outputId)
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
    setTranscriptLines([])
    setThemes([])
    setDraftLines([])
    setErrorMsg('')
  }

  return (
    <div className="flex flex-col">
      {/* ── IDLE ── */}
      {flowState === 'idle' && (
        <div className="flex flex-col items-center py-8 gap-4 text-center px-6">
          <div>
            <p className="text-[15px] font-semibold text-zinc-900">Record a quick thought</p>
            <p className="text-[13px] text-zinc-400 mt-1">Talk naturally. We'll structure it.</p>
          </div>
          <button
            type="button"
            onClick={startRecording}
            className="w-[88px] h-[88px] rounded-full border-2 border-zinc-200 flex items-center justify-center hover:border-zinc-400 transition-all group"
          >
            <span className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center shadow-md group-hover:bg-zinc-700 transition-colors">
              <MicIcon />
            </span>
          </button>
          <p className="text-[13px] text-zinc-400">Speak freely. We'll find the signal.</p>
          <div className="w-full border-t border-zinc-100 pt-4 space-y-2">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Post to</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {['LinkedIn', 'X', 'Threads', 'Email', 'Blog'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTarget(t)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    selectedTargets.includes(t)
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {lenses.length > 0 && (
            <GeneratingAsBar
              profileName={profileName}
              lenses={lenses}
              selectedLensId={selectedLensId}
              onLensChange={onLensChange}
            />
          )}
        </div>
      )}

      {/* ── RECORDING ── */}
      {flowState === 'recording' && (
        <div className="flex flex-col items-center py-8 gap-4 text-center px-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[14px] font-bold text-zinc-900 tabular-nums">{formatTime(elapsed)}</span>
          </div>
          <div className="flex items-center gap-[3px] h-9">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className="w-1 rounded-sm bg-red-500"
                style={{
                  animation: `voice-wave 1.2s ease-in-out infinite`,
                  animationDelay: `${[0, 0.1, 0.2, 0.3, 0.15, 0.25, 0.05][i]}s`,
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="w-[88px] h-[88px] rounded-full border-2 border-red-200 flex items-center justify-center transition-all"
            style={{ animation: 'pulse-border 2s ease-in-out infinite' }}
          >
            <span className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-[0_4px_14px_rgba(239,68,68,.35)]">
              <StopIcon />
            </span>
          </button>
          <p className="text-[12px] text-zinc-400">Tap to stop</p>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {flowState === 'processing' && (
        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-[12px] font-medium text-green-700 self-start">
            <span>✓</span> Capture saved
          </div>
          {/* Progress bar */}
          <div className="h-[3px] rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full bg-zinc-900 rounded-full transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Microstate */}
          <p
            className={cn(
              'text-[14px] font-medium text-zinc-900 min-h-[22px] transition-opacity duration-150',
              microfade && 'opacity-0'
            )}
          >
            {MICROSTATES[microstateIdx]}
          </p>
          {/* Progressive transcript */}
          {transcriptLines.length > 0 && (
            <div className="text-[13px] text-zinc-500 leading-relaxed italic">
              {transcriptLines[transcriptLines.length - 1]}
            </div>
          )}
          {/* Theme chips */}
          {themes.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {themes.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 text-[12px] font-medium text-zinc-600"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ANGLES READY ── */}
      {flowState === 'angles_ready' && (
        <div className="px-6 py-4 space-y-4">
          <AngleOptions
            angles={angles}
            bestAngleGenerating={bestAngleGenerating}
            draftAllGenerating={draftAllGenerating}
            onDraftBest={handleDraftBest}
            onDraftOne={handleDraftOne}
            onDraftAll={handleDraftAll}
            onSkip={handleSkipAngles}
          />
          {transcript && (
            <div className="border-t border-zinc-100 pt-3">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Your words</p>
              <p className="text-[13px] text-zinc-500 leading-relaxed italic">{transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* ── DRAFT READY ── */}
      {flowState === 'draft_ready' && (
        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-[12px] font-medium text-green-700 self-start">
            <span>✓</span> Draft ready
          </div>
          <div>
            <p className="text-[12px] font-semibold text-zinc-400 tracking-wide mb-2">Here's your first draft.</p>
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
              <p key={i} className={i === draftLines.length - 1 ? 'font-semibold' : ''}>{line}</p>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleUseDraft}
              className="bg-zinc-900 text-white rounded-[10px] px-4 py-2.5 text-[13px] font-semibold hover:bg-zinc-700 transition-colors"
            >
              Use this draft →
            </button>
            <button
              type="button"
              className="bg-white text-zinc-600 border border-zinc-200 rounded-[10px] px-4 py-2.5 text-[13px] font-medium hover:border-zinc-400 transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              className="text-zinc-500 text-[13px] font-medium px-2 py-2.5 hover:text-zinc-900 transition-colors"
            >
              ↻ Try another angle
            </button>
          </div>
          {/* Platform targets */}
          {selectedTargets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedTargets.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-zinc-900 bg-zinc-900 text-white px-3 py-0.5 text-xs font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Collapsible transcript */}
          <div className="border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={() => setShowCollapsible((v) => !v)}
              className="text-[12px] text-zinc-400 flex items-center gap-1.5 hover:text-zinc-600 transition-colors"
            >
              Your words {showCollapsible ? '↑' : '↓'}
            </button>
            {showCollapsible && (
              <div className="mt-3 space-y-2">
                <p className="text-[12px] text-zinc-500 leading-relaxed italic">{transcript}</p>
                {themes.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {themes.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 text-[12px] font-medium text-zinc-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {flowState === 'error' && (
        <div className="flex flex-col items-center py-8 gap-3 text-center px-6">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-lg">⚠</div>
          <p className="text-[14px] font-medium text-zinc-900">
            {errorMsg || 'Something went wrong'}
          </p>
          <p className="text-[13px] text-zinc-400">
            {errorMsg.startsWith('Upload failed') || errorMsg.startsWith('HTTP ')
              ? 'Could not save the recording. Try again.'
              : 'Your recording was saved. Try again or continue without transcription.'}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="bg-white text-zinc-900 border border-zinc-200 rounded-[10px] px-4 py-2 text-[13px] font-medium hover:border-zinc-400 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      <style>{`
        @keyframes voice-wave {
          0%, 100% { height: 6px; opacity: 0.5; }
          50% { height: 28px; opacity: 1; }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgb(254 202 202); }
          50% { border-color: rgb(239 68 68); }
        }
      `}</style>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
      <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93V21h-2v2h6v-2h-2v-2.07A8 8 0 0020 11h-2a6 6 0 01-12 0H4a8 8 0 007 7.93z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  )
}
