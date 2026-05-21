'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface PropertyInfo { propertyId: string; displayName: string; account: string }
interface SiteInfo { siteUrl: string; permissionLevel: string }

interface ConnectionState {
  connected: boolean
  properties: PropertyInfo[]
  sites: SiteInfo[]
  selectedPropertyId: string | null
  selectedSiteUrl: string | null
}

export default function AnalyticsSettingsPage() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<ConnectionState>({
    connected: false, properties: [], sites: [], selectedPropertyId: null, selectedSiteUrl: null,
  })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const loadConnections = useCallback(async () => {
    try {
      const [propsRes, sitesRes] = await Promise.all([
        fetch('/api/integrations/google/properties').then((r) => r.json()),
        fetch('/api/integrations/google/sites').then((r) => r.json()),
      ])
      setState({
        connected: propsRes.connected || sitesRes.connected,
        properties: propsRes.properties ?? [],
        sites: sitesRes.sites ?? [],
        selectedPropertyId: propsRes.selectedId ?? null,
        selectedSiteUrl: sitesRes.selectedUrl ?? null,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConnections()
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'google') showToast('Google Analytics connected successfully.', true)
    if (error) showToast(`Connection failed: ${error.replace(/_/g, ' ')}`, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSelectProperty(prop: PropertyInfo) {
    const res = await fetch('/api/integrations/google/select-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: prop.propertyId, propertyName: prop.displayName }),
    })
    if (!res.ok) { showToast('Failed to save GA4 property', false); return }
    setState((s) => ({ ...s, selectedPropertyId: prop.propertyId }))
    showToast(`GA4 property set to "${prop.displayName}"`, true)
  }

  async function handleSelectSite(site: SiteInfo) {
    const res = await fetch('/api/integrations/google/select-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteUrl: site.siteUrl }),
    })
    if (!res.ok) { showToast('Failed to save Search Console site', false); return }
    setState((s) => ({ ...s, selectedSiteUrl: site.siteUrl }))
    showToast(`Search Console site set to "${site.siteUrl}"`, true)
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google Analytics and Search Console? Synced data will be preserved.')) return
    await fetch('/api/integrations/google/disconnect', { method: 'POST' })
    setState({ connected: false, properties: [], sites: [], selectedPropertyId: null, selectedSiteUrl: null })
    showToast('Google Analytics disconnected.', true)
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 w-48 rounded bg-zinc-200 animate-pulse" />
        <div className="h-32 rounded-lg border border-zinc-200 bg-white animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6 max-w-2xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg ${toast.ok ? 'bg-white text-zinc-900 border border-zinc-200' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Editorial Intelligence</h1>
        <p className="mt-1 text-sm text-zinc-500">Connect Google Analytics 4 and Search Console to measure content attribution and traffic intelligence.</p>
      </div>

      {/* Connection card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-600">G</div>
            <div>
              <p className="text-sm font-medium text-zinc-900">Google Analytics + Search Console</p>
              <p className="text-xs text-zinc-500">GA4 sessions, conversions, and organic search performance</p>
            </div>
          </div>
          {state.connected ? (
            <button
              onClick={handleDisconnect}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <a
              href="/api/integrations/google/connect"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Connect Google
            </a>
          )}
        </div>

        {state.connected && (
          <div className="pt-2 border-t border-zinc-100 space-y-5">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">GA4 Property</p>
              {state.properties.length === 0 ? (
                <p className="text-sm text-zinc-400">No GA4 properties found on this account.</p>
              ) : (
                <div className="space-y-1">
                  {state.properties.map((prop) => (
                    <button
                      key={prop.propertyId}
                      onClick={() => handleSelectProperty(prop)}
                      className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        state.selectedPropertyId === prop.propertyId
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span>{prop.displayName}</span>
                      <span className="text-xs opacity-60">{prop.account}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Search Console Site</p>
              {state.sites.length === 0 ? (
                <p className="text-sm text-zinc-400">No verified sites found in Search Console.</p>
              ) : (
                <div className="space-y-1">
                  {state.sites.map((site) => (
                    <button
                      key={site.siteUrl}
                      onClick={() => handleSelectSite(site)}
                      className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        state.selectedSiteUrl === site.siteUrl
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="truncate">{site.siteUrl}</span>
                      <span className="text-xs opacity-60 shrink-0 ml-2">{site.permissionLevel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-xs text-zinc-500 space-y-1">
        <p className="font-medium text-zinc-700">What gets measured</p>
        <p>Every piece of content Clout publishes automatically receives UTM parameters. GA4 sessions arriving via those parameters are recorded as direct attributed traffic — measuring downstream reach, tracked referral conversions, and measured session quality per content batch.</p>
      </div>
    </div>
  )
}
