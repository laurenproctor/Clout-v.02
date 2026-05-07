'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Platform, SyndicationPhase } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS, PLATFORM_DESCRIPTORS } from '@/lib/syndication/types/intelligence'
import type { SyndicationLens } from '@/lib/syndication/types/lenses'

const ALL_PLATFORMS: Platform[] = ['x', 'linkedin', 'substack', 'blog']

type CardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; content: string }
  | { status: 'error'; message: string }

type UIState =
  | { status: 'idle' }
  | { status: 'running'; phase: SyndicationPhase }
  | { status: 'partial' | 'complete' }
  | { status: 'error'; message: string }

interface FocusedCard {
  platform: Platform
  content: string
}

interface Props {
  availableLenses: SyndicationLens[]
}

export function SyndicationClient({ availableLenses }: Props) {
  const [input, setInput] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['x', 'linkedin', 'substack', 'blog'])
  const [selectedLenses, setSelectedLenses] = useState<string[]>([])
  const [ui, setUi] = useState<UIState>({ status: 'idle' })
  const [cards, setCards] = useState<Partial<Record<Platform, CardState>>>({})
  const [focused, setFocused] = useState<FocusedCard | null>(null)
  const [sourceVisible, setSourceVisible] = useState(false)

  const isRunning = ui.status === 'running'
  const hasResults = ui.status === 'partial' || ui.status === 'complete'

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    )
  }

  function toggleLens(lensId: string) {
    setSelectedLenses((prev) => {
      if (prev.includes(lensId)) return prev.filter((l) => l !== lensId)
      if (prev.length >= 2) return prev
      return [...prev, lensId]
    })
  }

  async function handleGenerate() {
    if (!input.trim() || selectedPlatforms.length === 0 || isRunning) return

    setUi({ status: 'running', phase: 'extracting' })
    setCards(
      Object.fromEntries(selectedPlatforms.map((p) => [p, { status: 'loading' as const }])),
    )
    setFocused(null)
    setSourceVisible(false)

    try {
      const res = await fetch('/api/syndication/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          platforms: selectedPlatforms,
          lenses: selectedLenses,
        }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          let frame: Record<string, unknown>
          try {
            frame = JSON.parse(trimmed)
          } catch {
            continue
          }

          if (frame.type === 'progress') {
            setUi({ status: 'running', phase: frame.phase as SyndicationPhase })
          } else if (frame.type === 'output') {
            const platform = frame.platform as Platform
            const content = frame.content as string
            setCards((prev) => ({ ...prev, [platform]: { status: 'done', content } }))
            setUi({ status: 'partial' })
          } else if (frame.type === 'platform_error') {
            const platform = frame.platform as Platform
            setCards((prev) => ({
              ...prev,
              [platform]: { status: 'error', message: frame.message as string },
            }))
          } else if (frame.type === 'complete') {
            setUi({ status: 'complete' })
          } else if (frame.type === 'error') {
            const err = frame.error as { message: string }
            setUi({ status: 'error', message: err.message })
          }
        }
      }
    } catch {
      setUi({ status: 'error', message: 'Something went wrong. Check the URL and try again.' })
    }
  }

  function handleReset() {
    setInput('')
    setUi({ status: 'idle' })
    setCards({})
    setFocused(null)
    setSelectedLenses([])
  }

  async function handleRegenerate(platform: Platform) {
    if (!input.trim()) return
    setCards((prev) => ({ ...prev, [platform]: { status: 'loading' } }))
    if (focused?.platform === platform) setFocused(null)

    try {
      const res = await fetch('/api/syndication/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          platforms: [platform],
          lenses: selectedLenses,
        }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          let frame: Record<string, unknown>
          try { frame = JSON.parse(trimmed) } catch { continue }
          if (frame.type === 'output') {
            const content = frame.content as string
            setCards((prev) => ({ ...prev, [platform]: { status: 'done', content } }))
          }
        }
      }
    } catch {
      setCards((prev) => ({
        ...prev,
        [platform]: { status: 'error', message: 'Regeneration failed. Try again.' },
      }))
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => null)
  }

  const phaseLabels: Record<SyndicationPhase, string> = {
    extracting: 'Extracting content…',
    analyzing: 'Analyzing narrative intelligence…',
    generating: 'Generating platform versions…',
    complete: 'Complete',
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-5xl px-6 py-12">

        <div className="mb-10">
          <h1 className="text-2xl font-medium text-zinc-900 leading-tight mb-2">
            Syndication Engine
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">
            Turn one piece of content into platform-native versions for every major network.
          </p>
        </div>

        <div className="space-y-5 mb-8">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isRunning}
            placeholder="Paste a post, article, thread, or essay — or drop in a URL…"
            rows={4}
            className={cn(
              'w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-300 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-0',
              'disabled:opacity-50 transition-opacity',
            )}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  disabled={isRunning}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    selectedPlatforms.includes(platform)
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {PLATFORM_LABELS[platform]}
                </button>
              ))}
            </div>
          </div>

          {availableLenses.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Lenses</p>
                {selectedLenses.length === 2 && (
                  <span className="text-xs text-zinc-300">max 2 selected</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableLenses.map((lens) => {
                  const isSelected = selectedLenses.includes(lens.id)
                  const isDisabled = isRunning || (!isSelected && selectedLenses.length >= 2)
                  return (
                    <button
                      key={lens.id}
                      onClick={() => toggleLens(lens.id)}
                      disabled={isDisabled}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        isSelected
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                      )}
                    >
                      {lens.name}
                      {!lens.isPreset && (
                        <span className="ml-1 text-zinc-400">·</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isRunning || !input.trim() || selectedPlatforms.length === 0}
              className={cn(
                'rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors',
                'hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {isRunning ? 'Generating…' : 'Generate Versions'}
            </button>

            {isRunning && ui.status === 'running' && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse" />
                <span className="text-xs text-zinc-400">{phaseLabels[ui.phase]}</span>
              </div>
            )}

            {hasResults && !isRunning && (
              <button
                onClick={handleReset}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Start over
              </button>
            )}
          </div>

          {ui.status === 'error' && (
            <p className="text-xs text-red-500">{ui.message}</p>
          )}
        </div>

        {hasResults && (
          <div className="space-y-6">
            <div className="border border-zinc-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setSourceVisible((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <span className="font-medium">Source Content</span>
                <span>{sourceVisible ? '▲' : '▼'}</span>
              </button>
              {sourceVisible && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {input}
                  </p>
                </div>
              )}
            </div>

            {focused ? (
              <div className="space-y-4">
                <button
                  onClick={() => setFocused(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  ← All versions
                </button>
                <div className="rounded-lg border border-zinc-200 p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
                      {PLATFORM_LABELS[focused.platform]}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {PLATFORM_DESCRIPTORS[focused.platform]}
                    </p>
                    {selectedLenses.length > 0 && (
                      <p className="text-xs text-zinc-300 mt-1">
                        Applied: {selectedLenses.join(' + ')}
                      </p>
                    )}
                  </div>
                  <textarea
                    value={focused.content}
                    onChange={(e) => setFocused({ ...focused, content: e.target.value })}
                    rows={12}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => copyToClipboard(focused.content)}
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleRegenerate(focused.platform)}
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      Regenerate {PLATFORM_LABELS[focused.platform]} Version
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedPlatforms.map((platform) => {
                  const card = cards[platform] ?? { status: 'idle' }
                  return (
                    <PlatformCard
                      key={platform}
                      platform={platform}
                      card={card}
                      selectedLenses={selectedLenses}
                      onFocus={(content) => setFocused({ platform, content })}
                      onCopy={copyToClipboard}
                      onRegenerate={() => handleRegenerate(platform)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PlatformCard({
  platform,
  card,
  selectedLenses,
  onFocus,
  onCopy,
  onRegenerate,
}: {
  platform: Platform
  card: CardState
  selectedLenses: string[]
  onFocus: (content: string) => void
  onCopy: (text: string) => void
  onRegenerate: () => void
}) {
  const previewLines: Record<Platform, number> = {
    x: 4,
    linkedin: 6,
    substack: 10,
    blog: 8,
  }
  const lines = previewLines[platform]

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 p-4 space-y-3 flex flex-col',
        card.status === 'done' && 'cursor-pointer hover:border-zinc-400 transition-colors',
      )}
      onClick={() => card.status === 'done' && onFocus(card.content)}
    >
      <div>
        <p className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
          {PLATFORM_LABELS[platform]}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">{PLATFORM_DESCRIPTORS[platform]}</p>
        {selectedLenses.length > 0 && (
          <p className="text-xs text-zinc-300 mt-1">Applied: {selectedLenses.join(' + ')}</p>
        )}
      </div>

      {card.status === 'loading' && (
        <div className="space-y-2 flex-1">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-3 rounded bg-zinc-100 animate-pulse',
                i === lines - 1 ? 'w-2/3' : 'w-full',
              )}
            />
          ))}
        </div>
      )}

      {card.status === 'done' && (
        <>
          <p
            className="text-sm text-zinc-700 leading-relaxed flex-1"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: lines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            } as React.CSSProperties}
          >
            {card.content}
          </p>
          <div
            className="flex flex-wrap gap-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onCopy(card.content)}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Copy
            </button>
            <button
              onClick={() => onFocus(card.content)}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onRegenerate}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Regenerate {PLATFORM_LABELS[platform]} Version
            </button>
          </div>
        </>
      )}

      {card.status === 'error' && (
        <div className="space-y-2">
          <p className="text-xs text-red-500">{card.message}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate() }}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
