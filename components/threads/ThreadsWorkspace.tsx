'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Lens } from '@/types/domain'
import type {
  ThreadsGenerationRequest,
  ThreadsVariation,
  ThreadsWorkspaceState,
} from '@/lib/threads/types'
import { ThreadsStrategyPanel } from './ThreadsStrategyPanel'
import { ThreadsVariationCard } from './ThreadsVariationCard'
import { GenerationProgress } from '@/components/linkedin/GenerationProgress'
import { SourceInputPanel } from '@/components/linkedin/SourceInputPanel'

interface ThreadsWorkspaceProps {
  lenses: Lens[]
  savedAudiences?: string[]
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
  const threadsChannelIdRef                       = useRef<string | null>(null)

  // Fetch Threads channel for output association
  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.ok ? r.json() : [])
      .then((channels: Array<{ id: string; platform: string }>) => {
        const ch = channels.find(c => c.platform === 'threads')
        if (ch) {
          setThreadsChannelId(ch.id)
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
            setVariations(generated)
            setSavedVariationIds(new Array(generated.length).fill(null))
            setState('result')

            const channelId = threadsChannelIdRef.current

            // Auto-save all variations
            Promise.all(
              generated.map(v =>
                fetch('/api/threads/outputs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    variation: {
                      primaryText:  v.primaryText,
                      hashtag:      v.hashtag ?? null,
                      angle:        v.angle,
                      openingLine:  v.openingLine,
                      campaignName: v.campaignName,
                    },
                    title:     v.campaignName,
                    channelId: channelId ?? null,
                  }),
                })
                  .then(r => (r.ok ? (r.json() as Promise<{ id: string }>) : null))
                  .catch(() => null)
              )
            ).then(results => {
              setSavedVariationIds(results.map(r => r?.id ?? null))
            })

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  const handleVariationChange = useCallback((index: number, updated: ThreadsVariation) => {
    setVariations(prev => prev.map((v, i) => (i === index ? updated : v)))
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

  // result state
  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400">{variations.length} variations generated</p>
          <button
            type="button"
            onClick={() => { setState('setup'); setVariations([]); setSavedVariationIds([]) }}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            ← Start over
          </button>
        </div>
        {variations.map((variation, index) => (
          <ThreadsVariationCard
            key={variation.id}
            variation={variation}
            onChange={updated => handleVariationChange(index, updated)}
            initialOutputId={savedVariationIds[index] ?? null}
            threadsChannelId={threadsChannelId}
          />
        ))}
      </div>
      {sidebar}
    </div>
  )
}
