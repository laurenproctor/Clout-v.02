'use client'

import { useState, useCallback, useRef } from 'react'
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
import { VisualGenerator } from '@/components/visual/VisualGenerator'
import type { SocialPlatform } from '@/lib/blog/generateDistribution'

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
  const [editableOutline, setEditableOutline] = useState<string[]>([])
  const [blogPackage, setBlogPackage] = useState<GeneratedBlogPackage | null>(null)
  const [isSocialGenerating, setIsSocialGenerating] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['linkedin', 'xThread', 'newsletter'])
  const [setupInitialValues, setSetupInitialValues] = useState<Partial<BlogGenerationRequest> | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const socialSectionRef = useRef<HTMLDivElement>(null)

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
              if (event.phase === 'hook-exploration') {
                setHookExploration(event.data)
                const angles: string[] = (event.data?.alternateAngles ?? []).slice(0, 4).map((a: string) => {
                  const t = a.trim(); return t.charAt(0).toUpperCase() + t.slice(1)
                })
                setEditableOutline(angles)
              }
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
    // Merge user-edited outline back into alternateAngles so the article prompt uses it
    const mergedHookExploration = {
      ...hookExploration,
      alternateAngles: editableOutline.length > 0 ? editableOutline : hookExploration.alternateAngles,
    }
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
          hookExploration: mergedHookExploration,
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
        body: JSON.stringify({ blogPackage, platforms: selectedPlatforms }),
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
  }, [blogPackage, selectedPlatforms])

  const handleWriteAngle = useCallback((angle: string) => {
    setSetupInitialValues({ ...(request ?? {}), title: angle })
    setState('setup')
  }, [request])

  const handleStepClick = useCallback((step: number) => {
    if (step === 1) {
      setSetupInitialValues(request ?? undefined)
      setState('setup')
    } else if (step === 2 && hookExploration) {
      setState('narrative-review')
    } else if (step === 3 && blogPackage) {
      setState('article-review')
    } else if (step === 4) {
      if (state === 'article-review') {
        socialSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [request, hookExploration, blogPackage, state])

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
          key={setupInitialValues ? JSON.stringify(setupInitialValues.title) : 'default'}
          lenses={lenses}
          onGenerate={handleGenerate}
          disabled={false}
          initialValues={setupInitialValues}
        />
      </div>
    )
  }

  // Generating phase 1-3
  if (state === 'generating:phase1-3') {
    return (
      <div className="flex flex-col h-full min-h-0">
        <StepProgressHeader currentStep={1} clickableSteps={[]} onStepClick={handleStepClick} />
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
        <StepProgressHeader currentStep={2} clickableSteps={[1]} onStepClick={handleStepClick} />
        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left column: direction first, then strategy + controls */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
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

                {selectedHeadline && narrativeStrategy && (
                  <div className="mt-6">
                    <NarrativeStrategyCard
                      strategy={narrativeStrategy}
                      editable={true}
                      onChange={setNarrativeStrategy}
                    />
                  </div>
                )}

                {!showAdvancedControls && selectedHeadline && (
                  <div className="mt-4">
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
                  <div className="mt-4">
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

          {/* Right column: editable preview rail */}
          <div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-6 py-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">Article Preview</p>
            <ArticlePreviewRail
              exploration={hookExploration}
              selectedHeadline={selectedHeadline}
              request={request ?? {}}
              onHeadlineChange={setSelectedHeadline}
              editableOutline={editableOutline}
              onOutlineChange={setEditableOutline}
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
        <StepProgressHeader currentStep={3} clickableSteps={[1, 2]} onStepClick={handleStepClick} />
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
        <StepProgressHeader currentStep={3} clickableSteps={[1, 2, 4]} onStepClick={handleStepClick} />
        <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6 min-w-0">
            <BlogArticleEditor
              blogPackage={blogPackage}
              onRegenerateSection={handleRegenerateSection}
            />
            <div className="mt-6 pt-6 border-t border-zinc-100">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Hero Image</p>
              <VisualGenerator
                content={`${blogPackage.article.title}\n\n${blogPackage.article.markdown.slice(0, 800)}`}
                platform="blog"
                aspectRatio="landscape"
              />
            </div>
            <div ref={socialSectionRef} className="mt-6 pt-6 border-t border-zinc-100">
              {error && (
                <p className="mb-3 text-sm text-red-600">{error}</p>
              )}
              <p className="text-sm text-zinc-500 mb-2">
                Happy with your article? Generate social posts to complete your content package.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {([
                  { id: 'linkedin' as SocialPlatform, label: 'LinkedIn' },
                  { id: 'xThread' as SocialPlatform, label: 'X Thread' },
                  { id: 'newsletter' as SocialPlatform, label: 'Newsletter' },
                ] as const).map(({ id, label }) => {
                  const active = selectedPlatforms.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedPlatforms(prev =>
                        active ? prev.filter(p => p !== id) : [...prev, id]
                      )}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={handleGenerateSocial}
                disabled={isSocialGenerating || selectedPlatforms.length === 0}
                className="bg-zinc-900 text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSocialGenerating ? 'Generating Social Posts...' : 'Generate Social Posts'}
              </button>
            </div>
          </div>
          <div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-4 py-6">
            <StrategicInsightsPanel insights={blogPackage.strategicInsights} onWriteAngle={handleWriteAngle} />
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
        <StepProgressHeader currentStep={4} clickableSteps={[1, 2, 3]} onStepClick={handleStepClick} />
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
            <StrategicInsightsPanel insights={blogPackage.strategicInsights} onWriteAngle={handleWriteAngle} />
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
