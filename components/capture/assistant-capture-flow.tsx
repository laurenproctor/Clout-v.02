'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InferredIntent, Lens, OutputFormat } from '@/types/domain'
import { GeneratingAsBar } from '@/components/shared/generating-as-bar'

const PLACEHOLDERS = [
  'I think most AI products optimize for speed instead of trust.',
  'Notes from today\'s founder conversation.',
  'Thoughts on loneliness and remote work.',
  'I\'m trying to understand why this launch failed.',
  'A contrarian take on productivity culture.',
  'What modern work gets wrong about creativity.',
  'Thoughts I want to capture before I lose them.',
  'Draft a thread about product positioning.',
]

const FORMAT_OPTIONS: OutputFormat[] = ['post', 'thread', 'newsletter', 'article', 'note']

type FlowState = 'idle' | 'inferring' | 'streaming' | 'done' | 'error'

interface AssistantCaptureFlowProps {
  lenses: Lens[]
  selectedLensId: string | null
  onLensChange: (id: string) => void
  profileName: string | null
  onComplete: (outputId: string) => void
  onError: (msg: string) => void
}

export function AssistantCaptureFlow({
  lenses,
  selectedLensId,
  onLensChange,
  profileName,
  onComplete,
  onError,
}: AssistantCaptureFlowProps) {
  const [text, setText] = useState('')
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [intent, setIntent] = useState<InferredIntent | null>(null)
  const [overrides, setOverrides] = useState<Partial<Pick<InferredIntent, 'isPrivate' | 'outputFormat'>>>({})
  const [streamedContent, setStreamedContent] = useState('')
  const [outputId, setOutputId] = useState<string | null>(null)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inferDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPrivate = overrides.isPrivate ?? intent?.isPrivate ?? false
  const outputFormat: OutputFormat = (overrides.outputFormat ?? intent?.outputFormat ?? 'post') as OutputFormat

  // Rotate placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderVisible(false)
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length)
        setPlaceholderVisible(true)
      }, 400)
    }, 3800)
    return () => clearInterval(interval)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(180, el.scrollHeight)}px`
  }, [text])

  // Debounced intent inference
  const runInference = useCallback(
    (value: string) => {
      if (inferDebounce.current) clearTimeout(inferDebounce.current)
      if (value.length < 20) {
        setIntent(null)
        return
      }
      inferDebounce.current = setTimeout(async () => {
        setFlowState('inferring')
        try {
          const res = await fetch('/api/capture/infer-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: value, profileName }),
          })
          if (res.ok) {
            const data = await res.json() as InferredIntent
            setIntent(data)
            setOverrides({})
          }
        } catch {
          // inference failure is silent — pills just don't appear
        } finally {
          setFlowState('idle')
        }
      }, 1500)
    },
    [profileName]
  )

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    runInference(e.target.value)
  }

  async function handleCreate(savePrivate: boolean) {
    if (!text.trim() || flowState === 'streaming') return
    setFlowState('streaming')
    setStreamedContent('')

    const effectiveOverrides = savePrivate ? { ...overrides, isPrivate: true } : overrides

    try {
      const res = await fetch('/api/assistant/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          lensId: selectedLensId,
          profileName,
          overrides: effectiveOverrides,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Failed to start generation')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line) as { type: string; text?: string; outputId?: string; error?: string }
            if (msg.type === 'meta' && msg.outputId) {
              setOutputId(msg.outputId)
            } else if (msg.type === 'delta' && msg.text) {
              setStreamedContent((prev) => prev + msg.text)
            } else if (msg.type === 'done' && msg.outputId) {
              setFlowState('done')
              onComplete(msg.outputId)
              return
            } else if (msg.type === 'error') {
              throw new Error(msg.error ?? 'Generation failed')
            }
          } catch (parseErr) {
            // malformed line — ignore
          }
        }
      }
    } catch (err) {
      setFlowState('error')
      onError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const effectiveIntent = intent ? { ...intent, ...overrides } : null
  const showUnderstanding = effectiveIntent !== null && flowState !== 'streaming' && flowState !== 'done'
  const canCreate = text.trim().length > 0 && flowState !== 'streaming'
  const isStreaming = flowState === 'streaming'

  return (
    <div className="flex flex-col gap-4">
      <GeneratingAsBar
        lenses={lenses}
        selectedLensId={selectedLensId ?? ''}
        profileName={profileName}
        onLensChange={onLensChange}
        readOnly={isStreaming}
      />

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          disabled={isStreaming}
          className={cn(
            'w-full resize-none rounded-lg border border-zinc-200 bg-white px-4 py-3',
            'text-[15px] leading-[1.7] text-zinc-900 placeholder-transparent',
            'focus:outline-none focus:ring-1 focus:ring-zinc-300',
            'transition-colors disabled:opacity-60',
            'min-h-[180px]'
          )}
          style={{ height: 'auto' }}
        />
        {/* Rotating placeholder */}
        {!text && (
          <span
            className={cn(
              'pointer-events-none absolute left-4 top-3 text-[15px] leading-[1.7] text-zinc-400 transition-opacity duration-300',
              placeholderVisible ? 'opacity-100' : 'opacity-0'
            )}
          >
            {PLACEHOLDERS[placeholderIdx]}
          </span>
        )}
      </div>

      {/* Understanding preview */}
      {showUnderstanding && effectiveIntent && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Format pill */}
          <span className="text-[11px] uppercase tracking-wide text-zinc-400 mr-1">Detected</span>
          <FormatPill
            value={outputFormat}
            confidence={effectiveIntent.confidence.format}
            onChange={(v) => setOverrides((o) => ({ ...o, outputFormat: v }))}
          />
          <PrivacyPill
            isPrivate={isPrivate}
            confidence={effectiveIntent.confidence.privacy}
            onChange={(v) => setOverrides((o) => ({ ...o, isPrivate: v }))}
          />
          {effectiveIntent.suggestedChannel && effectiveIntent.publishIntent && (
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
                effectiveIntent.confidence.publishIntent > 0.65
                  ? 'border-zinc-200 bg-zinc-50 text-zinc-500'
                  : 'border-zinc-100 bg-white text-zinc-400'
              )}
            >
              {effectiveIntent.suggestedChannel}
            </span>
          )}
          {flowState === 'inferring' && (
            <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
          )}
        </div>
      )}

      {/* Streaming content preview */}
      {isStreaming && streamedContent && (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="whitespace-pre-wrap text-[14px] leading-[1.75] text-zinc-700">
            {streamedContent}
            <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-zinc-400 align-middle" />
          </p>
        </div>
      )}

      {/* Action row */}
      {!isStreaming && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleCreate(false)}
            disabled={!canCreate}
            className={cn(
              'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
              canCreate
                ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                : 'cursor-not-allowed bg-zinc-200 text-zinc-400'
            )}
          >
            ✦ Create Output
          </button>
          <button
            type="button"
            onClick={() => handleCreate(true)}
            disabled={!canCreate}
            className={cn(
              'rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
              canCreate
                ? 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                : 'cursor-not-allowed border-zinc-100 text-zinc-400'
            )}
          >
            Save Note
          </button>
        </div>
      )}

      {isStreaming && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Writing…
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormatPill({
  value,
  confidence,
  onChange,
}: {
  value: OutputFormat
  confidence: number
  onChange: (v: OutputFormat) => void
}) {
  const [open, setOpen] = useState(false)
  const dim = confidence < 0.65

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize tracking-wide transition-colors',
          dim
            ? 'border-zinc-100 bg-white text-zinc-400 hover:border-zinc-200'
            : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
        )}
      >
        {value}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 rounded-lg border border-zinc-200 bg-white py-1 shadow-md">
          {FORMAT_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { onChange(f); setOpen(false) }}
              className={cn(
                'block w-full px-3 py-1.5 text-left text-[12px] capitalize transition-colors hover:bg-zinc-50',
                f === value ? 'font-semibold text-zinc-900' : 'text-zinc-600'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PrivacyPill({
  isPrivate,
  confidence,
  onChange,
}: {
  isPrivate: boolean
  confidence: number
  onChange: (v: boolean) => void
}) {
  const dim = confidence < 0.65

  return (
    <button
      type="button"
      onClick={() => onChange(!isPrivate)}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors',
        isPrivate
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : dim
          ? 'border-zinc-100 bg-white text-zinc-400 hover:border-zinc-200'
          : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
      )}
    >
      {isPrivate ? 'Private' : 'Publish'}
    </button>
  )
}
