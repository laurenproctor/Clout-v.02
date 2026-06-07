'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Lens } from '@/types/domain'
import type {
  InstagramGenerationRequest,
  InstagramVariation,
  InstagramWorkspaceState,
  InstagramVisualFormat,
} from '@/lib/instagram/types'
import { VisualFormatSelector } from './VisualFormatSelector'
import { InstagramStrategyPanel } from './InstagramStrategyPanel'
import { StrategyPreviewPanel } from './StrategyPreviewPanel'
import { InstagramVariationCard } from './InstagramVariationCard'
import { GenerationProgress } from '@/components/linkedin/GenerationProgress'
import { SourceInputPanel } from '@/components/linkedin/SourceInputPanel'

interface InstagramWorkspaceProps {
  lenses: Lens[]
  logoUrl: string | null
  savedAudiences?: string[]
}

export function InstagramWorkspace({ lenses, logoUrl, savedAudiences = [] }: InstagramWorkspaceProps) {
  const [state, setState] = useState<InstagramWorkspaceState>('setup')
  const [request, setRequest] = useState<Partial<InstagramGenerationRequest>>({
    visualFormat:  'let_clout_decide',
    visualStyle:   'auto',
    sourceType:    'text',
    audience:      'general_audience',
    lensIds:       [],
  })
  const [variations, setVariations]               = useState<InstagramVariation[]>([])
  const [savedVariationIds, setSavedVariationIds] = useState<(string | null)[]>([])
  const [progressLabel, setProgressLabel]         = useState<string>('Generating...')
  const [error, setError]                         = useState<string | null>(null)
  const [instagramChannelId, setInstagramChannelId] = useState<string | null>(null)
  const instagramChannelIdRef = useRef<string | null>(null)

  // Strategy preview state
  const [strategyLoading, setStrategyLoading]         = useState(false)
  const [strategyFormat, setStrategyFormat]           = useState<Exclude<InstagramVisualFormat, 'let_clout_decide'> | null>(null)
  const [strategyRationale, setStrategyRationale]     = useState<string | null>(null)
  const [acceptedFormat, setAcceptedFormat]           = useState<InstagramVisualFormat | null>(null)

  // Fetch Instagram channel for output association
  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.ok ? r.json() : [])
      .then((channels: Array<{ id: string; platform: string }>) => {
        const ig = channels.find(c => c.platform === 'instagram')
        if (ig) {
          setInstagramChannelId(ig.id)
          instagramChannelIdRef.current = ig.id
        }
      })
      .catch(() => {/* non-fatal */})
  }, [])

  const canGenerate =
    !!request.visualFormat &&
    !!request.sourceContent?.trim() &&
    !!request.intent &&
    !!request.audience &&
    (request.audience !== 'custom' || !!request.customAudience?.trim())

  const patchRequest = useCallback((patch: Partial<InstagramGenerationRequest>) => {
    setRequest(prev => ({ ...prev, ...patch }))
  }, [])

  const runGenerate = useCallback(async (overrideFormat?: InstagramVisualFormat) => {
    setError(null)
    setState('generating')
    setProgressLabel('Generating...')
    setSavedVariationIds([])

    const finalRequest = overrideFormat
      ? { ...request, visualFormat: overrideFormat }
      : request

    try {
      const response = await fetch('/api/instagram/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: finalRequest }),
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
            const { variations: generated } = event.data as { variations: InstagramVariation[] }
            setVariations(generated)
            setSavedVariationIds(new Array(generated.length).fill(null))
            setState('result')

            const channelId = instagramChannelIdRef.current

            // Auto-save all variations
            Promise.all(
              generated.map(v =>
                fetch('/api/instagram/outputs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    variation: {
                      caption:        v.caption,
                      hashtags:       v.hashtags,
                      slides:         v.slides,
                      visualPlan:     v.visualPlan,
                      intelligence:   v.intelligence,
                      campaignName:   v.campaignName,
                      resolvedFormat: v.resolvedFormat,
                      resolvedStyle:  v.resolvedStyle,
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

            // Render assets (non-blocking, async) — fire and forget per variation
            generated.forEach((v, idx) => {
              fetch('/api/visual/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  mode:            'content-derived',
                  platform:        'instagram',
                  aspectRatio:     v.visualPlan.aspectRatio === '1:1' ? 'square' : 'portrait',
                  keyIdea:         v.caption.slice(0, 200),
                  visualObjective: v.intelligence.visualNarrative,
                  includeLogo:     !!logoUrl,
                }),
              })
                .then(r => r.ok ? r.json() : null)
                .then((asset: { assetId?: string } | null) => {
                  if (asset?.assetId) {
                    setVariations(prev => prev.map((pv, i) =>
                      i === idx
                        ? { ...pv, visualAssetIds: [asset.assetId!, ...(pv.visualAssetIds ?? [])] }
                        : pv
                    ))
                  }
                })
                .catch(() => {/* non-fatal */})
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

  const handleGenerate = useCallback(async () => {
    // If "Let Clout Decide" selected, fetch strategy preview first
    if (request.visualFormat === 'let_clout_decide') {
      setError(null)
      setState('strategy_preview')
      setStrategyLoading(true)
      setStrategyFormat(null)
      setStrategyRationale(null)
      try {
        const res = await fetch('/api/instagram/strategy-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceContent: request.sourceContent }),
        })
        const data = await res.json() as { recommendedFormat?: string; rationale?: string }
        setStrategyFormat((data.recommendedFormat ?? 'educational_carousel') as Exclude<InstagramVisualFormat, 'let_clout_decide'>)
        setStrategyRationale(data.rationale ?? null)
      } catch {
        // Fall back to direct generation if preview fails
        await runGenerate()
        return
      } finally {
        setStrategyLoading(false)
      }
    } else {
      await runGenerate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, runGenerate])

  const handleAcceptStrategy = useCallback(async () => {
    if (!strategyFormat) return
    setAcceptedFormat(strategyFormat)
    await runGenerate(strategyFormat)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyFormat, runGenerate])

  const handleVariationChange = useCallback((index: number, updated: InstagramVariation) => {
    setVariations(prev => prev.map((v, i) => (i === index ? updated : v)))
  }, [])

  const sidebar = (
    <div className="w-80 shrink-0 border-l border-zinc-100 overflow-y-auto">
      <InstagramStrategyPanel
        values={request}
        lenses={lenses}
        onChange={patchRequest}
        canGenerate={canGenerate}
        onGenerate={handleGenerate}
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
          <VisualFormatSelector
            selected={request.visualFormat}
            onChange={visualFormat => patchRequest({ visualFormat })}
          />
          <SourceInputPanel
            sourceType={request.sourceType}
            sourceContent={request.sourceContent}
            onSourceTypeChange={sourceType => patchRequest({ sourceType })}
            onSourceContentChange={sourceContent => patchRequest({ sourceContent })}
          />
        </div>
        {sidebar}
      </div>
    )
  }

  if (state === 'strategy_preview') {
    return (
      <div className="flex h-full min-h-0">
        <div className="flex-1 overflow-y-auto">
          <StrategyPreviewPanel
            loading={strategyLoading}
            recommendedFormat={strategyFormat}
            rationale={strategyRationale}
            onAccept={handleAcceptStrategy}
            onBack={() => setState('setup')}
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
        {variations.map((variation, index) => (
          <InstagramVariationCard
            key={variation.id}
            variation={variation}
            onChange={updated => handleVariationChange(index, updated)}
            initialOutputId={savedVariationIds[index] ?? null}
            instagramChannelId={instagramChannelId}
            logoUrl={logoUrl}
          />
        ))}
      </div>
      {sidebar}
    </div>
  )
}
