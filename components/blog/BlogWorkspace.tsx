'use client'

import { useState, useCallback } from 'react'
import type { Lens } from '@/types/domain'
import type { BlogGenerationRequest, NarrativeStrategy, HookExploration, GeneratedBlogPackage } from '@/lib/blog/types'
import { BlogLeftPanel } from './BlogLeftPanel'
import { GenerationProgress } from './GenerationProgress'
import { NarrativeStrategyCard } from './NarrativeStrategyCard'
import { HookExplorationCard } from './HookExplorationCard'
import { NarrativeReviewActions } from './NarrativeReviewActions'
import { BlogArticleEditor } from './BlogArticleEditor'
import { DistributionCards } from './DistributionCards'
import { StrategicInsightsPanel } from './StrategicInsightsPanel'
import { ContentAnalysisPanel } from './ContentAnalysisPanel'

type WorkspaceState =
  | 'setup'
  | 'generating:phase1-3'
  | 'narrative-review'
  | 'generating:phase4-10'
  | 'result'

interface ProgressEvent {
  phase: string
  label: string
}

interface BlogWorkspaceProps {
  lenses: Lens[]
}

export function BlogWorkspace({ lenses }: BlogWorkspaceProps) {
  const [state, setState] = useState<WorkspaceState>('setup')
  const [request, setRequest] = useState<BlogGenerationRequest | null>(null)
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([])
  const [narrativeStrategy, setNarrativeStrategy] = useState<NarrativeStrategy | null>(null)
  const [hookExploration, setHookExploration] = useState<HookExploration | null>(null)
  const [selectedHeadline, setSelectedHeadline] = useState<string>('')
  const [blogPackage, setBlogPackage] = useState<GeneratedBlogPackage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addProgress = useCallback((phase: string, label: string) => {
    setProgressEvents(prev => [...prev, { phase, label }])
  }, [])

  const handleGenerate = useCallback(async (req: BlogGenerationRequest) => {
    setRequest(req)
    setError(null)
    setProgressEvents([])
    setState('generating:phase1-3')

    try {
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: req }),
      })

      if (!response.ok) throw new Error('Generation failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No stream')
      const decoder = new TextDecoder()

      let buffer = ''
      let receivedPaused = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            if (event.type === 'progress') {
              addProgress(event.phase, event.label)
            } else if (event.type === 'phase-complete') {
              if (event.phase === 'narrative-strategy') setNarrativeStrategy(event.data)
              if (event.phase === 'hook-exploration') setHookExploration(event.data)
            } else if (event.type === 'paused') {
              receivedPaused = true
              setState('narrative-review')
            } else if (event.type === 'error') {
              throw new Error(event.message ?? 'Generation failed')
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Generation failed') {
              // skip malformed lines
            } else {
              throw parseErr
            }
          }
        }
      }

      if (!receivedPaused) {
        throw new Error('Generation timed out. The request took too long — try a shorter keyword or fewer lenses.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('setup')
    }
  }, [addProgress])

  const handleContinue = useCallback(async (
    editedStrategy: NarrativeStrategy,
    headline: string
  ) => {
    if (!request || !hookExploration) return
    setNarrativeStrategy(editedStrategy)
    setSelectedHeadline(headline)
    setError(null)
    setProgressEvents(prev => [...prev, { phase: 'continue', label: 'Generating article...' }])
    setState('generating:phase4-10')

    try {
      const response = await fetch('/api/blog/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request,
          narrativeStrategy: editedStrategy,
          hookExploration,
          selectedHeadline: headline,
        }),
      })

      if (!response.ok) throw new Error('Article generation failed')

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
          try {
            const event = JSON.parse(line)
            if (event.type === 'progress') {
              addProgress(event.phase, event.label)
            } else if (event.type === 'complete') {
              receivedComplete = true
              setBlogPackage(event.data)
              setState('result')
            } else if (event.type === 'error') {
              throw new Error(event.message ?? 'Generation failed')
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Generation failed') {
              // skip malformed lines
            } else {
              throw parseErr
            }
          }
        }
      }

      if (!receivedComplete) {
        throw new Error('Article generation timed out. The full pipeline exceeds the 60s limit — try a shorter article length.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('narrative-review')
    }
  }, [request, hookExploration, addProgress])

  const handleRegenerateSection = useCallback(async (sectionIndex: number) => {
    if (!request || !narrativeStrategy || !blogPackage) return

    try {
      const res = await fetch('/api/blog/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request,
          narrativeStrategy,
          sectionIndex,
          outline: blogPackage.article.outline,
          articleMarkdown: blogPackage.article.markdown,
          selectedHeadline,
        }),
      })
      if (!res.ok) return
      const { markdown: newSection } = await res.json()

      // Patch the section in the markdown (simple: find and replace the section heading block)
      setBlogPackage(prev => {
        if (!prev) return prev
        const outline = prev.article.outline
        const section = outline[sectionIndex]
        if (!section) return prev

        const headingMark = section.level === 'h2' ? '##' : '###'
        const pattern = new RegExp(
          `(${headingMark}\\s+${section.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=\\n${headingMark}\\s|$)`,
          'i'
        )
        const updatedMarkdown = prev.article.markdown.replace(pattern, newSection + '\n\n')
        return {
          ...prev,
          article: { ...prev.article, markdown: updatedMarkdown },
        }
      })
    } catch {
      // non-fatal
    }
  }, [request, narrativeStrategy, blogPackage, selectedHeadline])

  const isGenerating = state === 'generating:phase1-3' || state === 'generating:phase4-10'

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Left Panel */}
      <div className="w-64 shrink-0 border-r border-zinc-100 overflow-y-auto">
        <BlogLeftPanel
          lenses={lenses}
          onGenerate={handleGenerate}
          disabled={isGenerating}
        />
      </div>

      {/* Center Panel */}
      <div className="flex-1 overflow-y-auto px-8 py-6 min-w-0">
        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {state === 'setup' && (
          <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
            Fill in your details and click Generate to begin.
          </div>
        )}

        {(isGenerating || state === 'narrative-review' || state === 'result') && progressEvents.length > 0 && (
          <div className="mb-6">
            <GenerationProgress events={progressEvents} state={state} />
          </div>
        )}

        {(state === 'narrative-review' || state === 'generating:phase4-10' || state === 'result') && narrativeStrategy && (
          <div className="mb-4">
            <NarrativeStrategyCard
              strategy={narrativeStrategy}
              editable={state === 'narrative-review'}
              onChange={setNarrativeStrategy}
            />
          </div>
        )}

        {(state === 'narrative-review' || state === 'generating:phase4-10' || state === 'result') && hookExploration && (
          <div className="mb-4">
            <HookExplorationCard
              exploration={hookExploration}
              selectedHeadline={selectedHeadline}
              onSelect={setSelectedHeadline}
              editable={state === 'narrative-review'}
            />
          </div>
        )}

        {state === 'narrative-review' && narrativeStrategy && hookExploration && (
          <div className="mb-6">
            <NarrativeReviewActions
              onContinue={(headline) => handleContinue(narrativeStrategy, headline)}
              selectedHeadline={selectedHeadline}
            />
          </div>
        )}

        {state === 'result' && blogPackage && (
          <div className="mt-6">
            <BlogArticleEditor
              blogPackage={blogPackage}
              onRegenerateSection={handleRegenerateSection}
            />
            <div className="mt-6">
              <DistributionCards distribution={blogPackage.distribution} />
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      {(state === 'result') && blogPackage && (
        <div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-4 py-6">
          <StrategicInsightsPanel insights={blogPackage.strategicInsights} />
          <div className="mt-6">
            <ContentAnalysisPanel analysis={blogPackage.contentAnalysis} />
          </div>
        </div>
      )}
    </div>
  )
}
