'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Lens } from '@/types/domain'
import type {
  ThreadsGenerationRequest,
  ThreadsVariation,
  ThreadsWorkspaceState,
} from '@/lib/threads/types'
import type { ChannelLike } from '@/components/social-preview'
import { ThreadsStrategyPanel } from './ThreadsStrategyPanel'
import { ThreadsVariationCard } from './ThreadsVariationCard'
import { GenerationProgress } from '@/components/linkedin/GenerationProgress'
import { SourceInputPanel } from '@/components/linkedin/SourceInputPanel'
import { AlternateAnglesList } from '@/components/create/AlternateAnglesList'

interface ThreadsWorkspaceProps {
  lenses: Lens[]
  savedAudiences?: string[]
}

// Lightweight product event (matches the local convention in welcome/page.tsx).
function trackEvent(event: string, props: Record<string, unknown>) {
  console.log('[create]', event, props)
}

// Read an NDJSON variation stream and resolve the variations from `complete`.
async function readThreadsStream(response: Response): Promise<ThreadsVariation[]> {
  if (!response.ok) throw new Error('Request failed')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No stream')
  const decoder = new TextDecoder()
  let buffer = ''
  let result: ThreadsVariation[] | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      let event: { type: string; data?: unknown; message?: string }
      try { event = JSON.parse(line) } catch { continue }
      if (event.type === 'complete') {
        result = (event.data as { variations: ThreadsVariation[] }).variations
      } else if (event.type === 'error') {
        throw new Error(event.message ?? 'Generation failed')
      }
    }
  }

  if (!result) throw new Error('Generation timed out — try again.')
  return result
}

export function ThreadsWorkspace({ lenses, savedAudiences = [] }: ThreadsWorkspaceProps) {
  const [state, setState] = useState<ThreadsWorkspaceState>('setup')
  const [request, setRequest] = useState<Partial<ThreadsGenerationRequest>>({
    sourceType: 'text',
    audience:   'general_audience',
    lensIds:    [],
  })
  const [variations, setVariations]               = useState<ThreadsVariation[]>([])
  const [savedVariationIds, setSavedVariationIds] = useState<(string | null)[]>([])
  const [progressLabel, setProgressLabel]         = useState<string>('Generating...')
  const [error, setError]                         = useState<string | null>(null)
  const [threadsChannelId, setThreadsChannelId]   = useState<string | null>(null)
  const [threadsChannel,   setThreadsChannel]     = useState<ChannelLike | null>(null)
  const threadsChannelIdRef                       = useRef<string | null>(null)
  const [alternates, setAlternates]               = useState<ThreadsVariation[]>([])
  const [alternatesState, setAlternatesState]     = useState<'idle' | 'loading' | 'shown'>('idle')
  const [alternatesError, setAlternatesError]     = useState<string | null>(null)

  // Fetch Threads channel for output association + preview author data
  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.ok ? r.json() : [])
      .then((channels: Array<ChannelLike & { id: string }>) => {
        const ch = channels.find(c => c.platform === 'threads')
        if (ch) {
          setThreadsChannelId(ch.id)
          setThreadsChannel(ch)
          threadsChannelIdRef.current = ch.id
        }
      })
      .catch(() => {/* non-fatal */})
  }, [])

  const canGenerate =
    !!request.sourceContent?.trim() &&
    !!request.audience &&
    (request.audience !== 'custom' || !!request.customAudience?.trim())

  const patchRequest = useCallback((patch: Partial<ThreadsGenerationRequest>) => {
    setRequest(prev => ({ ...prev, ...patch }))
  }, [])

  const runGenerate = useCallback(async () => {
    setError(null)
    setState('generating')
    setProgressLabel('Generating...')
    setSavedVariationIds([])
    setAlternates([])
    setAlternatesState('idle')
    setAlternatesError(null)

    try {
      const response = await fetch('/api/threads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
      })
      if (!response.ok) throw new Error('Generation failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No stream')
      const decoder = new TextDecoder()

      let buffer = ''
      let receivedComplete = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          let event: { type: string; label?: string; data?: unknown; message?: string }
          try { event = JSON.parse(line) }
          catch { continue }

          if (event.type === 'progress') {
            setProgressLabel(event.label ?? 'Generating...')
          } else if (event.type === 'complete') {
            receivedComplete = true
            const { variations: generated } = event.data as { variations: ThreadsVariation[] }
            // Default output is one recommended post. Render only the anchor.
            const anchor = generated[0]
            if (!anchor?.primaryText) {
              throw new Error('Generation did not produce a usable post — try again.')
            }
            trackEvent('threads_anchor_generated', { audience: request.audience })
            setVariations([anchor])
            setSavedVariationIds([null])
            setState('result')

            const channelId = threadsChannelIdRef.current

            // Auto-save only the anchor so exactly one studio draft is created.
            fetch('/api/threads/outputs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                variation: {
                  primaryText:  anchor.primaryText,
                  hashtag:      anchor.hashtag ?? null,
                  angle:        anchor.angle,
                  openingLine:  anchor.openingLine,
                  campaignName: anchor.campaignName,
                },
                title:     anchor.campaignName,
                channelId: channelId ?? null,
              }),
            })
              .then(r => (r.ok ? (r.json() as Promise<{ id: string }>) : null))
              .catch(() => null)
              .then(result => setSavedVariationIds([result?.id ?? null]))

          } else if (event.type === 'error') {
            throw new Error(event.message ?? 'Generation failed')
          }
        }
      }

      if (!receivedComplete) {
        throw new Error('Generation timed out — try shorter source content.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('setup')
    }
  }, [request])

  const handleVariationChange = useCallback((index: number, updated: ThreadsVariation) => {
    setVariations(prev => prev.map((v, i) => (i === index ? updated : v)))
  }, [])

  // "Show alternate angles" — explicit second call seeded with the current anchor
  // body so results are genuinely distinct. Not auto-saved; failure is isolated.
  const handleShowAlternates = useCallback(async () => {
    const anchor = variations[0]
    if (!anchor) return
    setAlternatesError(null)
    setAlternatesState('loading')
    trackEvent('threads_alternates_requested', { audience: request.audience })
    try {
      const response = await fetch('/api/threads/alternates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, anchorBody: anchor.primaryText }),
      })
      const generated = await readThreadsStream(response)
      setAlternates(generated)
      setAlternatesState('shown')
    } catch (err) {
      setAlternatesError(err instanceof Error ? err.message : 'Could not load alternate angles.')
      setAlternatesState('idle')
    }
  }, [variations, request])

  const handleAlternateChange = useCallback((index: number, updated: ThreadsVariation) => {
    setAlternates(prev => prev.map((v, i) => (i === index ? updated : v)))
  }, [])

  const sidebar = (
    <div className="w-80 shrink-0 border-l border-zinc-100 overflow-y-auto">
      <ThreadsStrategyPanel
        values={request}
        lenses={lenses}
        onChange={patchRequest}
        canGenerate={canGenerate}
        onGenerate={runGenerate}
        readOnly={state !== 'setup'}
        showGenerateButton={state === 'setup'}
        savedAudiences={savedAudiences}
      />
    </div>
  )

  if (state === 'setup') {
    return (
      <div className="flex h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <SourceInputPanel
            sourceType={request.sourceType as 'url' | 'text' | 'upload' | 'clout_capture'}
            sourceContent={request.sourceContent}
            onSourceTypeChange={sourceType => patchRequest({ sourceType: sourceType as ThreadsGenerationRequest['sourceType'] })}
            onSourceContentChange={sourceContent => patchRequest({ sourceContent })}
          />
        </div>
        {sidebar}
      </div>
    )
  }

  if (state === 'generating') {
    return (
      <div className="flex h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-6 flex items-center justify-center">
          <GenerationProgress label={progressLabel} />
        </div>
        {sidebar}
      </div>
    )
  }

  // result state — one recommended anchor; alternates on demand.
  const anchor = variations[0]
  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => { setState('setup'); setVariations([]); setSavedVariationIds([]); setAlternates([]); setAlternatesState('idle') }}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            ← Start over
          </button>
        </div>

        {anchor && (
          <ThreadsVariationCard
            key={anchor.id}
            variation={anchor}
            onChange={updated => handleVariationChange(0, updated)}
            initialOutputId={savedVariationIds[0] ?? null}
            threadsChannelId={threadsChannelId}
            channel={threadsChannel}
          />
        )}

        {/* Secondary action — below the anchor, never above it */}
        {anchor && alternatesState !== 'shown' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleShowAlternates}
              disabled={alternatesState === 'loading'}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
            >
              {alternatesState === 'loading' ? 'Exploring alternate angles…' : 'Show alternate angles'}
            </button>
            {alternatesError && <p className="text-xs text-red-500">{alternatesError}</p>}
          </div>
        )}

        {/* Alternate angles — subordinate, collapsed by default */}
        <AlternateAnglesList
          alternates={alternates}
          getTitle={v => v.campaignName || v.label}
          renderCard={(v, i) => (
            <ThreadsVariationCard
              variation={v}
              onChange={updated => handleAlternateChange(i, updated)}
              initialOutputId={null}
              threadsChannelId={threadsChannelId}
              channel={threadsChannel}
            />
          )}
        />
      </div>
      {sidebar}
    </div>
  )
}
