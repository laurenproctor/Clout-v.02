'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

type ConnectedChannel = { id: string; platform: string }
type CrosspostState = 'idle' | 'posting' | 'done' | 'error'
type CopyState = 'idle' | 'copied'

const CROSSPOST_PLATFORMS = new Set(['linkedin', 'threads', 'bluesky', 'x', 'twitter', 'mastodon'])

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  threads:  'Threads',
  bluesky:  'Bluesky',
  x:        'X',
  twitter:  'X',
  mastodon: 'Mastodon',
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

interface Props {
  draft: string
  onChange: (v: string) => void
}

export function NotePublishPanel({ draft, onChange }: Props) {
  const [savedOutputId, setSavedOutputId]     = useState<string | null>(null)
  const [saving, setSaving]                   = useState(false)
  const [channels, setChannels]               = useState<ConnectedChannel[]>([])
  const [crosspostState, setCrosspostState]   = useState<Record<string, CrosspostState>>({})
  const [copyState, setCopyState]             = useState<CopyState>('idle')
  const textareaRef                           = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(80, el.scrollHeight)}px`
  }, [draft])

  // Fetch connected channels (non-fatal)
  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.ok ? r.json() : [])
      .then((ch: ConnectedChannel[]) => setChannels(ch.filter(c => CROSSPOST_PLATFORMS.has(c.platform))))
      .catch(() => {/* non-fatal */})
  }, [])

  const wordCount = countWords(draft)
  const wordWarning = wordCount < 10 || wordCount > 200

  // Lazy save: creates the output row only when user acts
  async function ensureSaved(): Promise<string | null> {
    if (savedOutputId) return savedOutputId
    setSaving(true)
    try {
      const res = await fetch('/api/note/outputs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          variation: { body: draft, register: 'observation', wordCount },
        }),
      })
      if (!res.ok) return null
      const data = await res.json() as { id: string }
      setSavedOutputId(data.id)
      return data.id
    } catch {
      return null
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2500)
    } catch {/* non-fatal */}
  }

  async function handleCrosspost(channelId: string, platform: string) {
    setCrosspostState(prev => ({ ...prev, [channelId]: 'posting' }))
    const outputId = await ensureSaved()
    if (!outputId) {
      setCrosspostState(prev => ({ ...prev, [channelId]: 'error' }))
      setTimeout(() => setCrosspostState(prev => ({ ...prev, [channelId]: 'idle' })), 3000)
      return
    }
    try {
      const res = await fetch('/api/note/crosspost', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ noteOutputId: outputId, platform, channelId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCrosspostState(prev => ({ ...prev, [channelId]: 'done' }))
    } catch {
      setCrosspostState(prev => ({ ...prev, [channelId]: 'error' }))
      setTimeout(() => setCrosspostState(prev => ({ ...prev, [channelId]: 'idle' })), 3000)
    }
  }

  return (
    <div className="space-y-3">
      {/* Word count */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Draft Note</span>
        <span className={`text-[11px] tabular-nums ${wordWarning ? 'text-amber-500' : 'text-muted-foreground'}`}>
          {wordCount} words {wordWarning && wordCount > 10 ? '(target: 50–200)' : ''}
        </span>
      </div>

      {/* Editable textarea */}
      <Textarea
        ref={textareaRef}
        value={draft}
        onChange={e => onChange(e.target.value)}
        className="min-h-[100px] bg-background text-sm resize-y"
        placeholder="Draft will appear here…"
      />

      {/* Distribution row */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Publish to</p>
        <div className="flex flex-wrap gap-2">
          {/* Copy + Substack link — no save required */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
            >
              {copyState === 'copied'
                ? <><Check className="h-3 w-3 text-green-600" /><span className="text-green-600">Copied</span></>
                : <><Copy className="h-3 w-3" />Substack</>
              }
            </button>
            <a
              href="https://substack.com/notes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Connected platform channels — lazy save on click */}
          {channels.map(ch => {
            const state = crosspostState[ch.id] ?? 'idle'
            const label = PLATFORM_LABELS[ch.platform] ?? ch.platform
            if (state === 'done') {
              return (
                <span key={ch.id} className="flex items-center gap-1 text-[11px] text-green-600">
                  <Check className="h-3 w-3" />
                  {label}
                </span>
              )
            }
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleCrosspost(ch.id, ch.platform)}
                disabled={state === 'posting' || saving}
                className="flex items-center gap-1 text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 hover:border-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {state === 'posting' ? `${label}…` : label}
                {state === 'error' && <span className="text-red-400 ml-0.5">✕</span>}
              </button>
            )
          })}

          {channels.length === 0 && (
            <a
              href="/settings/publishing"
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Connect channels to publish →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
