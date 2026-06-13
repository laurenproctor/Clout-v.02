'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { VisualControls, type VisualControlsValue } from './visual-controls'
import { VisualContext } from './visual-context'
import type { VisualIntent } from '@/lib/visual/types/visual'

// ── Types ───────────────────────────────────────────────────────────────────

interface GeneratedAsset {
  assetId: string
  url: string
  aspectRatio: string
  mode: string
  visualIntent: VisualIntent | null
  prompt: string
}

interface StoredAsset {
  id: string
  original_url: string
  aspect_ratio: string
  mode: string
  visual_intent: VisualIntent | null
  prompt: string
}

interface VisualsTabProps {
  outputId: string
  content: string
  platform: string
}

// ── Refinement presets ───────────────────────────────────────────────────────

const REFINEMENT_PRESETS = [
  { label: 'More Editorial',    reason: 'Raise formality and editorial weight. Favor asymmetric tension, restrained palette, institutional visual language. Reduce warmth and consumer cues.' },
  { label: 'More Minimal',      reason: 'Increase negative space dramatically. Reduce visual elements to a single clear focal point. Flatten and desaturate the palette.' },
  { label: 'More Emotional',    reason: 'Shift toward warmer color, softer light, and implied human presence or intimacy. Prioritize viewer emotion over information.' },
  { label: 'More Abstract',     reason: 'Move away from literal representation toward texture, form, and geometry. Reduce narrative specificity.' },
  { label: 'More Technical',    reason: 'Favor precision composition, cooler palette, structured grid, diagrammatic clarity, and authoritative visual weight.' },
  { label: 'More Branded',      reason: 'Increase alignment to brand color and tone tokens. Bring primary and accent colors to the foreground. Strengthen brand archetype.' },
  { label: 'More Social Native', reason: 'Improve scroll interruption through focal clarity, pacing, and contrast hierarchy. Stay editorial — avoid trend aesthetics, meme visuals, or hyper-saturation.' },
]

// ── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = (id: string) => `clout:visuals-settings:${id}`

const DEFAULT_CONTROLS: VisualControlsValue = {
  visualObjective: null,
  audienceFrame:   '',
  emotionalTone:   '',
  keyIdea:         '',
  aspectRatio:     'landscape',
  quality:         'standard',
  promptOverride:  '',
}

function loadFromStorage(outputId: string): VisualControlsValue {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(outputId))
    if (!raw) return DEFAULT_CONTROLS
    return { ...DEFAULT_CONTROLS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONTROLS
  }
}

function saveToStorage(outputId: string, v: VisualControlsValue) {
  try { localStorage.setItem(STORAGE_KEY(outputId), JSON.stringify(v)) } catch { /* ignore */ }
}

// ── Component ────────────────────────────────────────────────────────────────

export function VisualsTab({ outputId, content, platform }: VisualsTabProps) {
  const [controls, setControls] = useState<VisualControlsValue>(() => loadFromStorage(outputId))
  const [asset,    setAsset]    = useState<GeneratedAsset | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [error,    setError]    = useState<{ message: string; type: 'policy' | 'rate' | 'server' } | null>(null)

  const controllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => () => { controllerRef.current?.abort() }, [])

  // Load existing asset + DB session on mount
  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch(`/api/visual/assets?outputId=${outputId}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/visual/sessions?outputId=${outputId}`).then(r => r.ok ? r.json() : null),
    ]).then(([assets, session]: [StoredAsset[], Record<string, unknown> | null]) => {
      if (cancelled) return

      // Show most recent existing asset
      const latest = assets[0]
      if (latest) {
        setAsset({
          assetId:      latest.id,
          url:          latest.original_url,
          aspectRatio:  latest.aspect_ratio,
          mode:         latest.mode,
          visualIntent: latest.visual_intent,
          prompt:       latest.prompt,
        })
      }

      // Overwrite controls with DB-canonical session (DB wins over localStorage)
      if (session) {
        const fromDb: Partial<VisualControlsValue> = {
          visualObjective: (session.visual_objective as VisualControlsValue['visualObjective']) ?? null,
          audienceFrame:   (session.audience_frame  as string) ?? '',
          emotionalTone:   (session.emotional_tone  as string) ?? '',
          keyIdea:         (session.key_idea        as string) ?? '',
          aspectRatio:     (session.aspect_ratio    as VisualControlsValue['aspectRatio']) ?? 'landscape',
          quality:         (session.quality         as VisualControlsValue['quality']) ?? 'standard',
        }
        setControls(prev => ({ ...prev, ...fromDb }))
      }
    })

    return () => { cancelled = true }
  }, [outputId])

  const generate = useCallback(async (opts: { parentAssetId?: string; variationReason?: string } = {}) => {
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        outputId,
        content,
        platform:         platform || 'linkedin',
        aspectRatio:      controls.aspectRatio,
        quality:          controls.quality,
        visualObjective:  controls.visualObjective ?? undefined,
        audienceFrame:    controls.audienceFrame   || undefined,
        emotionalTone:    controls.emotionalTone   || undefined,
        keyIdea:          controls.keyIdea         || undefined,
        promptOverride:   controls.promptOverride  || undefined,
        ...opts,
      }

      const res = await fetch('/api/visual/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  controllerRef.current.signal,
      })

      const json = await res.json()

      if (!res.ok) {
        const type = res.status === 422 ? 'policy'
                   : res.status === 429 ? 'rate'
                   : 'server'
        setError({ message: json.error ?? 'Generation failed.', type })
        return
      }

      setAsset({
        assetId:      json.assetId,
        url:          json.url,
        aspectRatio:  json.aspectRatio,
        mode:         json.mode,
        visualIntent: json.visualIntent ?? null,
        prompt:       json.prompt ?? '',
      })

      // Persist settings (only on successful generation, not on directional refinements)
      if (!opts.parentAssetId) {
        saveToStorage(outputId, controls)
        fetch('/api/visual/sessions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            outputId,
            aspectRatio:     controls.aspectRatio,
            quality:         controls.quality,
            visualObjective: controls.visualObjective,
            audienceFrame:   controls.audienceFrame   || null,
            emotionalTone:   controls.emotionalTone   || null,
            keyIdea:         controls.keyIdea         || null,
            generationMode:  json.mode,
          }),
        }).catch(() => { /* non-blocking */ })
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return // cancelled — no state change
      setError({ message: 'Something went wrong. Try again.', type: 'server' })
    } finally {
      setLoading(false)
      // 3-second client-side cooldown
      setCooldown(true)
      setTimeout(() => setCooldown(false), 3000)
    }
  }, [outputId, content, platform, controls])

  const refine = useCallback((preset: typeof REFINEMENT_PRESETS[number]) => {
    if (!asset) return
    generate({ parentAssetId: asset.assetId, variationReason: preset.reason })
  }, [asset, generate])

  const disabled = loading || cooldown

  return (
    <div className="flex flex-col gap-0 overflow-y-auto flex-1">

      {/* ── Image display ─────────────────────────────────────────────── */}
      <div className="relative mx-4 mt-4 rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0" style={{ aspectRatio: '16/9' }}>
        {asset ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.url}
              alt="Generated visual"
              className={cn('w-full h-full object-cover transition-all duration-500', loading && 'blur-sm scale-105')}
            />
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/60">
                <Spinner size="lg" className="mb-2 text-zinc-300" />
                <p className="text-[11px] text-zinc-400">Building visual direction…</p>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900">
            {loading ? (
              <>
                <Spinner size="lg" className="text-zinc-400" />
                <p className="text-[11px] text-zinc-500">Building visual direction…</p>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center text-lg">✦</div>
                <p className="text-[11px] text-zinc-600 text-center px-6 leading-relaxed">
                  Shape how your ideas are perceived
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Error state ────────────────────────────────────────────────── */}
      {error && (
        <div className={cn(
          'mx-4 mt-2 rounded-md px-3 py-2 text-[11px] leading-relaxed',
          error.type === 'policy' && 'bg-amber-950/40 border border-amber-800/50 text-amber-400',
          error.type === 'rate'   && 'bg-zinc-900 border border-zinc-800 text-zinc-500',
          error.type === 'server' && 'bg-red-950/40 border border-red-800/50 text-red-400',
        )}>
          {error.message}
          {error.type === 'server' && (
            <button onClick={() => generate()} className="ml-2 underline underline-offset-2 hover:no-underline">
              Retry
            </button>
          )}
        </div>
      )}

      {/* ── Visual Context ──────────────────────────────────────────────── */}
      {asset?.visualIntent && (
        <VisualContext intent={asset.visualIntent} className="mx-4 mt-3" />
      )}

      {/* ── Directional refinement presets ─────────────────────────────── */}
      {asset && (
        <div className="mx-4 mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {REFINEMENT_PRESETS.map(p => (
              <button
                key={p.label}
                disabled={disabled}
                onClick={() => refine(p)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-medium border border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors',
                  disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            disabled={disabled}
            onClick={() => generate()}
            className={cn(
              'self-start text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors',
              disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            ↺ Rebuild
          </button>
        </div>
      )}

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="mx-4 mt-4 border-t border-zinc-800/60" />

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-4">
        <VisualControls value={controls} onChange={setControls} disabled={disabled} />

        {/* CTA */}
        <button
          disabled={disabled}
          onClick={() => generate()}
          className={cn(
            'w-full rounded-lg py-2.5 text-[12px] font-semibold transition-colors',
            'bg-zinc-100 hover:bg-white text-zinc-900',
            disabled && 'opacity-40 cursor-not-allowed',
          )}
        >
          {loading ? 'Building visual direction…' : '✦ Build visual direction'}
        </button>
      </div>

    </div>
  )
}
