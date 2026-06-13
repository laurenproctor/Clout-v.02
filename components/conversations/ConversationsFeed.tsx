'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { SkeletonList } from '@/components/ui/skeleton'
import { OpportunityCard } from './OpportunityCard'
import { ConversationThemeCard } from './ConversationThemeCard'
import { NarrativeCard } from './NarrativeCard'
import { SourcesTable } from './SourcesTable'
import { ParticipationHistory } from './ParticipationHistory'
import type { ConversationOpportunity, ConversationSource, ConversationResponse, ConversationTheme, ComputedNarrative } from '@/types/domain'

type PollingState =
  | { status: 'polling'; label: string }
  | { status: 'success'; message: string }
  | { status: 'timeout' }

export function ConversationsFeed() {
  const [tab, setTab] = useState('narratives')
  const [narratives, setNarratives] = useState<ComputedNarrative[]>([])
  const [narrativesLoading, setNarrativesLoading] = useState(true)
  const [opportunities, setOpportunities] = useState<ConversationOpportunity[]>([])
  const [themes, setThemes] = useState<ConversationTheme[]>([])
  const [sources, setSources] = useState<ConversationSource[]>([])
  const [responses, setResponses] = useState<ConversationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [pollingState, setPollingState] = useState<PollingState | null>(null)

  // Refs so the polling closure never captures stale state
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const prevIdsRef = useRef<Set<string>>(new Set())
  const opportunitiesRef = useRef<ConversationOpportunity[]>([])

  // Keep opportunitiesRef in sync
  useEffect(() => { opportunitiesRef.current = opportunities }, [opportunities])

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const loadNarratives = useCallback(async () => {
    setNarrativesLoading(true)
    try {
      const res = await fetch('/api/conversations/narratives')
      if (res.ok) {
        const json = await res.json() as { narratives: ComputedNarrative[] }
        setNarratives(json.narratives ?? [])
      }
    } finally {
      setNarrativesLoading(false)
    }
  }, [])

  const loadOpportunities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/conversations/opportunities?status=active&limit=50')
      if (res.ok) setOpportunities(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const startOpportunityPolling = useCallback((sourceLabel: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTab('opportunities')
    prevIdsRef.current = new Set(opportunitiesRef.current.map(o => o.id))
    setPollingState({ status: 'polling', label: sourceLabel })

    let attempts = 0
    const MAX_ATTEMPTS = 15 // 15 × 8s ≈ 2 minutes

    intervalRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch('/api/conversations/opportunities?status=active&limit=50')

        if (res.status === 401 || res.status === 403 || res.status === 404) {
          clearInterval(intervalRef.current!)
          setPollingState(null)
          return
        }
        if (!res.ok) {
          if (attempts >= MAX_ATTEMPTS) {
            clearInterval(intervalRef.current!)
            setPollingState({ status: 'timeout' })
          }
          return
        }

        const data: ConversationOpportunity[] = await res.json()
        const newItems = data.filter(o => !prevIdsRef.current.has(o.id))

        if (newItems.length > 0) {
          setOpportunities(data)
          clearInterval(intervalRef.current!)
          const count = newItems.length
          setPollingState({ status: 'success', message: `${count} new opportunity${count !== 1 ? 's' : ''} found` })
          setTimeout(() => setPollingState(null), 4000)
          return
        }

        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(intervalRef.current!)
          setPollingState({ status: 'timeout' })
        }
      } catch {
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(intervalRef.current!)
          setPollingState({ status: 'timeout' })
        }
      }
    }, 8000)
  }, []) // all state accessed via stable setters or refs

  const loadThemes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/conversations/themes')
      if (res.ok) setThemes(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSources = useCallback(async () => {
    const res = await fetch('/api/conversations/sources')
    if (res.ok) setSources(await res.json())
  }, [])

  const loadResponses = useCallback(async () => {
    const res = await fetch('/api/conversations/responses')
    if (res.ok) setResponses(await res.json())
  }, [])

  useEffect(() => {
    if (tab === 'narratives')    loadNarratives()
    else if (tab === 'opportunities') loadOpportunities()
    else if (tab === 'themes')   loadThemes()
    else if (tab === 'sources')  loadSources()
    else if (tab === 'history')  loadResponses()
  }, [tab, loadNarratives, loadOpportunities, loadThemes, loadSources, loadResponses])

  function removeOpportunity(id: string) {
    setOpportunities(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b px-6 flex-shrink-0">
          <TabsList className="h-10 bg-transparent p-0 gap-0">
            {[
              { value: 'narratives',    label: 'Narratives',    count: narratives.length },
              { value: 'opportunities', label: 'Opportunities', count: opportunities.length },
              { value: 'themes',        label: 'Themes',        count: themes.length },
              { value: 'sources',       label: 'Sources' },
              { value: 'history',       label: 'History' },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4"
              >
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className="ml-2 bg-foreground text-background text-xs rounded-full px-1.5 py-0.5 leading-none">
                    {t.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="narratives" className="flex-1 overflow-y-auto p-6 mt-0">
          {narrativesLoading ? (
            <SkeletonList count={3} rowClassName="h-36" className="max-w-2xl" />
          ) : narratives.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground font-medium">No cross-source narratives yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Narratives emerge when the same topic appears across multiple platforms.
                Check back after sources have been active for a few days.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {narratives.map(n => <NarrativeCard key={n.id} narrative={n} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="flex-1 overflow-y-auto p-6 mt-0">
          {pollingState?.status === 'polling' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 max-w-2xl">
              <Spinner size="sm" className="flex-shrink-0" />
              <span>Fetching conversations from {pollingState.label}…</span>
            </div>
          )}
          {pollingState?.status === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-600 mb-4 max-w-2xl">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{pollingState.message}</span>
            </div>
          )}
          {pollingState?.status === 'timeout' && (
            <div className="text-sm text-muted-foreground mb-4 max-w-2xl">
              Still processing — check back soon.
            </div>
          )}
          {loading ? (
            <SkeletonList count={3} rowClassName="h-40" className="max-w-2xl" />
          ) : opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground font-medium">No opportunities yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add sources in the Sources tab — Clout checks every 3 hours for new conversations.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {opportunities.map(opp => (
                <OpportunityCard key={opp.id} opportunity={opp} onRemove={removeOpportunity} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="themes" className="flex-1 overflow-y-auto p-6 mt-0">
          {loading ? (
            <SkeletonList count={2} rowClassName="h-28" className="max-w-2xl" />
          ) : themes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground font-medium">No themes detected yet</p>
              <p className="text-sm text-muted-foreground mt-1">Themes appear after multiple sources cover the same topic.</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {themes.map(theme => <ConversationThemeCard key={theme.id} theme={theme} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sources" className="flex-1 overflow-y-auto p-6 mt-0">
          <SourcesTable
            sources={sources}
            onSourcesChange={loadSources}
            onPreferencesChange={loadOpportunities}
            onSourceCreated={startOpportunityPolling}
            onFocusTopicAdded={() => startOpportunityPolling('your focus topics')}
          />
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto p-6 mt-0">
          <ParticipationHistory responses={responses} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
