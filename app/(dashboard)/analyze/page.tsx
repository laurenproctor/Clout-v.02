'use client'

import { useState, useRef } from 'react'
import { SyndicateResults } from '@/components/syndicate/SyndicateResults'
import type { SyndicateAnalysisResult, AnalysisPhase } from '@/lib/syndicate/types/analysis'
import { ANALYSIS_PHASE_LABELS } from '@/lib/syndicate/types/analysis'
import { cn } from '@/lib/utils'

type UIState =
  | { status: 'idle' }
  | { status: 'analyzing'; phase: AnalysisPhase; label: string }
  | { status: 'done'; result: SyndicateAnalysisResult }
  | { status: 'error'; message: string }

const PLACEHOLDER_EXAMPLES = [
  'Link to post',
]

export default function SyndicatePage() {
  const [url, setUrl] = useState('')
  const [ui, setUi] = useState<UIState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const placeholder = PLACEHOLDER_EXAMPLES[0]

  async function handleAnalyze() {
    const trimmed = url.trim()
    if (!trimmed) return

    setUi({ status: 'analyzing', phase: 'extracting', label: ANALYSIS_PHASE_LABELS.extracting })

    try {
      const res = await fetch('/api/syndicate/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
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
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          let frame: Record<string, unknown>
          try {
            frame = JSON.parse(trimmedLine)
          } catch {
            continue
          }

          if (frame.type === 'progress') {
            setUi({
              status: 'analyzing',
              phase: frame.phase as AnalysisPhase,
              label: frame.label as string,
            })
          } else if (frame.type === 'result') {
            setUi({ status: 'done', result: frame.data as SyndicateAnalysisResult })
          } else if (frame.type === 'error') {
            const err = frame.error as { message: string }
            setUi({ status: 'error', message: err.message })
          }
        }
      }
    } catch {
      setUi({ status: 'error', message: "Something went wrong. Check the URL and try again." })
    }
  }

  function handleReset() {
    setUrl('')
    setUi({ status: 'idle' })
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const isAnalyzing = ui.status === 'analyzing'
  const isDone = ui.status === 'done'

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12">

        {/* Header */}
        {!isDone && (
          <div className="mb-10">
            <h1 className="text-2xl font-medium text-zinc-900 leading-tight mb-2">
              Analyze Narrative Structure
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-md">
              Understand why content resonates through persuasion mechanics, audience psychology, narrative flow, and structural analysis.
            </p>
          </div>
        )}

        {/* Input area */}
        {!isDone && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && handleAnalyze()}
                placeholder={placeholder}
                disabled={isAnalyzing}
                className={cn(
                  'flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300',
                  'focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-0',
                  'disabled:opacity-50 transition-opacity',
                )}
                autoFocus
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !url.trim()}
                className={cn(
                  'rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors',
                  'hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {isAnalyzing ? 'Analyzing…' : 'Analyze'}
              </button>
            </div>

            {/* Progress indicator */}
            {isAnalyzing && (
              <div className="flex items-center gap-2.5 pl-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse" />
                <p className="text-xs text-zinc-400">{(ui as { label: string }).label}</p>
              </div>
            )}

            {/* Error */}
            {ui.status === 'error' && ui.message === 'LOW_SIGNAL' ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-sm font-medium text-amber-900">Not enough content to syndicate.</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Syndicate works best with substantive long-form content — articles, essays, blog posts, newsletters, or transcripts. For best results, your content should:
                </p>
                <ul className="space-y-1">
                  {[
                    'Be at least 300–500 words',
                    'Contain a clear idea, argument, or narrative',
                    'Be publicly accessible (not paywalled or login-gated)',
                    'Live at a direct URL to the full piece',
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-amber-800">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : ui.status === 'error' ? (
              <p className="text-xs text-red-500 pl-0.5">{ui.message}</p>
            ) : null}
          </div>
        )}

        {/* Results */}
        {isDone && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <button
                onClick={handleReset}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                ← Analyze another
              </button>
              <p className="text-xs text-zinc-300 font-mono truncate max-w-xs">{url}</p>
            </div>
            <SyndicateResults result={(ui as { result: SyndicateAnalysisResult }).result} />
          </div>
        )}
      </div>
    </div>
  )
}
