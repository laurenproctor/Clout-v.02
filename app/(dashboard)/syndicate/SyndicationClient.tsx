'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS } from '@/lib/syndication/types/intelligence'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import type { CardState } from './PlatformGrid'
import PlatformGrid from './PlatformGrid'
import FocusedEditView from './FocusedEditView'
import { LoadingPhaseIndicator, LOADING_STEPS } from './LoadingPhaseIndicator'
import { IntelligenceSection } from './IntelligenceSection'

const ALL_PLATFORMS: Platform[] = ['x', 'linkedin', 'substack', 'blog']

type UIState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'partial' | 'complete' }
  | { status: 'error'; message: string }

interface FocusedCard {
  platform: Platform
  content: string
}

export function SyndicationClient() {
  const [input, setInput] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['x', 'linkedin', 'substack', 'blog'])
  const [ui, setUi] = useState<UIState>({ status: 'idle' })
  const [cards, setCards] = useState<Partial<Record<Platform, CardState>>>({})
  const [focused, setFocused] = useState<FocusedCard | null>(null)
  const [sourceVisible, setSourceVisible] = useState(false)
  const [intelligence, setIntelligence] = useState<SyndicationIntelligence | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isRunning = ui.status === 'running'
  const hasResults = ui.status === 'partial' || ui.status === 'complete'
  const isComplete = ui.status === 'complete'

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform],
    )
  }

  async function handleGenerate() {
    if (!input.trim() || selectedPlatforms.length === 0 || isRunning) return

    setIntelligence(null)
    setUi({ status: 'running' })
    setCards(
      Object.fromEntries(selectedPlatforms.map(p => [p, { status: 'loading' as const }])),
    )
    setFocused(null)
    setSourceVisible(false)
    setLoadingStep(0)
    intervalRef.current = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1))
    }, 1200)

    try {
      const res = await fetch('/api/syndication/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          platforms: selectedPlatforms,
        }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

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
          const trimmed = line.trim()
          if (!trimmed) continue
          let frame: Record<string, unknown>
          try {
            frame = JSON.parse(trimmed)
          } catch {
            continue
          }

          if (frame.type === 'intelligence') {
            setIntelligence(frame.data as SyndicationIntelligence)
          } else if (frame.type === 'output') {
            const platform = frame.platform as Platform
            const content = frame.content as string
            setCards(prev => ({ ...prev, [platform]: { status: 'done', content } }))
            setUi({ status: 'partial' })
          } else if (frame.type === 'platform_error') {
            const platform = frame.platform as Platform
            setCards(prev => ({
              ...prev,
              [platform]: { status: 'error', message: frame.message as string },
            }))
          } else if (frame.type === 'complete') {
            receivedComplete = true
            stopInterval()
            setUi({ status: 'complete' })
          } else if (frame.type === 'error') {
            const err = frame.error as { message: string }
            stopInterval()
            setUi({ status: 'error', message: err.message })
          }
        }
      }

      if (!receivedComplete) {
        stopInterval()
        setUi(prev =>
          prev.status === 'partial' || prev.status === 'complete' || prev.status === 'error'
            ? prev
            : { status: 'error', message: 'Generation timed out or was interrupted. Please try again.' }
        )
      }
    } catch {
      stopInterval()
      setUi({ status: 'error', message: 'Something went wrong. Check the URL and try again.' })
    }
  }

  function handleReset() {
    stopInterval()
    setInput('')
    setUi({ status: 'idle' })
    setCards({})
    setFocused(null)
    setIntelligence(null)
    setLoadingStep(0)
  }

  async function handleRegenerate(platform: Platform) {
    if (!input.trim()) return
    setCards(prev => ({ ...prev, [platform]: { status: 'loading' } }))
    if (focused?.platform === platform) setFocused(null)

    try {
      const res = await fetch('/api/syndication/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          platforms: [platform],
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
            setCards(prev => ({ ...prev, [platform]: { status: 'done', content } }))
          }
        }
      }
    } catch {
      setCards(prev => ({
        ...prev,
        [platform]: { status: 'error', message: 'Regeneration failed. Try again.' },
      }))
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => null)
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-12">

        {/* Heading */}
        <div className="mb-10">
          <h1 className="text-2xl font-medium text-zinc-900 leading-tight mb-2">Syndication Engine</h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">
            Drop a URL and get ready-to-post content for every platform.
          </p>
        </div>

        {/* Input section */}
        <div className="space-y-5 pb-8 border-b border-zinc-100 mb-8">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isRunning}
            placeholder="Drop a URL."
            rows={3}
            className={cn(
              'w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-300 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-0',
              'disabled:opacity-50 transition-opacity',
            )}
          />

          {/* Platform toggles */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map(platform => (
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

          {/* Generate button + loading indicator */}
          <div>
            <button
              onClick={handleGenerate}
              disabled={isRunning || !input.trim() || selectedPlatforms.length === 0}
              className={cn(
                'rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors',
                'hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {isRunning ? 'Generating…' : 'Generate Posts'}
            </button>

            {isRunning && (
              <div className="mt-3">
                <LoadingPhaseIndicator stepIndex={loadingStep} />
              </div>
            )}

            {hasResults && !isRunning && (
              <button
                onClick={handleReset}
                className="mt-3 block text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Start over
              </button>
            )}
          </div>

          {ui.status === 'error' && (
            <p className="text-xs text-red-500">{ui.message}</p>
          )}
        </div>

        {/* Results */}
        {hasResults && (
          <div className="space-y-6">

            {/* Intelligence section */}
            {isComplete && intelligence && (
              <IntelligenceSection intelligence={intelligence} />
            )}

            {/* Source accordion */}
            <div className="border border-zinc-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setSourceVisible(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <span className="font-medium">Source URL</span>
                <span>{sourceVisible ? '▲' : '▼'}</span>
              </button>
              {sourceVisible && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap line-clamp-6">{input}</p>
                </div>
              )}
            </div>

            {/* Platform versions */}
            <div className="border-t border-zinc-100 pt-6">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-4">Platform Posts</p>

              {focused ? (
                <FocusedEditView
                  platform={focused.platform}
                  content={focused.content}
                  onChange={content => setFocused({ ...focused, content })}
                  onCopy={() => copyToClipboard(focused.content)}
                  onRegenerate={() => handleRegenerate(focused.platform)}
                  onBack={() => setFocused(null)}
                />
              ) : (
                <PlatformGrid
                  platforms={selectedPlatforms}
                  cards={cards}
                  intelligence={intelligence}
                  onFocus={(platform, content) => setFocused({ platform, content })}
                  onCopy={copyToClipboard}
                  onRegenerate={handleRegenerate}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
