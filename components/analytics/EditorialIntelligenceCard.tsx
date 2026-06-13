'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

interface PropertyInfo { propertyId: string; displayName: string; account: string }
interface SiteInfo { siteUrl: string; permissionLevel: string }

interface ConnectionState {
  connected: boolean
  properties: PropertyInfo[]
  sites: SiteInfo[]
  selectedPropertyId: string | null
  selectedSiteUrl: string | null
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export function EditorialIntelligenceCard() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const [state, setState] = useState<ConnectionState>({
    connected: false, properties: [], sites: [], selectedPropertyId: null, selectedSiteUrl: null,
  })
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const [saving, setSaving]   = useState<string | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const loadConnections = useCallback(async () => {
    try {
      const [propsRes, sitesRes] = await Promise.all([
        fetch('/api/integrations/google/properties').then(r => r.json()),
        fetch('/api/integrations/google/sites').then(r => r.json()),
      ])
      setState({
        connected:          propsRes.connected || sitesRes.connected,
        properties:         propsRes.properties ?? [],
        sites:              sitesRes.sites ?? [],
        selectedPropertyId: propsRes.selectedId ?? null,
        selectedSiteUrl:    sitesRes.selectedUrl ?? null,
      })
    } catch {
      showToast('Failed to load Google connection', false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConnections()
    const connected = searchParams.get('connected')
    const error     = searchParams.get('error')
    if (connected === 'google') {
      showToast('Google Analytics connected successfully.', true)
      router.replace(pathname)
    }
    if (error) {
      showToast(`Connection failed: ${error.replace(/_/g, ' ')}`, false)
      router.replace(pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSelectProperty(prop: PropertyInfo) {
    if (saving) return
    setSaving(prop.propertyId)
    const res = await fetch('/api/integrations/google/select-property', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ propertyId: prop.propertyId, propertyName: prop.displayName }),
    })
    setSaving(null)
    if (!res.ok) { showToast('Failed to save GA4 property', false); return }
    setState(s => ({ ...s, selectedPropertyId: prop.propertyId }))
    showToast(`GA4 property set to "${prop.displayName}"`, true)
  }

  async function handleSelectSite(site: SiteInfo) {
    if (saving) return
    setSaving(site.siteUrl)
    const res = await fetch('/api/integrations/google/select-site', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ siteUrl: site.siteUrl }),
    })
    setSaving(null)
    if (!res.ok) { showToast('Failed to save Search Console site', false); return }
    setState(s => ({ ...s, selectedSiteUrl: site.siteUrl }))
    showToast(`Search Console site set to "${site.siteUrl}"`, true)
  }

  async function handleDisconnect() {
    const res = await fetch('/api/integrations/google/disconnect', { method: 'POST' })
    if (!res.ok) { showToast('Failed to disconnect Google Analytics', false); return }
    setState({ connected: false, properties: [], sites: [], selectedPropertyId: null, selectedSiteUrl: null })
    showToast('Google Analytics disconnected.', true)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      {toast && (
        <div className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg ${
          toast.ok ? 'border-zinc-200 bg-white text-zinc-900' : 'border-red-100 bg-red-50 text-red-800'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 transition-all duration-200${!state.connected ? ' grayscale opacity-50' : ''}`}>
            <GoogleIcon className="h-5 w-5" />
          </div>
          <div className="pt-0.5">
            <h3 className="font-[Signifier,_Georgia,_serif] text-base font-semibold leading-tight text-zinc-900">
              Editorial Intelligence
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">GA4 sessions, conversions, and organic search performance</p>
          </div>
        </div>
        {state.connected ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-xs text-zinc-400 transition-colors hover:text-red-500"
          >
            Disconnect
          </button>
        ) : (
          <a
            href={`/api/integrations/google/connect?returnTo=${encodeURIComponent(pathname)}`}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Connect Google
          </a>
        )}
      </div>

      {state.connected && (
        <div className="mt-5 space-y-5 border-t border-zinc-100 pt-5">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">GA4 Property</p>
            {state.properties.length === 0 ? (
              <p className="text-sm text-zinc-400">No GA4 properties found on this account.</p>
            ) : (
              <div className="space-y-1">
                {state.properties.map(prop => (
                  <button
                    type="button"
                    key={prop.propertyId}
                    onClick={() => handleSelectProperty(prop)}
                    disabled={!!saving}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
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
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">Search Console Site</p>
            {state.sites.length === 0 ? (
              <p className="text-sm text-zinc-400">No verified sites found in Search Console.</p>
            ) : (
              <div className="space-y-1">
                {state.sites.map(site => (
                  <button
                    type="button"
                    key={site.siteUrl}
                    onClick={() => handleSelectSite(site)}
                    disabled={!!saving}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                      state.selectedSiteUrl === site.siteUrl
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="truncate">{site.siteUrl}</span>
                    <span className="ml-2 shrink-0 text-xs opacity-60">{site.permissionLevel}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
