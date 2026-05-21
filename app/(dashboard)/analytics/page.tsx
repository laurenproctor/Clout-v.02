'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

type Tab = 'overview' | 'content' | 'lenses' | 'attribution' | 'search'
type Preset = '30d' | '3mo' | '6mo' | '1yr'

interface IntelligenceData {
  isConnected: boolean
  overview: {
    totalSessions: number
    totalConversions: number
    totalRevenue: number
    totalClicks: number
    totalImpressions: number
  }
  sourceBreakdown: Array<{ source: string; sessions: number }>
  topCampaigns: Array<{ campaignId: string; sessions: number; conversions: number; sources: string[] }>
  lensPerformance: Array<{
    lens_id: string
    avg_traffic: number | null
    avg_conversion_rate: number | null
    lenses: { name: string } | null
  }>
  narrativePerformance: Array<{
    narrative_type: string
    avg_engagement_rate: number | null
    avg_conversion_rate: number | null
    avg_session_duration: number | null
    sample_size: number
  }>
  searchMetrics: Array<{
    query: string
    landing_page: string
    clicks: number
    impressions: number
    ctr: number | null
    avg_position: number | null
  }>
  rankingOpportunities: Array<{ query: string; clicks: number; impressions: number; position: number }>
  attribution: Array<{
    output_id: string
    platform: string
    utm_campaign: string | null
    utm_source: string | null
    utm_medium: string | null
    lens_id: string | null
    narrative_type: string | null
  }>
}

const PRESETS: Array<{ key: Preset; label: string }> = [
  { key: '30d', label: '30d' },
  { key: '3mo', label: '3mo' },
  { key: '6mo', label: '6mo' },
  { key: '1yr', label: '1yr' },
]

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'content', label: 'Content' },
  { key: 'lenses', label: 'Lenses' },
  { key: 'attribution', label: 'Attribution' },
  { key: 'search', label: 'Search' },
]

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const to = toDateStr(now)
  if (preset === '30d') {
    const f = new Date(now); f.setDate(f.getDate() - 29)
    return { from: toDateStr(f), to }
  }
  if (preset === '3mo') return { from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to }
  if (preset === '6mo') return { from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 5, 1)), to }
  return { from: toDateStr(new Date(now.getFullYear() - 1, now.getMonth(), 1)), to }
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.max((value / max) * 100, value > 0 ? 2 : 0)
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-600 truncate pr-2">{label}</span>
        <span className="text-zinc-900 font-medium shrink-0">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-100">
        <div className="h-1.5 rounded-full bg-zinc-900" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ConnectPrompt() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center">
      <p className="text-sm font-medium text-zinc-900 mb-2">Connect Google Analytics to unlock intelligence</p>
      <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-6">
        Clout will automatically attribute every piece of content you publish to traffic, conversions,
        and search rankings — by lens, narrative type, and channel.
      </p>
      <a
        href="/settings/analytics"
        className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
      >
        Connect Google Analytics
      </a>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-lg border border-zinc-200 bg-white animate-pulse" />
      ))}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('overview')
  const [preset, setPreset] = useState<Preset>('30d')
  const [data, setData] = useState<IntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<string[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)

  const fetchData = useCallback((from: string, to: string) => {
    setLoading(true)
    fetch(`/api/analytics/intelligence?from=${from}&to=${to}`)
      .then((r) => r.ok ? r.json() as Promise<IntelligenceData> : null)
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const range = presetRange('30d')
    fetchData(range.from, range.to)
    // Reset insights when tab comes from search params
    const tabParam = searchParams.get('tab') as Tab | null
    if (tabParam && TABS.some((t) => t.key === tabParam)) setTab(tabParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyPreset(p: Preset) {
    setPreset(p)
    setInsights([])
    const range = presetRange(p)
    fetchData(range.from, range.to)
  }

  async function generateInsights() {
    if (!data) return
    setLoadingInsights(true)
    try {
      const res = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overview: data.overview,
          lensPerformance: data.lensPerformance,
          narrativePerformance: data.narrativePerformance,
          sourceBreakdown: data.sourceBreakdown,
        }),
      })
      const json = await res.json() as { insights: string[] }
      setInsights(json.insights ?? [])
    } finally {
      setLoadingInsights(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-zinc-900">Editorial Intelligence</h1>
        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                preset === p.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !data?.isConnected ? (
        <ConnectPrompt />
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard label="Sessions" value={data.overview.totalSessions.toLocaleString()} />
                <MetricCard label="Conversions" value={data.overview.totalConversions.toLocaleString()} />
                <MetricCard
                  label="Conv. Rate"
                  value={data.overview.totalSessions > 0
                    ? `${((data.overview.totalConversions / data.overview.totalSessions) * 100).toFixed(1)}%`
                    : '—'}
                />
                <MetricCard label="Organic Clicks" value={data.overview.totalClicks.toLocaleString()} />
                <MetricCard label="Impressions" value={data.overview.totalImpressions.toLocaleString()} />
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-zinc-900">Intelligence Summary</h2>
                  <button
                    onClick={generateInsights}
                    disabled={loadingInsights}
                    className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-40"
                  >
                    {loadingInsights ? 'Analyzing…' : insights.length > 0 ? 'Refresh' : 'Generate insights'}
                  </button>
                </div>
                {insights.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">
                    Click &ldquo;Generate insights&rdquo; for an AI-powered strategic summary of this period.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {insights.map((insight, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-zinc-300 text-sm mt-0.5 shrink-0">0{i + 1}</span>
                        <p className="text-sm text-zinc-700 leading-relaxed">{insight}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-medium text-zinc-900 mb-4">Traffic by Source</h2>
                {data.sourceBreakdown.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">No attributed traffic yet. Publish content with Clout to start tracking.</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.sourceBreakdown.map((s) => (
                      <BarRow key={s.source} label={s.source} value={s.sessions} max={data.sourceBreakdown[0]?.sessions ?? 1} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CONTENT ── */}
          {tab === 'content' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-medium text-zinc-900 mb-4">Top Performing Content</h2>
                {data.topCampaigns.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">No content performance data yet.</p>
                ) : (
                  <div className="space-y-4">
                    {data.topCampaigns.map((campaign, i) => (
                      <div key={campaign.campaignId} className="flex items-start gap-3 pb-4 border-b border-zinc-100 last:border-0 last:pb-0">
                        <span className="text-xs text-zinc-300 w-5 shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 font-mono truncate">{campaign.campaignId}</p>
                          <div className="flex gap-4 mt-1 flex-wrap">
                            <span className="text-xs text-zinc-500">{campaign.sessions.toLocaleString()} sessions</span>
                            <span className="text-xs text-zinc-500">{campaign.conversions} conversions</span>
                            {campaign.sources.length > 0 && (
                              <span className="text-xs text-zinc-400">{campaign.sources.join(', ')}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-zinc-900">
                            {campaign.sessions > 0
                              ? `${((campaign.conversions / campaign.sessions) * 100).toFixed(1)}%`
                              : '—'}
                          </p>
                          <p className="text-xs text-zinc-400">conv rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-medium text-zinc-900 mb-4">Narrative Type Performance</h2>
                {data.narrativePerformance.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">Narrative data populates after rollup jobs run.</p>
                ) : (
                  <div className="space-y-2.5">
                    {[...data.narrativePerformance]
                      .sort((a, b) => (b.avg_conversion_rate ?? 0) - (a.avg_conversion_rate ?? 0))
                      .map((n) => (
                        <div key={n.narrative_type} className="flex items-center justify-between gap-4">
                          <span className="text-sm text-zinc-700 capitalize">{n.narrative_type}</span>
                          <div className="flex gap-4 text-xs text-zinc-500">
                            <span>
                              {n.avg_engagement_rate != null
                                ? `${(n.avg_engagement_rate * 100).toFixed(0)}% engaged`
                                : '—'}
                            </span>
                            <span>
                              {n.avg_conversion_rate != null
                                ? `${(n.avg_conversion_rate * 100).toFixed(1)}% conv`
                                : '—'}
                            </span>
                            <span className="text-zinc-300">n={n.sample_size}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LENSES ── */}
          {tab === 'lenses' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-medium text-zinc-900 mb-4">Lens Performance</h2>
                {data.lensPerformance.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">Lens performance populates after content is published and synced.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.lensPerformance.map((lens) => (
                      <div key={lens.lens_id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-sm font-medium text-zinc-900">
                          {(lens.lenses as { name?: string } | null)?.name ?? lens.lens_id}
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Avg traffic</span>
                            <span className="text-zinc-900 font-medium">
                              {lens.avg_traffic != null ? Math.round(lens.avg_traffic).toLocaleString() : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Conv rate</span>
                            <span className="text-zinc-900 font-medium">
                              {lens.avg_conversion_rate != null
                                ? `${(lens.avg_conversion_rate * 100).toFixed(1)}%`
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ATTRIBUTION ── */}
          {tab === 'attribution' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-medium text-zinc-900 mb-1">Content Attribution Map</h2>
                <p className="text-xs text-zinc-400 mb-4">Each row is a published asset with its UTM attribution metadata.</p>
                {data.attribution.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">No attributed content yet. Attribution is tagged at publish time.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-100">
                          <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Platform</th>
                          <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Source</th>
                          <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Campaign</th>
                          <th className="text-left py-2 text-zinc-500 font-medium">Narrative</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attribution.slice(0, 50).map((a) => (
                          <tr key={a.output_id} className="border-b border-zinc-50">
                            <td className="py-2 pr-4 text-zinc-700 capitalize">{a.platform}</td>
                            <td className="py-2 pr-4 text-zinc-500">{a.utm_source ?? '—'}</td>
                            <td className="py-2 pr-4 text-zinc-500 font-mono">
                              {a.utm_campaign ? `${a.utm_campaign.slice(0, 14)}…` : '—'}
                            </td>
                            <td className="py-2 text-zinc-500">{a.narrative_type ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SEARCH ── */}
          {tab === 'search' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard label="Total Clicks" value={data.overview.totalClicks.toLocaleString()} />
                <MetricCard label="Impressions" value={data.overview.totalImpressions.toLocaleString()} />
                <MetricCard
                  label="Avg CTR"
                  value={data.overview.totalImpressions > 0
                    ? `${((data.overview.totalClicks / data.overview.totalImpressions) * 100).toFixed(1)}%`
                    : '—'}
                />
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-medium text-zinc-900 mb-4">Top Search Queries</h2>
                {data.searchMetrics.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">No search data yet. Select a Search Console site in Settings → Analytics.</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.searchMetrics.slice(0, 20).map((m, i) => (
                      <BarRow
                        key={`${m.query}-${i}`}
                        label={m.query}
                        value={m.clicks}
                        max={data.searchMetrics[0]?.clicks ?? 1}
                      />
                    ))}
                  </div>
                )}
              </div>

              {data.rankingOpportunities.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6">
                  <h2 className="text-sm font-medium text-zinc-900 mb-1">Ranking Opportunities</h2>
                  <p className="text-xs text-zinc-400 mb-4">
                    High-impression queries ranking below position 10 — create or optimize content to move these up.
                  </p>
                  <div className="space-y-2.5">
                    {data.rankingOpportunities.slice(0, 15).map((r) => (
                      <div key={r.query} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-zinc-700 truncate flex-1">{r.query}</span>
                        <div className="flex gap-4 text-xs text-zinc-500 shrink-0">
                          <span>{r.impressions.toLocaleString()} impr</span>
                          <span>pos {r.position.toFixed(0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
