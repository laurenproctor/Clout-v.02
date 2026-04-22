'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Loader2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CaptureSource, Lens } from '@/types/domain'
import { VoiceRecorder } from '@/components/capture/voice-recorder'
import { VoiceCaptureFlow } from '@/components/capture/voice-capture-flow'
import { UpgradePrompt } from '@/components/shared/upgrade-prompt'

const ROTATING_PROMPTS = [
  "What's a lesson you keep having to relearn?",
  "What did you change your mind about recently?",
  "What does your industry get consistently wrong?",
  "What's the advice you give in private but never post?",
  "What's a decision that felt risky but paid off?",
  "What's something obvious to you that surprises everyone else?",
  "What would you tell yourself five years ago?",
  "What's the thing you wish more people understood about your work?",
]

export default function NewCapturePage() {
  return (
    <Suspense>
      <NewCaptureInner />
    </Suspense>
  )
}

type CaptureMode = 'write' | 'voice' | 'paste' | 'upload' | 'more'

function NewCaptureInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Existing state (unchanged) ──
  const [source, setSource] = useState<CaptureSource>('text')
  const [content, setContent] = useState(searchParams.get('content') ?? '')
  const [isPrivate, setIsPrivate] = useState(false)
  const [tags] = useState<string[]>([])
  const [audioPath, setAudioPath] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<{ type: 'capture' | 'generation'; used: number; limit: number } | null>(null)
  const [structuredData, setStructuredData] = useState<Record<string, string> | null>(null)
  const [savedCaptureId, setSavedCaptureId] = useState<string | null>(null)
  const [lenses, setLenses] = useState<Lens[]>([])
  const [selectedLensId, setSelectedLensId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [workspaceId, setWorkspaceId] = useState('pending')
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)

  // ── New UI state ──
  const [captureMode, setCaptureMode] = useState<CaptureMode>(() => {
    const mode = searchParams.get('mode')
    if (mode === 'voice') return 'voice'
    return 'write'
  })
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])
  const [promptIndex, setPromptIndex] = useState(0)
  const [promptVisible, setPromptVisible] = useState(true)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load lenses + workspace ID
  useEffect(() => {
    fetch('/api/lenses')
      .then((r) => r.ok ? r.json() : [])
      .then((data: Lens[]) => {
        setLenses(data)
        if (data.length > 0) setSelectedLensId(data[0].id)
      })
      .catch(() => {})

    fetch('/api/workspace')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.workspace?.id) setWorkspaceId(data.workspace.id) })
      .catch(() => {})
  }, [])

  // Rotating prompts
  useEffect(() => {
    if (captureMode !== 'write' || content.trim()) return
    const interval = setInterval(() => {
      setPromptVisible(false)
      setTimeout(() => {
        setPromptIndex((i) => (i + 1) % ROTATING_PROMPTS.length)
        setPromptVisible(true)
      }, 400)
    }, 3800)
    return () => clearInterval(interval)
  }, [captureMode, content])

  // Click-outside for More dropdown
  useEffect(() => {
    if (!showMoreDropdown) return
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMoreDropdown])

  // Sync source with captureMode
  function switchMode(mode: CaptureMode) {
    setCaptureMode(mode)
    setContent('')
    setUploadedFile(null)
    setStructuredData(null)
    if (mode === 'write' || mode === 'paste') setSource('text')
    else if (mode === 'voice') setSource('voice')
    else if (mode === 'upload') setSource('structured')
    if (mode === 'more') setShowMoreDropdown((v) => !v)
  }

  function toggleTarget(t: string) {
    setSelectedTargets((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (source !== 'voice' && !content.trim() && !uploadedFile) return
    if (source === 'voice' && !audioPath) return
    setSubmitting(true)
    setError(null)
    setLimitError(null)

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          raw_content: source === 'voice' ? null : content || (uploadedFile ? `File: ${uploadedFile.name}` : null),
          audio_path: source === 'voice' ? audioPath : undefined,
          is_private: isPrivate,
          tags,
          structured_data: structuredData ?? (uploadedFile ? { filename: uploadedFile.name, type: uploadedFile.type } : undefined),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.code === 'CAPTURE_LIMIT_EXCEEDED') {
          setLimitError({ type: 'capture', used: 0, limit: 10 })
          return
        }
        setError(data.error ?? 'Failed to save capture')
        return
      }

      const capture = await res.json()

      if (isPrivate) {
        router.push('/private')
        return
      }

      // For voice captures, transcribe before offering generation
      if (source === 'voice' && audioPath) {
        setSavedCaptureId(capture.id)
        setTranscribing(true)
        setTranscribeError(null)
        try {
          const tRes = await fetch(`/api/capture/${capture.id}/transcribe`, { method: 'POST' })
          if (!tRes.ok) {
            const tData = await tRes.json()
            setTranscribeError(tData.error ?? 'Transcription failed')
          }
        } catch {
          setTranscribeError('Transcription failed. You can still generate from this capture.')
        } finally {
          setTranscribing(false)
        }
        return
      }

      if (lenses.length > 0) {
        setSavedCaptureId(capture.id)
      } else {
        router.push(`/capture/${capture.id}`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerate() {
    if (!savedCaptureId || !selectedLensId) return
    setGenerating(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: savedCaptureId, lens_id: selectedLensId }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/studio/${data.output_id}`)
      } else {
        router.push(`/capture/${savedCaptureId}`)
      }
    } catch {
      router.push(`/capture/${savedCaptureId}`)
    }
  }

  // ── Post-save screen ──────────────────────────────────────────────────────
  if (savedCaptureId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/capture" className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Capture saved</h1>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
          {transcribing ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
              <p className="text-sm font-medium text-zinc-900">Transcribing your recording…</p>
              <p className="text-xs text-zinc-400">This usually takes 5–15 seconds.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <p className="text-sm font-medium text-zinc-900">
                  {transcribeError
                    ? 'Capture saved. Transcription had an issue — you can still generate.'
                    : 'Your thought is captured. Generate content now?'}
                </p>
              </div>
              {transcribeError && (
                <p className="text-xs text-red-500">{transcribeError}</p>
              )}
            </>
          )}

          {!transcribing && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Choose a lens
              </label>
              <select
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                value={selectedLensId}
                onChange={(e) => setSelectedLensId(e.target.value)}
              >
                {lenses.map((lens) => (
                  <option key={lens.id} value={lens.id}>
                    {lens.name}{lens.scope === 'system' ? ' ✦' : ''}
                  </option>
                ))}
              </select>
              {selectedLensId && (
                <p className="mt-1 text-xs text-zinc-400">
                  {lenses.find((l) => l.id === selectedLensId)?.description}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedLensId}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-5 py-2 text-sm font-medium transition-colors',
                  generating || !selectedLensId
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-900 text-white hover:bg-zinc-700'
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                {generating ? 'Extracting signal...' : 'Generate →'}
              </button>
              <Link
                href={`/capture/${savedCaptureId}`}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Skip for now
              </Link>
            </div>
          </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main capture screen ────────────────────────────────────────────────────
  const canSubmit = source === 'voice' ? !!audioPath : (content.trim().length > 0 || !!uploadedFile)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link href="/capture" className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Turn a rough thought into something strong.</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Fragments are enough.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-0">
        {/* Composer card */}
        <div className="rounded-[22px] border border-zinc-200 bg-white shadow-md overflow-hidden">

          {/* Mode bar */}
          <div className="flex items-center gap-0 border-b border-zinc-100 px-5 pt-4 pb-0">
            {(['write', 'voice', 'paste', 'upload'] as CaptureMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => switchMode(mode)}
                className={cn(
                  'pb-3 px-3 text-sm font-medium transition-colors capitalize border-b-2 -mb-px',
                  captureMode === mode
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700'
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
            <div ref={moreRef} className="relative ml-1 pb-3 -mb-px">
              <button
                type="button"
                onClick={() => switchMode('more')}
                className={cn(
                  'flex items-center gap-0.5 px-3 text-sm font-medium transition-colors border-b-2',
                  showMoreDropdown ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'
                )}
              >
                More
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showMoreDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-zinc-200 bg-white shadow-lg p-4 space-y-4 z-10">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Email in</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-md bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-700 truncate">
                        captures@capture.clout.so
                      </code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText('captures@capture.clout.so')}
                        className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-400">Forward anything — articles, emails, newsletters.</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Call or text</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-md bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-700">
                        Coming soon
                      </code>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-400">Leave a voice message or text any thought to your Clout number.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel content */}
          <div className="px-6 py-5 min-h-[220px]">
            {captureMode === 'write' && (
              <div className="relative">
                <textarea
                  autoFocus
                  className="w-full resize-none bg-transparent text-[18px] leading-[1.75] text-zinc-900 placeholder:text-transparent focus:outline-none min-h-[180px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                {!content && (
                  <p
                    className={cn(
                      'pointer-events-none absolute top-0 left-0 text-[18px] leading-[1.75] text-zinc-300 transition-opacity duration-300',
                      promptVisible ? 'opacity-100' : 'opacity-0'
                    )}
                  >
                    {ROTATING_PROMPTS[promptIndex]}
                  </p>
                )}
              </div>
            )}

            {captureMode === 'voice' && (
              <VoiceCaptureFlow
                workspaceId={workspaceId}
                lenses={lenses}
                selectedLensId={selectedLensId}
                onLensChange={setSelectedLensId}
                onComplete={(outputId) => router.push(`/studio/${outputId}`)}
                onError={(err) => setError(err)}
              />
            )}

            {captureMode === 'paste' && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">Paste a tweet thread, an email draft, a Notion doc — anything with ideas in it.</p>
                <textarea
                  autoFocus
                  className="w-full resize-none rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 px-5 py-4 text-[17px] leading-[1.75] text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 min-h-[140px] transition-colors"
                  placeholder="Paste anything here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            )}

            {captureMode === 'upload' && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">Drop a PDF, slide deck, audio file, or image. Clout will find what's worth saying.</p>
                <div
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center transition-colors cursor-pointer hover:border-zinc-400',
                    uploadedFile && 'border-zinc-400 bg-zinc-50'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file) {
                      setUploadedFile(file)
                      setStructuredData({ filename: file.name, type: file.type })
                      setContent(`File: ${file.name}`)
                    }
                  }}
                >
                  {uploadedFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-900">{uploadedFile.name}</p>
                      <p className="text-xs text-zinc-400">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setContent(''); setStructuredData(null) }}
                        className="mt-2 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-3xl mb-3">📎</p>
                      <p className="text-sm font-medium text-zinc-700">Drop a file here or click to browse</p>
                      <p className="mt-1 text-xs text-zinc-400">PDF, Word, TXT, CSV, images, audio, video</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.csv,image/*,audio/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setUploadedFile(file)
                        setStructuredData({ filename: file.name, type: file.type })
                        setContent(`File: ${file.name}`)
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {captureMode === 'more' && (
              <div className="flex items-center justify-center h-full text-sm text-zinc-400 py-8">
                Select an option from the More menu above.
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-zinc-100 bg-zinc-50/60 px-6 py-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Lens picker */}
              {lenses.length > 0 && (
                <select
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400"
                  value={selectedLensId}
                  onChange={(e) => setSelectedLensId(e.target.value)}
                >
                  {lenses.map((lens) => (
                    <option key={lens.id} value={lens.id}>
                      {lens.name}{lens.scope === 'system' ? ' ✦' : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* Output target chips */}
              <div className="flex items-center gap-1.5">
                {['LinkedIn', 'X', 'Email', 'Blog'].map((t) => (
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

              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors',
                    submitting || !canSubmit
                      ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                      : 'bg-zinc-900 text-white hover:bg-zinc-700'
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Extracting signal...
                    </>
                  ) : (
                    <>✦ Make it →</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {limitError && (
          <div className="pt-4">
            <UpgradePrompt
              type={limitError.type}
              used={limitError.used}
              limit={limitError.limit}
              onDismiss={() => setLimitError(null)}
            />
          </div>
        )}
        {error && !limitError && <p className="pt-3 text-sm text-red-600">{error}</p>}
      </form>

      <p className="text-center text-sm text-zinc-400">
        The best posts start as half-formed thoughts. Drop yours here.
      </p>
    </div>
  )
}
