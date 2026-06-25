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
import { ThreadsPostTypeSelector } from './ThreadsPostTypeSelector'
import { GenerationProgress } from '@/components/linkedin/GenerationProgress'
import { SourceInputPanel } from '@/components/linkedin/SourceInputPanel'
import { AlternateAnglesList } from '@/components/create/AlternateAnglesList'

// Lightweight product event (matches the convention used in the LinkedIn flow).
function trackEvent(event: string, props: Record<string, unknown>) {
  console.log('[create]', event, props)
}

function looksLikeUrl(s: string): boolean {
  try { return /^https?:\/\//i.test(s.trim()) && Boolean(new URL(s.trim())) }
  catch { return false }
}

// Read an NDJSON variation stream and resolve the variations from the `complete`
// event. Throws on an `error` event or if the stream closes without completing.
async function readVariationStream(response: Response): Promise<ThreadsVariation[]> {
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

interface ThreadsWorkspaceProps {
  lenses: Lens[]
  savedAudiences?: string[]
}

export function ThreadsWorkspace({ lenses, savedAudiences = [] }: ThreadsWorkspaceProps) {
  const [state, setState] = useState<ThreadsWorkspaceState>('setup')
  const [request, setRequest] = useState<Partial<ThreadsGenerationRequest>>({
    sourceType:     'text',
    audience:       'general_audience',
    lensIds:        [],
    postType:       'single',
    narrativeStyle: undefined,
    cta:            'No CTA',
    campaignId:     null,
  })
  // One recommended anchor — never a stack.
  const [variation, setVariation]         = useState<ThreadsVariation | null>(null)
  const [savedOutputId, setSavedOutputId] = useState<string | null>(null)
  const [progressLabel, setProgressLabel] = useState<string>('Generating...')
  const [error, setError]                 = useState<string | null>(null)
  const [threadsChannelId, setThreadsChannelId] = useState<string | null>(null)
  const [threadsChannel,   setThreadsChannel]   = useState<ChannelLike | null>(null)
  const threadsChannelIdRef               = useRef<string | null>(null)

  // Secondary, on-demand "Show alternate angles". Isolated from the anchor: a
  // failure here surfaces a section-level error and never mutates the anchor.
  const [alternates, setAlternates]           = useState<ThreadsVariation[]>([])
  const [alternatesState, setAlternatesState] = useState<'idle' | 'loading' | 'shown'>('idle')
  const [alternatesError, setAlternatesError] = useState<string | null>(null)

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
    !!request.postType &&
    (request.audience !== 'custom' || !!request.customAudience?.trim()) &&
    (request.postType !== 'link' || looksLikeUrl(request.linkUrl ?? ''))

  const patchRequest = useCallback((patch: Partial<ThreadsGenerationRequest>) => {
    setRequest(prev => ({ ...prev, ...patch }))
  }, [])

  const runGenerate = useCallback(async () => {
    setError(null)
    setState('generating')
    setProgressLabel('Generating...')
    setSavedOutputId(null)
    // Reset secondary results — they belong to the previous anchor.
    setAlternates([])
    setAlternatesState('idle')
    setAlternatesError(null)

    try {
      const response = await fetch('/api/threads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // campaignId is read at the top level by the route; the new controls
        // (postType/narrativeStyle/cta/linkUrl) ride inside `request`.
        body: JSON.stringify({ request, campaignId: request.campaignId ?? null }),
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
            // Default output is one recommended post. Render only the anchor
            // (variations[0]); ignore any extras the model may have returned.
            const first = generated[0]
            if (!first?.primaryText) {
              throw new Error('Generation did not produce a usable post — try again.')
            }
            // Enrich the anchor with the selected controls so the card persists
            // them on Save/Update, and label it clearly for the result view.
            const anchor: ThreadsVariation = {
              ...first,
              label:    'Recommended Threads post',
              postType: request.postType ?? 'single',
              cta:      request.cta || undefined,
              linkUrl:  request.postType === 'link' ? request.linkUrl : undefined,
            }
            trackEvent('threads_anchor_generated', { postType: request.postType, audience: request.audience })
            setVariation(anchor)
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
                  postType:     anchor.postType ?? 'single',
                  cta:          anchor.cta ?? null,
                  linkUrl:      anchor.linkUrl ?? null,
                  selectedVisualAssetId: null,
                },
                title:      anchor.campaignName,
                channelId:  channelId ?? null,
                campaignId: request.campaignId ?? null,
              }),
            })
              .then(r => (r.ok ? (r.json() as Promise<{ id: string }>) : null))
              .catch(() => null)
              .then(result => setSavedOutputId(result?.id ?? null))

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

  // "Show alternate angles" — explicit second call seeded with the current anchor
  // body so results are genuinely distinct. Not auto-saved; failure is isolated.
  const handleShowAlternates = useCallback(async () => {
    if (!variation) return
    setAlternatesError(null)
    setAlternatesState('loading')
    trackEvent('threads_alternates_requested', { postType: request.postType })
    try {
      const response = await fetch('/api/threads/alternates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, anchorBody: variation.primaryText, campaignId: request.campaignId ?? null }),
      })
      const generated = await readVariationStream(response)
      // Carry the anchor's post type onto alternates for a coherent card.
      setAlternates(generated.map(v => ({ ...v, postType: variation.postType, cta: variation.cta, linkUrl: variation.linkUrl })))
      setAlternatesState('shown')
    } catch (err) {
      setAlternatesError(err instanceof Error ? err.message : 'Could not load alternate angles.')
      setAlternatesState('idle')
    }
  }, [variation, request])

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
          <ThreadsPostTypeSelector
            selected={request.postType}
            onChange={postType => patchRequest({ postType })}
            linkUrl={request.linkUrl}
            onLinkUrlChange={linkUrl => patchRequest({ linkUrl })}
          />
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
  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => { setState('setup'); setVariation(null); setSavedOutputId(null) }}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            ← Start over
          </button>
        </div>

        {variation && (
          <ThreadsVariationCard
            key={variation.id}
            variation={variation}
            onChange={setVariation}
            initialOutputId={savedOutputId}
            threadsChannelId={threadsChannelId}
            channel={threadsChannel}
            campaignId={request.campaignId ?? null}
          />
        )}

        {/* Secondary action — below the anchor, never above it */}
        {variation && alternatesState !== 'shown' && (
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

        {/* Alternate angles — subordinate, collapsed by default, never auto-saved */}
        <AlternateAnglesList
          alternates={alternates}
          getTitle={v => v.campaignName || v.label}
          renderCard={(v, i) => (
            <ThreadsVariationCard
              variation={v}
              onChange={updated => setAlternates(prev => prev.map((a, idx) => (idx === i ? updated : a)))}
              initialOutputId={null}
              threadsChannelId={threadsChannelId}
              channel={threadsChannel}
              campaignId={request.campaignId ?? null}
            />
          )}
        />
      </div>
      {sidebar}
    </div>
  )
}
