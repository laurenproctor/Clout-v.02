'use client'

import { useState } from 'react'
import { Download, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AspectRatio, VisualIntent } from '@/lib/visual/types/visual'

interface VisualPreviewProps {
  url: string                  // preferred display URL (composedUrl if available, else originalUrl)
  backgroundUrl?: string       // raw AI background (for display in debug accordion)
  composedUrl?: string | null  // final composed image URL (hybrid-overlay)
  templateId?: string | null   // which template was used
  aspectRatio: AspectRatio
  prompt: string
  visualIntent: VisualIntent | null
  assetId: string
  downloadSlug?: string | null // server-derived slug — used directly as download filename
  downloadName?: string        // fallback: content-derived name, slugified client-side
}

const ASPECT_CLASSES: Record<AspectRatio, string> = {
  square:    'aspect-square',
  landscape: 'aspect-video',
  portrait:  'aspect-[4/5]',
}

export function VisualPreview({
  url,
  backgroundUrl,
  composedUrl,
  templateId,
  aspectRatio,
  prompt,
  visualIntent,
  assetId,
  downloadSlug,
  downloadName,
}: VisualPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [intentExpanded, setIntentExpanded] = useState(false)

  const isComposed = !!composedUrl
  const displayUrl = composedUrl ?? url

  async function copyUrl() {
    await navigator.clipboard.writeText(displayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadImage() {
    const slug = downloadSlug
      ?? (downloadName
        ? downloadName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
        : `visual-${assetId.slice(0, 8)}`)
    const link = document.createElement('a')
    link.href = displayUrl
    link.download = `${slug}.png`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      {/* Image at correct aspect ratio */}
      <div className={cn('relative w-full bg-zinc-100', ASPECT_CLASSES[aspectRatio])}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayUrl}
          alt="Generated visual"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={downloadImage}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5 text-green-500" /> Copied</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> Copy URL</>
            )}
          </button>
          {isComposed && backgroundUrl && backgroundUrl !== displayUrl && (
            <a
              href={backgroundUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Background only
            </a>
          )}
        </div>

        {/* Prompt (truncated) */}
        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{prompt}</p>

        {/* Visual strategy accordion */}
        {visualIntent && (
          <div>
            <button
              onClick={() => setIntentExpanded(v => !v)}
              className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Visual strategy
              {intentExpanded
                ? <ChevronUp className="h-3 w-3" />
                : <ChevronDown className="h-3 w-3" />
              }
            </button>

            {intentExpanded && (
              <dl className="mt-2 space-y-1">
                {([
                  ['Attention',    visualIntent.attentionStrategy],
                  ['Emotion',      visualIntent.viewerEmotion],
                  ['Narrative',    visualIntent.narrativeFrame ?? null],
                  ['Authority',    visualIntent.authoritySignal ?? null],
                  ['Concept',      visualIntent.visualConcept],
                  ['Composition',  visualIntent.compositionStyle],
                  ['Color',        visualIntent.colorMood],
                  ['Risk',         visualIntent.creativeRisk],
                  ['Render mode',  visualIntent.renderMode],
                  ['Rationale',    visualIntent.platformRationale],
                ] as [string, string | null][])
                  .filter(([, v]) => v !== null)
                  .map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <dt className="text-[10px] font-medium text-zinc-400 shrink-0 w-20">{label}</dt>
                      <dd className="text-[10px] text-zinc-600">{value}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
