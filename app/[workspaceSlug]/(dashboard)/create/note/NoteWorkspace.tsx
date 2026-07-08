'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Lens } from '@/types/domain'
import type { NoteGenerationRequest, NoteVariation } from '@/lib/note/types'
import { GenerationProgress } from '@/components/linkedin/GenerationProgress'
import { SourceInputPanel } from '@/components/linkedin/SourceInputPanel'
import { NoteVariationCard } from '@/components/note/NoteVariationCard'
import { CampaignSelect } from '@/components/create/CampaignSelect'

type WorkspaceState = 'setup' | 'generating' | 'result'

type ConnectedChannel = { id: string; platform: string }

interface NoteWorkspaceProps {
  lenses: Lens[]
  savedAudiences?: string[]
}

const pillBase = 'text-xs rounded-full px-3 py-1.5 transition-colors cursor-pointer border'

function Pill({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        pillBase,
        selected
          ? 'bg-zinc-900 text-white border-zinc-900'
          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

const AUDIENCES = [
  { value: 'founders',         label: 'Founders' },
  { value: 'marketers',        label: 'Marketers' },
  { value: 'operators',        label: 'Operators' },
  { value: 'engineers',        label: 'Engineers' },
  { value: 'investors',        label: 'Investors' },
  { value: 'general_audience', label: 'General Audience' },
]

export function NoteWorkspace({ lenses, savedAudiences = [] }: NoteWorkspaceProps) {
  const [state, setState]                 = useState<WorkspaceState>('setup')
  const [request, setRequest]             = useState<Partial<NoteGenerationRequest>>({
    sourceType:   'text',
    audience:     'general_audience',
    lensIds:      [],
    campaignId:   null,
  })
  const [variations, setVariations]               = useState<NoteVariation[]>([])
  const [savedVariationIds, setSavedVariationIds] = useState<(string | null)[]>([])
  const [progressLabel, setProgressLabel]         = useState<string>('Generating...')
  const [error, setError]                         = useState<string | null>(null)
  const [channels, setChannels]                   = useState<ConnectedChannel[]>([])
  const [showAdvanced, setShowAdvanced]           = useState(false)

  const channelsRef = useRef<ConnectedChannel[]>([])

  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.ok ? r.json() : [])
      .then((ch: ConnectedChannel[]) => {
        setChannels(ch)
        channelsRef.current = ch
      })
      .catch(() => {/* non-fatal */})
  }, [])

  const canGenerate =
    !!request.sourceContent?.trim() &&
    !!request.audience &&
    (request.audience !== 'custom' || !!request.customAudience?.trim())

  const patchRequest = useCallback((patch: Partial<NoteGenerationRequest>) => {
    setRequest(prev => ({ ...prev, ...patch }))
  }, [])

  const runGenerate = useCallback(async () => {
    setError(null)
    setState('generating')
    setProgressLabel('Generating...')
    setSavedVariationIds([])

    try {
      const response = await fetch('/api/note/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // campaignId is read at the top level by the route.
        body:    JSON.stringify({ request, campaignId: request.campaignId ?? null }),
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
            const { variations: generated } = event.data as { variations: NoteVariation[] }
            setVariations(generated)
            setSavedVariationIds(new Array(generated.length).fill(null))
            setState('result')

            // Auto-save all variations as drafts
            Promise.all(
              generated.map(v =>
                fetch('/api/note/outputs', {
                  method:  'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body:    JSON.stringify({ variation: { body: v.body, register: v.register, wordCount: v.wordCount }, campaignId: request.campaignId ?? null }),
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

      if (!receivedComplete) throw new Error('Generation timed out — try shorter source content.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('setup')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  // Keyboard shortcut: ⌘↵ to generate
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (canGenerate && state === 'setup') runGenerate()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, state])

  function toggleLens(lensId: string) {
    const current = request.lensIds ?? []
    patchRequest({
      lensIds: current.includes(lensId)
        ? current.filter(id => id !== lensId)
        : [...current, lensId],
    })
  }

  const sidebar = (
    <div className="w-80 shrink-0 border-l border-zinc-100 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Audience */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Audience</p>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map(item => (
              <Pill
                key={item.value}
                selected={request.audience === item.value}
                onClick={() => state === 'setup' && patchRequest({ audience: item.value, customAudience: undefined })}
                disabled={state !== 'setup'}
              >
                {item.label}
              </Pill>
            ))}
            {savedAudiences
              .filter(saved => !AUDIENCES.some(a => a.label.toLowerCase() === saved.toLowerCase()))
              .map(saved => (
                <Pill
                  key={saved}
                  selected={request.audience === 'custom' && request.customAudience === saved}
                  onClick={() => state === 'setup' && patchRequest({ audience: 'custom', customAudience: saved })}
                  disabled={state !== 'setup'}
                >
                  {saved}
                </Pill>
              ))}
            <Pill
              selected={request.audience === 'custom' && !savedAudiences.some(s => s === request.customAudience)}
              onClick={() => state === 'setup' && patchRequest({ audience: 'custom', customAudience: '' })}
              disabled={state !== 'setup'}
            >
              Custom…
            </Pill>
          </div>
          {request.audience === 'custom' && (
            <input
              type="text"
              value={request.customAudience ?? ''}
              onChange={e => state === 'setup' && patchRequest({ customAudience: e.target.value })}
              placeholder="e.g. B2B SaaS founders exploring AI tooling"
              disabled={state !== 'setup'}
              className="mt-2 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
            />
          )}
        </div>

        {/* Lenses (advanced toggle) */}
        {lenses.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              {showAdvanced ? '− Advanced' : '+ Advanced'}
            </button>
            {showAdvanced && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Lenses</p>
                <div className="flex flex-wrap gap-2">
                  {lenses.map(lens => (
                    <Pill
                      key={lens.id}
                      selected={(request.lensIds ?? []).includes(lens.id)}
                      onClick={() => state === 'setup' && toggleLens(lens.id)}
                      disabled={state !== 'setup'}
                    >
                      {lens.name}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Campaign — optional attribution */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Campaign</p>
          <CampaignSelect
            value={request.campaignId ?? null}
            onChange={id => state === 'setup' && patchRequest({ campaignId: id })}
            disabled={state !== 'setup'}
          />
        </div>
      </div>

      {state === 'setup' && (
        <div className="p-4 border-t border-zinc-100">
          <button
            onClick={runGenerate}
            disabled={!canGenerate}
            className="w-full bg-zinc-900 text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>Generate Note</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px] font-mono text-zinc-400">⌘↵</kbd>
          </button>
        </div>
      )}
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
            onSourceTypeChange={sourceType => patchRequest({ sourceType: sourceType as NoteGenerationRequest['sourceType'] })}
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
          <NoteVariationCard
            key={variation.id}
            variation={variation}
            onChange={updated => setVariations(prev => prev.map((v, i) => i === index ? updated : v))}
            initialOutputId={savedVariationIds[index] ?? null}
            channels={channels}
          />
        ))}
      </div>
      {sidebar}
    </div>
  )
}
