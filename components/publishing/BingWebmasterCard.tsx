// components/publishing/BingWebmasterCard.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { TrendingUp, MousePointerClick, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BingSite { siteUrl: string; verified: boolean }

interface TopQuery {
  query:       string
  clicks:      number
  impressions: number
  position:    number
}

interface Summary {
  totalClicks:      number
  totalImpressions: number
  avgCtr:           number
  topQueries:       TopQuery[]
  windowDays:       number
}

interface BingState {
  connected:       boolean
  sites:           BingSite[]
  selectedSiteUrl: string | null
  summary:         Summary | null
}

function BingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M5.64 0L4.32.48v18.24l1.32.48 5.64-3.12-3-1.92-2.64.96V3.6l3.96 2.4 8.28-4.56z" fill="#0078D4"/>
    </svg>
  )
}

function StatPill({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-zinc-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-zinc-400" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums text-zinc-900">{value}</span>
    </div>
  )
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function BingWebmasterCard() {
  const pathname = usePathname()

  const [state, setState]     = useState<BingState>({ connected: false, sites: [], selectedSiteUrl: null, summary: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/bing/search')
      if (res.ok) setState(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSelectSite(siteUrl: string) {
    setSaving(true)
    const res = await fetch('/api/integrations/bing/select-site', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ siteUrl }),
    })
    setSaving(false)
    if (res.ok) {
      setLoading(true)
      await load()
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-100" />
          <div className="space-y-1.5">
            <div className="h-4 w-44 rounded bg-zinc-100" />
            <div className="h-3 w-64 rounded bg-zinc-100" />
          </div>
        </div>
      </div>
    )
  }

  const { connected, sites, selectedSiteUrl, summary } = state
  const maxClicks = summary?.topQueries.reduce((m, q) => Math.max(m, q.clicks), 0) ?? 0

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-200">
            <BingIcon className="h-6 w-6" />
          </div>
          <div className="pt-0.5">
            <h3 className="font-[Signifier,_Georgia,_serif] text-base font-semibold leading-tight text-zinc-900">
              Bing Webmaster Tools
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {connected && selectedSiteUrl
                ? `Tracking ${selectedSiteUrl}`
                : 'Bing organic search impressions, clicks, and keyword rankings'}
            </p>
          </div>
        </div>

        {connected ? (
          <div className="flex items-center gap-2">
            {summary && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            )}
            <a
              href={`/api/integrations/bing/connect?returnTo=${encodeURIComponent(pathname)}`}
              className="text-xs text-zinc-400 transition-colors hover:text-zinc-600"
            >
              Reconnect
            </a>
          </div>
        ) : (
          <a
            href={`/api/integrations/bing/connect?returnTo=${encodeURIComponent(pathname)}`}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Connect Microsoft
          </a>
        )}
      </div>

      {connected && (
        <div className="border-t border-zinc-100 px-6 pb-6 pt-5 space-y-5">

          {/* Site selector */}
          {sites.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                Webmaster Property
              </p>
              <div className="space-y-1">
                {sites.map(site => (
                  <button
                    type="button"
                    key={site.siteUrl}
                    onClick={() => !saving && handleSelectSite(site.siteUrl)}
                    disabled={saving}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
                      selectedSiteUrl === site.siteUrl
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    )}
                  >
                    <span className="truncate text-left">{site.siteUrl}</span>
                    {site.verified && (
                      <span className={cn(
                        'ml-2 shrink-0 text-xs',
                        selectedSiteUrl === site.siteUrl ? 'opacity-60' : 'text-zinc-400'
                      )}>
                        verified
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sites.length === 0 && (
            <p className="text-sm text-zinc-400">
              No verified sites found. Add and verify your site in{' '}
              <a
                href="https://www.bing.com/webmasters"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-600"
              >
                Bing Webmaster Tools
              </a>
              {' '}then reconnect.
            </p>
          )}

          {/* Summary stats */}
          {summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <StatPill label="Clicks"      value={fmt(summary.totalClicks)}                    icon={MousePointerClick} />
                <StatPill label="Impressions" value={fmt(summary.totalImpressions)}               icon={Eye} />
                <StatPill label="Avg CTR"     value={`${(summary.avgCtr * 100).toFixed(1)}%`}    icon={TrendingUp} />
              </div>

              {summary.topQueries.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="mb-2 flex w-full items-center justify-between"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                      Top Queries · last {summary.windowDays} days
                    </p>
                    {expanded
                      ? <ChevronUp className="h-3 w-3 text-zinc-400" />
                      : <ChevronDown className="h-3 w-3 text-zinc-400" />
                    }
                  </button>

                  <div className="space-y-1.5">
                    {(expanded ? summary.topQueries : summary.topQueries.slice(0, 4)).map(q => (
                      <div key={q.query} className="flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-[#0078D4]"
                            style={{ width: maxClicks > 0 ? `${(q.clicks / maxClicks) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="w-32 truncate text-right text-xs text-zinc-600" title={q.query}>
                          {q.query}
                        </span>
                        <span className="w-12 text-right text-xs tabular-nums text-zinc-400">
                          {fmt(q.clicks)}
                        </span>
                        <span className="w-14 text-right text-[10px] tabular-nums text-zinc-300">
                          #{q.position.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedSiteUrl && !summary && (
            <p className="text-sm text-zinc-400">
              No search data yet. It may take 24–48 hours after connecting for data to appear.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
