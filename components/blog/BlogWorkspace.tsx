'use client'

import { useState, useCallback } from 'react'
import type { Lens } from '@/types/domain'
import type { BlogGenerationRequest, NarrativeStrategy, HookExploration, GeneratedBlogPackage } from '@/lib/blog/types'
import { StepProgressHeader } from './StepProgressHeader'
import { StrategicSetupPanel } from './StrategicSetupPanel'
import { NarrativeCard } from './NarrativeCard'
import { ArticlePreviewRail } from './ArticlePreviewRail'
import { AdvancedControlsPanel } from './AdvancedControlsPanel'
import { NarrativeStrategyCard } from './NarrativeStrategyCard'
import { GenerationProgress } from './GenerationProgress'
import { BlogArticleEditor } from './BlogArticleEditor'
import { DistributionCards } from './DistributionCards'
import { StrategicInsightsPanel } from './StrategicInsightsPanel'
import { ContentAnalysisPanel } from './ContentAnalysisPanel'

type WorkspaceState =
  | 'setup'
  | 'generating:phase1-3'
  | 'narrative-review'
  | 'generating:phase4-10'
  | 'article-review'
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
  const [request, setRequest] = useState<Partial<BlogGenerationRequest> | null>(null)
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([])
  const [narrativeStrategy, setNarrativeStrategy] = useState<NarrativeStrategy | null>(null)
  const [hookExploration, setHookExploration] = useState<HookExploration | null>(null)
  const [selectedHeadline, setSelectedHeadline] = useState<string>('')
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [blogPackage, setBlogPackage] = useState<GeneratedBlogPackage | null>(null)
  const [isSocialGenerating, setIsSocialGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addProgress = useCallback((phase: string, label: string) => {
    setProgressEvents(prev => [...prev, { phase, label }])
  }, [])

  const handleGenerate = useCallback(async (req: BlogGenerationRequest) => {
    setRequest(req)
    setError(null)
    setProgressEvents([])
    setShowAdvancedControls(false)
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
              if (req.title) setSelectedHeadline(req.title)
              setState('narrative-review')
            } else if (event.type === 'error') {
              throw new Error(event.message ?? 'Generation failed')
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) {
              // skip malformed NDJSON lines
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
              setState('article-review')
            } else if (event.type === 'error') {
              throw new Error(event.message ?? 'Generation failed')
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) {
              // skip malformed NDJSON lines
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

  const handleGenerateSocial = useCallback(async () => {
    if (!blogPackage) return
    setIsSocialGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/blog/generate-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogPackage }),
      })
      if (!res.ok) throw new Error('Social post generation failed')
      const { distribution } = await res.json()
      setBlogPackage(prev => prev ? { ...prev, distribution } : prev)
      setState('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Social post generation failed')
    } finally {
      setIsSocialGenerating(false)
    }
  }, [blogPackage])

  const isGenerating = state === 'generating:phase1-3' || state === 'generating:phase4-10'

  // Step 1: setup
  if (state === 'setup') {
    return (
      <div className="flex flex-col h-full min-h-0">
        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <StrategicSetupPanel
          lenses={lenses}
          onGenerate={handleGenerate}
          disabled={false}
        />
      </div>
    )
  }

  // Generating phase 1-3
  if (state === 'generating:phase1-3') {
    return (
      <div className="flex flex-col h-full min-h-0">
        <StepProgressHeader currentStep={1} />
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            <GenerationProgress events={progressEvents} state={state} />
          </div>
        </div>
      </div>
    )
  }

  // Step 2: narrative-review
  if (state === 'narrative-review') {
    return (
      <div className="flex flex-col h-full min-h-0">
        <StepProgressHeader currentStep={2} />
        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left column: narrative strategy + headline cards */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {narrativeStrategy && (
              <div className="mb-6">
                <NarrativeStrategyCard
                  strategy={narrativeStrategy}
                  editable={false}
                  onChange={setNarrativeStrategy}
                />
              </div>
            )}

            {hookExploration && (
              <>
                <div className="mb-3">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Choose a Narrative Direction
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{hookExploration.primaryAngle}</p>
                </div>

                <div className="space-y-3">
                  {(request?.title
                    ? [{ title: request.title, style: 'executive' as const, strength: 5, why: 'Your provided title' }, ...hookExploration.headlineOptions]
                    : hookExploration.headlineOptions
                  ).map((option, i) => (
                    <NarrativeCard
                      key={i}
                      option={option}
                      isSelected={selectedHeadline === option.title}
                      onSelect={() => setSelectedHeadline(option.title)}
                      openingHooks={hookExploration.openingHooks}
                      editable={!showAdvancedControls}
                    />
                  ))}
                </div>

                {!showAdvancedControls && selectedHeadline && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedControls(true)}
                      className="w-full bg-zinc-900 text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors"
                    >
                      Refine &amp; Generate
                    </button>
                  </div>
                )}

                {showAdvancedControls && narrativeStrategy && (
                  <div className="mt-6">
                    <AdvancedControlsPanel
                      values={request ?? {}}
                      onChange={(v) => setRequest(prev => ({ ...prev, ...v }))}
                      onGenerate={() => {
                        if (narrativeStrategy && selectedHeadline) {
                          handleContinue(narrativeStrategy, selectedHeadline)
                        }
                      }}
                      isGenerating={false}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right column: preview rail */}
          <div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-6 py-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">Article Preview</p>
            <ArticlePreviewRail
              exploration={hookExploration}
              selectedHeadline={selectedHeadline}
              request={request ?? {}}
            />
          </div>
        </div>
      </div>
    )
  }

  // Generating phase 4-10
  if (state === 'generating:phase4-10') {
    return (
      <div className="flex flex-col h-full min-h-0">
        <StepProgressHeader currentStep={3} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-md mx-auto">
              <GenerationProgress events={progressEvents} state={state} />
            </div>
          </div>
          <div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-6 py-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">Article Preview</p>
            <ArticlePreviewRail
              exploration={hookExploration}
              selectedHeadline={selectedHeadline}
              request={request ?? {}}
            />
          </div>
        </div>
      </div>
    )
  }

  // Article review state
  if (state === 'article-review' && blogPackage) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <StepProgressHeader currentStep={3} />
        <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6 min-w-0">
            <BlogArticleEditor
              blogPackage={blogPackage}
              onRegenerateSection={handleRegenerateSection}
            />
            <div className="mt-6 pt-6 border-t border-zinc-100">
              {error && (
                <p className="mb-3 text-sm text-red-600">{error}</p>
              )}
              <p className="text-sm text-zinc-500 mb-3">
                Happy with your article? Generate social posts to complete your content package.
              </p>
              <button
                type="button"
                onClick={handleGenerateSocial}
                disabled={isSocialGenerating}
                className="bg-zinc-900 text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSocialGenerating ? 'Generating Social Posts...' : 'Generate Social Posts'}
              </button>
            </div>
          </div>
          <div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-4 py-6">
            <StrategicInsightsPanel insights={blogPackage.strategicInsights} />
            <div className="mt-6">
              <ContentAnalysisPanel analysis={blogPackage.contentAnalysis} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Result state
  if (state === 'result' && blogPackage) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <StepProgressHeader currentStep={4} />
        <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6 min-w-0">
            <BlogArticleEditor
              blogPackage={blogPackage}
              onRegenerateSection={handleRegenerateSection}
            />
            <div className="mt-6">
              <DistributionCards distribution={blogPackage.distribution} />
            </div>
          </div>
          <div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-4 py-6">
            <StrategicInsightsPanel insights={blogPackage.strategicInsights} />
            <div className="mt-6">
              <ContentAnalysisPanel analysis={blogPackage.contentAnalysis} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
