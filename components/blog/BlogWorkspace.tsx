'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { Lens } from '@/types/domain'
import { SocialPreviewInline, previewFromStudioState } from '@/components/social-preview'
import type { BlogGenerationRequest, NarrativeStrategy, HookExploration, GeneratedBlogPackage } from '@/lib/blog/types'
import { StepProgressHeader } from './StepProgressHeader'
import { StrategicSetupPanel } from './StrategicSetupPanel'
import { NarrativeCard } from './NarrativeCard'
import { ArticlePreviewRail } from './ArticlePreviewRail'
import type { LivePreview } from './ArticlePreviewRail'
import { AdvancedControlsPanel } from './AdvancedControlsPanel'
import { NarrativeStrategyCard } from './NarrativeStrategyCard'
import { GenerationProgress } from './GenerationProgress'
import { BlogArticleEditor } from './BlogArticleEditor'
import { DistributionCards } from './DistributionCards'
import { StrategicInsightsPanel } from './StrategicInsightsPanel'
import { ContentAnalysisPanel } from './ContentAnalysisPanel'
import { VisualGenerator } from '@/components/visual/VisualGenerator'
import { PublishToCmsDrawer } from '@/components/publishing/PublishToCmsDrawer'
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
  workspaceId: string
}

export function BlogWorkspace({ lenses, workspaceId }: BlogWorkspaceProps) {
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
  const [keyboardIndex, setKeyboardIndex] = useState(0)
  const [livePreview, setLivePreview] = useState<LivePreview>({})
  const [blogSourceId, setBlogSourceId] = useState<string | null>(null)
  const [blogOutputId, setBlogOutputId] = useState<string | null>(null)
  const [heroAssetId, setHeroAssetId] = useState<string | null>(null)
  const [publishDrawerOpen, setPublishDrawerOpen] = useState(false)
  const socialSectionRef = useRef<HTMLDivElement>(null)

  const addProgress = useCallback((phase: string, label: string) => {
    setProgressEvents(prev => [...prev, { phase, label }])
  }, [])

  useEffect(() => {
    if (!heroAssetId || !blogOutputId) return
    fetch(`/api/outputs/${blogOutputId}`)
      .then(r => r.ok ? r.json() : Promise.reject('not found'))
      .then(output => fetch(`/api/outputs/${blogOutputId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { ...output.content, primaryVisualAssetId: heroAssetId } }),
      }))
      .catch(err => {
        if (process.env.NODE_ENV === 'development') console.warn('[blog] Failed to attach hero image:', err)
      })
  }, [heroAssetId, blogOutputId])

  // Keyboard shortcuts: narrative-review — ↑/↓ navigate headlines, Enter select, ⌘↵ generate
  // NOTE: React Compiler flags handleContinue/handleGenerateSocial as "accessed
  // before declared" here because these handlers are declared lower in the
  // component. The reference lives inside an event-handler closure that only runs
  // after mount, so it resolves correctly at runtime. Deferred intentionally —
  // reordering the declarations would risk the working generate/editor flow.
  useEffect(() => {
    if (state !== 'narrative-review' || !hookExploration) return
    const headlines = request?.title
      ? [{ title: request.title, style: 'executive' as const, strength: 5, why: 'Your provided title' }, ...hookExploration.headlineOptions]
      : hookExploration.headlineOptions

    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
        // Still allow ⌘↵ to generate even from inside inputs
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          if (selectedHeadline && narrativeStrategy) {
            e.preventDefault()
            handleContinue(narrativeStrategy, selectedHeadline)
          }
        }
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setKeyboardIndex(i => Math.min(i + 1, headlines.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setKeyboardIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const h = headlines[keyboardIndex]
        if (h) setSelectedHeadline(h.title)
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (selectedHeadline && narrativeStrategy) {
          e.preventDefault()
          handleContinue(narrativeStrategy, selectedHeadline)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hookExploration, keyboardIndex, selectedHeadline, narrativeStrategy, request?.title])

  // Keyboard shortcuts: article-review — ⌘↵ to generate social posts
  useEffect(() => {
    if (state !== 'article-review') return
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isSocialGenerating && selectedPlatforms.length > 0) handleGenerateSocial()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isSocialGenerating, selectedPlatforms.length])

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
        // campaignId is read at the top level by the route.
        body: JSON.stringify({ request: req, campaignId: req.campaignId ?? null }),
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
    setLivePreview({})
    setBlogSourceId(null)
    setBlogOutputId(null)
    setHeroAssetId(null)
    setPublishDrawerOpen(false)
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
          campaignId: request?.campaignId ?? null,
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
            } else if (event.type === 'phase-complete') {
              if (event.phase === 'metadata') setLivePreview(p => ({ ...p, metadata: event.data }))
              if (event.phase === 'outline')  setLivePreview(p => ({ ...p, outline: event.data }))
              if (event.phase === 'sections') setLivePreview(p => ({ ...p, markdown: event.data.markdown }))
            } else if (event.type === 'complete') {
              receivedComplete = true
              const pkg = event.data as GeneratedBlogPackage
              setBlogPackage(pkg)
              setBlogSourceId(crypto.randomUUID())
              setState('article-review')
              fetch('/api/blog/outputs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: pkg.article.title,
                  wordCount: pkg.article.wordCount,
                  markdown: pkg.article.markdown,
                  campaignId: request?.campaignId ?? null,
                }),
              })
                .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
                .then(d => { if (d?.id) setBlogOutputId(d.id) })
                .catch(err => {
                  if (process.env.NODE_ENV === 'development') console.warn('[blog] Failed to save blog output:', err)
                })
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
      const { distribution } = await res.json() as { distribution: { linkedin?: string; xThread?: string; newsletter?: string } }
      setBlogPackage(prev => prev ? { ...prev, distribution } : prev)
      setState('result')
      // Auto-save distribution posts so they appear in inbox
      if (distribution.linkedin) {
        fetch('/api/linkedin/outputs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variation: { body: distribution.linkedin, primaryVisualAssetId: heroAssetId ?? null } }),
        }).catch(err => {
          if (process.env.NODE_ENV === 'development') console.warn('[blog] Failed to save LinkedIn output:', err)
        })
      }
      if (distribution.xThread) {
        fetch('/api/syndication/outputs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'x', content: distribution.xThread }),
        }).catch(() => null)
      }
      if (distribution.newsletter) {
        fetch('/api/syndication/outputs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'substack', content: distribution.newsletter }),
        }).catch(() => null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Social post generation failed')
    } finally {
      setIsSocialGenerating(false)
    }
  }, [blogPackage, selectedPlatforms, heroAssetId])

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


  // Live network preview (Article). Built at top level so hook order stays stable
  // across the many workspace states.
  const previewData = useMemo(
    () =>
      previewFromStudioState({
        platform: 'article',
        channel: null,
        title: blogPackage?.article.title,
        body: blogPackage ? stripMarkdown(blogPackage.article.markdown) : '',
      }),
    [blogPackage],
  )

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
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left column: direction first, then strategy + controls */}
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8 lg:py-6">
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
                      onSelect={() => { setSelectedHeadline(option.title); setKeyboardIndex(i) }}
                      openingHooks={hookExploration.openingHooks}
                      editable={!showAdvancedControls}
                      isKeyboardFocused={i === keyboardIndex && !selectedHeadline}
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
                      className="w-full bg-zinc-900 text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Refine &amp; Generate</span>
                      <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px] font-mono text-zinc-400">⌘↵</kbd>
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
          <div className="w-full lg:w-72 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">
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
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8 lg:py-6">
            <div className="max-w-md mx-auto">
              <GenerationProgress events={progressEvents} state={state} />
            </div>
          </div>
          <div className="w-full lg:w-72 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">Article Preview</p>
            <ArticlePreviewRail
              exploration={hookExploration}
              selectedHeadline={selectedHeadline}
              request={request ?? {}}
              livePreview={livePreview}
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
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8 lg:py-6 min-w-0">
            <BlogArticleEditor
              blogPackage={blogPackage}
              onRegenerateSection={handleRegenerateSection}
              onPublish={() => setPublishDrawerOpen(true)}
            />
            <div className="mt-6 pt-6 border-t border-zinc-100">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Hero Image</p>
              <VisualGenerator
                content={`${blogPackage.article.title}\n\n${blogPackage.article.markdown.slice(0, 800)}`}
                platform="blog"
                aspectRatio="landscape"
                onAttach={(assetId) => setHeroAssetId(assetId)}
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
                className="bg-zinc-900 text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>{isSocialGenerating ? 'Generating Social Posts...' : 'Generate Social Posts'}</span>
                {!isSocialGenerating && <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px] font-mono text-zinc-400">⌘↵</kbd>}
              </button>
            </div>
          </div>
          <div className="w-full lg:w-72 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 overflow-y-auto px-4 py-4 lg:py-6">
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
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8 lg:py-6 min-w-0">
            <div className="mb-6">
              <SocialPreviewInline data={previewData} label="Preview" />
            </div>
            <BlogArticleEditor
              blogPackage={blogPackage}
              onRegenerateSection={handleRegenerateSection}
              onPublish={() => setPublishDrawerOpen(true)}
            />
            <div className="mt-6">
              <DistributionCards distribution={blogPackage.distribution} />
            </div>
          </div>
          <div className="w-full lg:w-72 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 overflow-y-auto px-4 py-4 lg:py-6">
            <StrategicInsightsPanel insights={blogPackage.strategicInsights} onWriteAngle={handleWriteAngle} />
            <div className="mt-6">
              <ContentAnalysisPanel analysis={blogPackage.contentAnalysis} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {blogPackage && blogSourceId && (
        <PublishToCmsDrawer
          open={publishDrawerOpen}
          onClose={() => setPublishDrawerOpen(false)}
          blogPackage={blogPackage}
          sourceId={blogSourceId}
          workspaceId={workspaceId}
        />
      )}
    </>
  )
}

// Lightweight markdown → plain text for the network preview card.
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}/g, '')
    .replace(/^>\s?/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .trim()
}
