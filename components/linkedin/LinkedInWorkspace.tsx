'use client'

import { useState, useCallback, useRef } from 'react'
import type { Lens } from '@/types/domain'
import type {
  LinkedInGenerationRequest,
  LinkedInVariation,
  PostCoaching,
  LinkedInWorkspaceState,
} from '@/lib/linkedin/types'
import { PostTypeSelector } from './PostTypeSelector'
import { SourceInputPanel } from './SourceInputPanel'
import { StrategyPanel } from './StrategyPanel'
import { GenerationProgress } from './GenerationProgress'
import { VariationCard } from './VariationCard'
import { CoachingPanel } from './CoachingPanel'

interface LinkedInWorkspaceProps {
  lenses: Lens[]
}

export function LinkedInWorkspace({ lenses }: LinkedInWorkspaceProps) {
  const [state, setState] = useState<LinkedInWorkspaceState>('setup')
  const [request, setRequest] = useState<Partial<LinkedInGenerationRequest>>({
    length: 'medium',
    audience: 'general_audience',
    lensIds: [],
    narrativeStyle: 'story',
    voiceRegister: 'warm',
    sourceType: 'text',
  })
  const [variations, setVariations] = useState<LinkedInVariation[]>([])
  const [savedVariationIds, setSavedVariationIds] = useState<(string | null)[]>([])
  const [coaching, setCoaching] = useState<PostCoaching | null>(null)
  const [progressLabel, setProgressLabel] = useState<string>('Generating...')
  const [error, setError] = useState<string | null>(null)

  const canGenerate =
    !!request.postType &&
    !!request.sourceContent?.trim() &&
    !!request.intent &&
    !!request.audience &&
    !!request.sourceType

  const handleGenerate = useCallback(async () => {
    setError(null)
    setState('generating')
    setProgressLabel('Generating...')
    setSavedVariationIds([])

    try {
      const response = await fetch('/api/linkedin/generate', {
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
          try {
            event = JSON.parse(line)
          } catch {
            continue // skip malformed JSON line
          }
          if (event.type === 'progress') {
            setProgressLabel(event.label ?? 'Generating...')
          } else if (event.type === 'complete') {
            receivedComplete = true
            const { variations: generated } = event.data as { variations: LinkedInVariation[] }
            setVariations(generated)
            setSavedVariationIds(new Array(generated.length).fill(null))
            setState('result')
            // Auto-save all variations so they appear in inbox
            Promise.all(
              generated.map(v =>
                fetch('/api/linkedin/outputs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ variation: { body: v.body, hashtags: v.hashtags } }),
                })
                  .then(r => (r.ok ? (r.json() as Promise<{ id: string }>) : null))
                  .catch(() => null)
              )
            ).then(results => {
              setSavedVariationIds(results.map(r => r?.id ?? null))
            })
          } else if (event.type === 'coaching') {
            setCoaching(event.data as PostCoaching)
          } else if (event.type === 'error') {
            throw new Error(event.message ?? 'Generation failed')
          }
        }
      }

      if (!receivedComplete) {
        throw new Error('Generation timed out — try a shorter source or fewer lenses.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('setup')
    }
  }, [request])

  const handleVariationChange = useCallback((index: number, updated: LinkedInVariation) => {
    setVariations(prev => prev.map((v, i) => (i === index ? updated : v)))
  }, [])

  const patchRequest = useCallback((patch: Partial<LinkedInGenerationRequest>) => {
    setRequest(prev => ({ ...prev, ...patch }))
  }, [])

  if (state === 'setup') {
    return (
      <div className="flex h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <PostTypeSelector
            selected={request.postType}
            onChange={postType => patchRequest({ postType })}
          />
          <SourceInputPanel
            sourceType={request.sourceType}
            sourceContent={request.sourceContent}
            onSourceTypeChange={sourceType => patchRequest({ sourceType })}
            onSourceContentChange={sourceContent => patchRequest({ sourceContent })}
          />
        </div>
        <div className="w-80 shrink-0 border-l border-zinc-100 overflow-y-auto">
          <StrategyPanel
            values={request}
            lenses={lenses}
            onChange={patchRequest}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
          />
        </div>
      </div>
    )
  }

  if (state === 'generating') {
    return (
      <div className="flex h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-6 flex items-center justify-center">
          <GenerationProgress label={progressLabel} />
        </div>
        <div className="w-80 shrink-0 border-l border-zinc-100 overflow-y-auto">
          <StrategyPanel
            values={request}
            lenses={lenses}
            onChange={patchRequest}
            canGenerate={false}
            onGenerate={handleGenerate}
            readOnly
            showGenerateButton={false}
          />
        </div>
      </div>
    )
  }

  // result state
  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {variations.map((variation, index) => (
          <VariationCard
            key={variation.id}
            variation={variation}
            onChange={updated => handleVariationChange(index, updated)}
            initialOutputId={savedVariationIds[index] ?? null}
          />
        ))}
      </div>
      <div className="w-80 shrink-0 border-l border-zinc-100 overflow-y-auto">
        {coaching ? (
          <CoachingPanel coaching={coaching} />
        ) : (
          <div className="p-4 text-xs text-zinc-400">Loading coaching insights...</div>
        )}
      </div>
    </div>
  )
}
