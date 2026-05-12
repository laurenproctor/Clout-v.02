'use client'

import { useState } from 'react'
import { ImageIcon, RefreshCw, Loader2, Check, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { VisualPreview } from './VisualPreview'
import type { VisualPlatform, AspectRatio, VisualIntent } from '@/lib/visual/types/visual'

type GeneratorState = 'idle' | 'generating' | 'done' | 'error'

interface GeneratedResult {
  assetId: string
  url: string                    // preferred display URL (composedUrl if available)
  backgroundUrl?: string         // raw AI background
  composedUrl?: string | null    // final composed image (hybrid-overlay)
  templateId?: string | null     // which template was used
  visualIntent: VisualIntent | null
  prompt: string
  aspectRatio: AspectRatio
  generationGroupId: string
}

interface VisualGeneratorProps {
  content: string
  platform: VisualPlatform
  outputId?: string
  aspectRatio?: AspectRatio
  onAttach?: (assetId: string, url: string) => void
  className?: string
}

export function VisualGenerator({
  content,
  platform,
  outputId,
  aspectRatio = 'landscape',
  onAttach,
  className,
}: VisualGeneratorProps) {
  const [state, setState] = useState<GeneratorState>('idle')
  const [result, setResult] = useState<GeneratedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [promptDraft, setPromptDraft] = useState('')
  const [attached, setAttached] = useState(false)

  async function generate(params?: { promptOverride?: string; parentAssetId?: string; generationGroupId?: string }) {
    setState('generating')
    setError(null)
    setEditingPrompt(false)
    setAttached(false)

    try {
      const res = await fetch('/api/visual/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platform,
          outputId,
          aspectRatio,
          ...(params?.promptOverride    ? { promptOverride: params.promptOverride }       : {}),
          ...(params?.parentAssetId     ? { parentAssetId: params.parentAssetId }         : {}),
          ...(params?.generationGroupId ? { generationGroupId: params.generationGroupId } : {}),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as GeneratedResult
      setResult(data)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setState('error')
    }
  }

  function handleRegenerate() {
    generate({
      parentAssetId:     result?.assetId,
      generationGroupId: result?.generationGroupId,
    })
  }

  function handleEditPrompt() {
    setPromptDraft(result?.prompt ?? '')
    setEditingPrompt(true)
  }

  function handleAttach() {
    if (!result || !onAttach) return
    // Attach the best available URL: composed > original
    onAttach(result.assetId, result.composedUrl ?? result.url)
    setAttached(true)
  }

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className={cn('rounded-lg border border-zinc-200 bg-white p-5', className)}>
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700">Visual</span>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Generate a platform-optimised image using AI visual strategy derived from this content.
        </p>
        <Button size="sm" onClick={() => generate()}>
          Generate visual
        </Button>
      </div>
    )
  }

  // ── Generating ────────────────────────────────────────────────────────────
  if (state === 'generating') {
    return (
      <div className={cn('rounded-lg border border-zinc-200 bg-white p-5', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
          <span className="text-sm font-medium text-zinc-700">Generating visual...</span>
        </div>
        <div className={cn(
          'rounded-md bg-zinc-100 animate-pulse w-full',
          aspectRatio === 'square'    ? 'aspect-square'   : '',
          aspectRatio === 'landscape' ? 'aspect-video'     : '',
          aspectRatio === 'portrait'  ? 'aspect-[9/16]'   : '',
        )} />
        <p className="mt-3 text-xs text-zinc-400">
          Analysing content, designing visual strategy, generating image...
        </p>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className={cn('rounded-lg border border-red-100 bg-red-50 p-5', className)}>
        <p className="text-sm font-medium text-red-700 mb-1">Generation failed</p>
        <p className="text-xs text-red-600 mb-4">{error}</p>
        <Button size="sm" variant="outline" onClick={() => generate()}>
          Try again
        </Button>
      </div>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  return (
    <div className={cn('space-y-3', className)}>
      <VisualPreview
        url={result!.composedUrl ?? result!.url}
        backgroundUrl={result!.backgroundUrl}
        composedUrl={result!.composedUrl}
        templateId={result!.templateId}
        aspectRatio={result!.aspectRatio}
        prompt={result!.prompt}
        visualIntent={result!.visualIntent}
        assetId={result!.assetId}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {onAttach && (
          attached ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 px-3 py-1.5">
              <Check className="h-3.5 w-3.5" />
              Attached
            </span>
          ) : (
            <Button size="sm" onClick={handleAttach}>
              <Paperclip className="h-3.5 w-3.5" />
              Attach to post
            </Button>
          )
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleRegenerate}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </Button>
        <Button size="sm" variant="ghost" onClick={handleEditPrompt}>
          Edit prompt
        </Button>
      </div>

      {editingPrompt && (
        <div className="rounded-md border border-zinc-200 bg-white p-3 space-y-2">
          <p className="text-xs font-medium text-zinc-600">Edit prompt</p>
          <textarea
            className="w-full rounded border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 resize-none focus:outline-none focus:border-zinc-400"
            rows={4}
            value={promptDraft}
            onChange={e => setPromptDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => generate({ promptOverride: promptDraft, generationGroupId: result?.generationGroupId })}
            >
              Generate with this prompt
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
