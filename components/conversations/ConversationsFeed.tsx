'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OpportunityCard } from './OpportunityCard'
import { ConversationThemeCard } from './ConversationThemeCard'
import { SourcesTable } from './SourcesTable'
import { ParticipationHistory } from './ParticipationHistory'
import type { ConversationOpportunity, ConversationSource, ConversationResponse, ConversationTheme } from '@/types/domain'

export function ConversationsFeed() {
  const [tab, setTab] = useState('opportunities')
  const [opportunities, setOpportunities] = useState<ConversationOpportunity[]>([])
  const [themes, setThemes] = useState<ConversationTheme[]>([])
  const [sources, setSources] = useState<ConversationSource[]>([])
  const [responses, setResponses] = useState<ConversationResponse[]>([])
  const [loading, setLoading] = useState(true)

  const loadOpportunities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/conversations/opportunities?status=active&limit=50')
      if (res.ok) setOpportunities(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

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
    if (tab === 'opportunities') loadOpportunities()
    else if (tab === 'themes') loadThemes()
    else if (tab === 'sources') loadSources()
    else if (tab === 'history') loadResponses()
  }, [tab, loadOpportunities, loadThemes, loadSources, loadResponses])

  function removeOpportunity(id: string) {
    setOpportunities(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b px-6 flex-shrink-0">
          <TabsList className="h-10 bg-transparent p-0 gap-0">
            {[
              { value: 'opportunities', label: 'Opportunities', count: opportunities.length },
              { value: 'themes', label: 'Themes', count: themes.length },
              { value: 'sources', label: 'Sources' },
              { value: 'history', label: 'History' },
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

        <TabsContent value="opportunities" className="flex-1 overflow-y-auto p-6 mt-0">
          {loading ? (
            <div className="space-y-3 max-w-2xl">
              {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />)}
            </div>
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
            <div className="space-y-3 max-w-2xl">
              {[1, 2].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
            </div>
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
          <SourcesTable sources={sources} onSourcesChange={loadSources} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto p-6 mt-0">
          <ParticipationHistory responses={responses} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
