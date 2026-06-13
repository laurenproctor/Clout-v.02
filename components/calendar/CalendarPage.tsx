'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { IntelligenceBar } from './IntelligenceBar'
import { CalendarToolbar } from './CalendarToolbar'
import { GridView } from './grid/GridView'
import { NarrativeView } from './narrative/NarrativeView'
import { DetailPanel } from './detail/DetailPanel'
import type {
  CalendarConcept,
  IntelligenceSignal,
  NarrativeArc,
  NarrativeHealth,
} from '@/types/calendar'

function getWeekStart(isoDate: string): string {
  const d = new Date(isoDate)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function addWeeks(weekStart: string, n: number): string {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + n * 7)
  return d.toISOString().split('T')[0]
}

export function CalendarPage() {
  const searchParams = useSearchParams()
  const [weekStart, setWeekStart] = useState(() => {
    const param = searchParams.get('week')
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) return param
    return getWeekStart(new Date().toISOString().split('T')[0])
  })
  const [viewMode, setViewMode] = useState<'grid' | 'narrative'>('grid')
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null)
  const [concepts, setConcepts] = useState<CalendarConcept[]>([])
  const [arcs, setArcs] = useState<NarrativeArc[]>([])
  const [signals, setSignals] = useState<IntelligenceSignal[]>([])
  const [health, setHealth] = useState<NarrativeHealth>({ score: 0, strengths: [], gaps: [] })
  const [loading, setLoading] = useState(true)

  const fetchWeek = useCallback(async (week: string) => {
    setLoading(true)
    try {
      const [calRes, healthRes, arcsRes] = await Promise.all([
        fetch(`/api/calendar?week=${week}`),
        fetch('/api/narrative-health'),
        fetch(`/api/narrative-arcs?week=${week}`),
      ])
      const [calData, healthData, arcsData] = await Promise.all([
        calRes.json(),
        healthRes.json(),
        arcsRes.json(),
      ])
      setConcepts(calData.concepts ?? [])
      setHealth(healthData.health ?? { score: 0, strengths: [], gaps: [] })
      setSignals(healthData.signals ?? [])
      setArcs(arcsData.arcs ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWeek(weekStart) }, [weekStart, fetchWeek])

  const selectedConcept =
    concepts.find((c) => c.conceptId === selectedConceptId) ?? null

  const totalPosts = concepts.reduce((sum, c) => sum + c.posts.length, 0)

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      <IntelligenceBar signals={signals} />
      <CalendarToolbar
        weekStart={weekStart}
        conceptCount={concepts.length}
        postCount={totalPosts}
        healthScore={health.score}
        viewMode={viewMode}
        onPrevWeek={() => setWeekStart(addWeeks(weekStart, -1))}
        onNextWeek={() => setWeekStart(addWeeks(weekStart, 1))}
        onViewModeChange={setViewMode}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-16 text-zinc-300 text-sm">Loading...</div>
          ) : viewMode === 'grid' ? (
            <GridView
              concepts={concepts}
              weekStart={weekStart}
              selectedConceptId={selectedConceptId}
              onSelectConcept={setSelectedConceptId}
            />
          ) : (
            <NarrativeView
              arcs={arcs}
              health={health}
              selectedConceptId={selectedConceptId}
              onSelectConcept={setSelectedConceptId}
            />
          )}
        </div>

        <div className="w-[296px] border-l border-zinc-200 bg-white flex-shrink-0 overflow-y-auto">
          <DetailPanel concept={selectedConcept} onChanged={() => fetchWeek(weekStart)} />
        </div>
      </div>
    </div>
  )
}
