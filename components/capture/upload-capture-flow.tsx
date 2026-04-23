'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type FlowState = 'idle' | 'has_files' | 'processing' | 'drafts_ready' | 'error'

interface UploadedFile {
  file: File
  id: string
  preview?: string // base64 thumbnail for images
  error?: string
}

interface Draft {
  output_id: string
  angle: string
  hook: string
  body: string
  preview: string
}

interface UploadCaptureFlowProps {
  lensId: string
  onComplete: (outputId: string) => void
  onError: (msg: string) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILES = 5
const MAX_BYTES = 25 * 1024 * 1024

const ACCEPTED = '.txt,.md,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.m4a,.ogg,.flac,.aac'

const FORMAT_LABELS = 'PDF · DOCX · TXT · PNG · JPG · MP3 · WAV · M4A'

const HELPER_EXAMPLES = 'Meeting notes, podcast transcripts, webinar recordings, research docs, slide decks, screenshots.'

const BASE_STEPS = ['Reading files', 'Extracting strongest ideas', 'Matching your voice', 'Writing 3 drafts']

function getFileCategory(file: File): 'text' | 'pdf' | 'doc' | 'image' | 'audio' | 'unsupported' {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mime = file.type
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext)) return 'image'
  if (mime.startsWith('audio/') || mime.startsWith('video/') || ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'mp4', 'mov'].includes(ext)) return 'audio'
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext) || mime.includes('wordprocessingml') || mime.includes('msword')) return 'doc'
  if (mime.startsWith('text/') || ['txt', 'md', 'markdown', 'csv', 'json'].includes(ext)) return 'text'
  return 'unsupported'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file: File): string {
  const cat = getFileCategory(file)
  if (cat === 'image') return '🖼'
  if (cat === 'audio') return '🎵'
  if (cat === 'pdf') return '📄'
  if (cat === 'doc') return '📝'
  return '📄'
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UploadCaptureFlow({ lensId, onComplete, onError }: UploadCaptureFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [steps, setSteps] = useState(BASE_STEPS)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [regenLoading, setRegenLoading] = useState<string | null>(null)
  const [regenErrorId, setRegenErrorId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const captureIdRef = useRef<string | null>(null)

  function buildSteps(files: UploadedFile[]): string[] {
    const hasAudio = files.some((f) => getFileCategory(f.file) === 'audio')
    const hasImage = files.some((f) => getFileCategory(f.file) === 'image')
    const extra: string[] = []
    if (hasAudio) extra.push('Transcribing recording')
    if (hasImage) extra.push('Reading screenshot')
    return ['Reading files', ...extra, 'Extracting strongest ideas', 'Matching your voice', 'Writing 3 drafts']
  }

  const addFiles = useCallback((incoming: File[]) => {
    setFileError(null)
    const combined = [...uploadedFiles]
    for (const file of incoming) {
      if (combined.length >= MAX_FILES) {
        setFileError(`Maximum ${MAX_FILES} files allowed.`)
        break
      }
      if (file.size > MAX_BYTES) {
        setFileError(`${file.name} is too large (max 25 MB).`)
        continue
      }
      if (getFileCategory(file) === 'unsupported') {
        setFileError(`${file.name} isn't a supported file type.`)
        continue
      }
      const entry: UploadedFile = { file, id: `${file.name}-${file.size}-${Date.now()}` }
      // Generate image thumbnail
      if (getFileCategory(file) === 'image') {
        const reader = new FileReader()
        reader.onload = (e) => {
          setUploadedFiles((prev) =>
            prev.map((f) => f.id === entry.id ? { ...f, preview: e.target?.result as string } : f)
          )
        }
        reader.readAsDataURL(file)
      }
      combined.push(entry)
    }
    setUploadedFiles(combined)
    if (combined.length > 0) setFlowState('has_files')
  }, [uploadedFiles])

  function removeFile(id: string) {
    const next = uploadedFiles.filter((f) => f.id !== id)
    setUploadedFiles(next)
    if (next.length === 0) setFlowState('idle')
  }

  async function handleGenerate() {
    if (!uploadedFiles.length) return
    const dynamicSteps = buildSteps(uploadedFiles)
    setSteps(dynamicSteps)
    setStepIdx(0)
    setFlowState('processing')

    // Advance steps every ~2.5s while waiting for API
    stepTimer.current = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, dynamicSteps.length - 1))
    }, 2500)

    const body = new FormData()
    uploadedFiles.forEach((f) => body.append('files', f.file))
    if (lensId) body.append('lens_id', lensId)

    try {
      const res = await fetch('/api/capture/upload/process', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Processing failed')
      clearInterval(stepTimer.current!)
      captureIdRef.current = data.capture_id
      setDrafts(data.drafts ?? [])
      setStepIdx(dynamicSteps.length - 1)
      setTimeout(() => setFlowState('drafts_ready'), 350)
    } catch (err) {
      clearInterval(stepTimer.current!)
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setErrorMsg(msg)
      setFlowState('error')
      onError(msg)
    }
  }

  async function handleRegen(draft: Draft, idx: number) {
    if (!captureIdRef.current) return
    setRegenLoading(draft.output_id)
    setRegenErrorId(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: captureIdRef.current, lens_id: lensId || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Regeneration failed')
      // Fetch the new output content to update card
      const outRes = await fetch(`/api/outputs/${data.output_id}`)
      if (outRes.ok) {
        const outData = await outRes.json()
        const newBody = outData.content?.body ?? ''
        const newHook = outData.content?.hook ?? ''
        setDrafts((prev) => prev.map((d, i) =>
          i === idx ? { ...d, output_id: data.output_id, hook: newHook, body: newBody, preview: newBody.slice(0, 300) } : d
        ))
      }
    } catch (err) {
      console.error('[upload-compose] regen failed:', err)
      setRegenErrorId(draft.output_id)
    } finally {
      setRegenLoading(null)
    }
  }

  function handleCopy(draft: Draft) {
    navigator.clipboard.writeText(draft.body || draft.preview).then(() => {
      setCopiedIds((prev) => new Set(prev).add(draft.output_id))
      setTimeout(() => setCopiedIds((prev) => { const s = new Set(prev); s.delete(draft.output_id); return s }), 2000)
    })
  }

  function handleSave(draft: Draft) {
    // Output already persisted — surface confirmation
    setSavedIds((prev) => new Set(prev).add(draft.output_id))
  }

  function handleReset() {
    clearInterval(stepTimer.current!)
    setFlowState('idle')
    setUploadedFiles([])
    setDrafts([])
    setErrorMsg('')
    setFileError(null)
    setStepIdx(0)
    captureIdRef.current = null
  }

  // Drag events on the outer zone
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  useEffect(() => () => { if (stepTimer.current) clearInterval(stepTimer.current) }, [])

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (flowState === 'idle') {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[15px] font-semibold text-zinc-900 mb-1">Add notes, transcripts, decks, or documents</p>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            Upload material worth turning into content. Clout finds the strongest angles and writes 3 drafts.
          </p>
        </div>
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border bg-zinc-50 px-8 py-12 text-center cursor-pointer transition-all duration-200 select-none',
            isDragging
              ? 'border-zinc-900 bg-white shadow-[inset_0_0_0_2px_#18181b]'
              : 'border-zinc-200 hover:border-zinc-300 hover:bg-white hover:shadow-sm'
          )}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <UploadIcon dragging={isDragging} />
          <p className="mt-4 text-[14px] font-medium text-zinc-700">
            {isDragging ? 'Drop to upload' : 'Drag files here or click to upload'}
          </p>
          <p className="mt-1.5 text-[12px] text-zinc-400">{FORMAT_LABELS}</p>
          <p className="mt-3 text-[12px] text-zinc-300 max-w-xs leading-relaxed">{HELPER_EXAMPLES}</p>
        </div>
        {fileError && (
          <p className="text-[13px] text-red-500">{fileError}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }}
        />
      </div>
    )
  }

  // ── HAS FILES ─────────────────────────────────────────────────────────────
  if (flowState === 'has_files') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] font-medium text-zinc-900">
          {uploadedFiles.length === 1 ? '1 file ready' : `${uploadedFiles.length} files ready`}
        </p>
        <div className="flex flex-col gap-2.5">
          {uploadedFiles.map((f) => (
            <FileCard
              key={f.id}
              entry={f}
              onRemove={() => removeFile(f.id)}
              onReplace={() => {
                removeFile(f.id)
                setTimeout(() => fileInputRef.current?.click(), 50)
              }}
            />
          ))}
        </div>
        {uploadedFiles.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors w-fit"
          >
            <span className="w-5 h-5 rounded-full border border-zinc-200 flex items-center justify-center text-[11px]">+</span>
            Add another file
          </button>
        )}
        {fileError && <p className="text-[13px] text-red-500">{fileError}</p>}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }}
        />
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full bg-zinc-900 text-white rounded-xl py-3.5 text-[14px] font-semibold hover:bg-zinc-700 transition-colors mt-1"
        >
          Generate 3 drafts →
        </button>
      </div>
    )
  }

  // ── PROCESSING ────────────────────────────────────────────────────────────
  if (flowState === 'processing') {
    return (
      <div className="flex flex-col gap-5">
        <SourceStrip files={uploadedFiles} onReset={handleReset} />
        <div className="flex flex-col gap-3.5 py-1">
          {steps.map((step, i) => {
            const done = i < stepIdx
            const active = i === stepIdx
            return (
              <div key={step} className="flex items-center gap-3">
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all duration-500',
                  done ? 'bg-zinc-900 text-white' : active ? 'border-2 border-zinc-900 text-zinc-900' : 'border-2 border-zinc-200 text-zinc-300'
                )}>
                  {done ? '✓' : ''}
                </span>
                <span className={cn(
                  'text-[13px] flex-1 transition-all duration-300',
                  done ? 'text-zinc-300 line-through decoration-zinc-200' : active ? 'text-zinc-900 font-medium' : 'text-zinc-300'
                )}>
                  {step}
                </span>
                {active && (
                  <span className="flex gap-[3px]">
                    {[0, 1, 2].map((j) => (
                      <span key={j} className="w-1 h-1 rounded-full bg-zinc-400"
                        style={{ animation: 'dot-pulse 1.2s ease-in-out infinite', animationDelay: `${j * 0.2}s` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <style>{`@keyframes dot-pulse{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}`}</style>
      </div>
    )
  }

  // ── DRAFTS READY ──────────────────────────────────────────────────────────
  if (flowState === 'drafts_ready') {
    return (
      <div className="flex flex-col gap-4">
        <SourceStrip files={uploadedFiles} onReset={handleReset} />
        <div>
          <p className="text-[13px] font-semibold text-zinc-900 mb-0.5">Found {drafts.length} strong angles from your files.</p>
          <p className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase">Pick a draft to take into studio</p>
        </div>
        <div className="flex flex-col gap-3">
          {drafts.map((draft, i) => (
            <DraftCard
              key={draft.output_id}
              draft={draft}
              index={i}
              isCopied={copiedIds.has(draft.output_id)}
              isSaved={savedIds.has(draft.output_id)}
              isRegening={regenLoading === draft.output_id}
              regenFailed={regenErrorId === draft.output_id}
              onOpen={() => onComplete(draft.output_id)}
              onCopy={() => handleCopy(draft)}
              onSave={() => handleSave(draft)}
              onRegen={() => handleRegen(draft, i)}
            />
          ))}
        </div>
        <p className="text-[12px] text-zinc-400 text-center">All drafts are saved to your studio.</p>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-lg">⚠</div>
      <p className="text-[14px] font-medium text-zinc-900">{errorMsg || 'Processing failed'}</p>
      <p className="text-[12px] text-zinc-400 max-w-xs">Try again or paste the content directly in the Paste tab.</p>
      <button
        type="button"
        onClick={handleReset}
        className="border border-zinc-200 rounded-xl px-5 py-2.5 text-[13px] font-medium text-zinc-900 hover:border-zinc-400 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UploadIcon({ dragging }: { dragging: boolean }) {
  return (
    <svg
      width="36" height="36" viewBox="0 0 24 24" fill="none"
      className={cn('transition-all duration-200', dragging ? 'text-zinc-900 scale-110' : 'text-zinc-300')}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function FileCard({ entry, onRemove, onReplace }: { entry: UploadedFile; onRemove: () => void; onReplace: () => void }) {
  const isImage = getFileCategory(entry.file) === 'image'
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 animate-[fadeUp_.18s_ease_forwards]">
      {isImage && entry.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <span className="text-xl flex-shrink-0 w-10 text-center">{getFileIcon(entry.file)}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-zinc-900 truncate">{entry.file.name}</p>
        <p className="text-[12px] text-zinc-400">{formatBytes(entry.file.size)}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button type="button" onClick={onReplace} className="text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors">Replace</button>
        <button type="button" onClick={onRemove} className="text-[12px] text-zinc-400 hover:text-red-500 transition-colors">✕</button>
      </div>
    </div>
  )
}

function SourceStrip({ files, onReset }: { files: UploadedFile[]; onReset: () => void }) {
  const label = files.length === 1 ? files[0].file.name : `${files.length} files`
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-base flex-shrink-0">{files.length === 1 ? getFileIcon(files[0].file) : '📎'}</span>
      <p className="flex-1 min-w-0 text-[13px] font-medium text-zinc-900 truncate">{label}</p>
      <button type="button" onClick={onReset} className="text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0 p-1">✕</button>
    </div>
  )
}

function DraftCard({
  draft, index, isCopied, isSaved, isRegening, regenFailed,
  onOpen, onCopy, onSave, onRegen,
}: {
  draft: Draft; index: number; isCopied: boolean; isSaved: boolean; isRegening: boolean; regenFailed: boolean
  onOpen: () => void; onCopy: () => void; onSave: () => void; onRegen: () => void
}) {
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 transition-colors"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-zinc-100">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{draft.angle}</span>
        <span className="text-[11px] text-zinc-300">{index + 1} of 3</span>
      </div>
      <div className="px-4 py-3.5">
        {isRegening ? (
          <div className="flex items-center gap-2 text-[13px] text-zinc-400 min-h-[80px]">
            <span className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            Writing a new angle…
          </div>
        ) : (
          <>
            <p className="text-[13px] leading-[1.7] text-zinc-800 line-clamp-5 whitespace-pre-line">
              {draft.hook || draft.preview}
            </p>
            {regenFailed && (
              <p className="mt-2 text-[12px] text-red-500">Regeneration failed. Try again.</p>
            )}
          </>
        )}
      </div>
      <div className="flex items-center border-t border-zinc-100">
        <button type="button" onClick={onOpen} className="flex-1 py-2.5 text-[12px] font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors rounded-bl-xl text-center">
          Open in Studio →
        </button>
        <div className="w-px h-5 bg-zinc-100 flex-shrink-0" />
        <button type="button" onClick={onCopy} className="px-4 py-2.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors">
          {isCopied ? 'Copied ✓' : 'Copy'}
        </button>
        <div className="w-px h-5 bg-zinc-100 flex-shrink-0" />
        <button type="button" onClick={onSave} className="px-3 py-2.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors">
          {isSaved ? 'Saved ✓' : 'Save'}
        </button>
        <div className="w-px h-5 bg-zinc-100 flex-shrink-0" />
        <button type="button" onClick={onRegen} disabled={isRegening} className="px-3 py-2.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors rounded-br-xl disabled:opacity-40">
          ↻
        </button>
      </div>
    </div>
  )
}
