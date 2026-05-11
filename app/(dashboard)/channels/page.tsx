'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Share2, Mail, Globe, ExternalLink, RefreshCw, Unlink, CheckCircle2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.72a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.535 10.458c-.155-.068-.312-.133-.471-.193-.279-3.566-2.143-5.608-5.41-5.627h-.04c-1.963 0-3.596.837-4.606 2.358l1.718 1.176c.75-1.137 1.927-1.38 2.889-1.38h.027c1.111.007 1.949.33 2.495.96.396.453.658 1.08.788 1.872a14.95 14.95 0 0 0-1.921-.13c-1.935 0-3.34.574-4.178 1.71-.699.942-.848 2.164-.44 3.434.574 1.795 2.138 2.866 4.009 2.866.167 0 .336-.008.507-.024 1.545-.148 2.722-.852 3.498-2.095.597-.95.973-2.182 1.12-3.661.673.406 1.171.94 1.449 1.587.481 1.12.509 2.958-.99 4.455-1.313 1.31-2.892 1.878-5.271 1.895-2.646-.02-4.651-.868-5.961-2.522-1.232-1.556-1.865-3.817-1.883-6.723.018-2.905.651-5.167 1.883-6.722C9.27 3.712 11.276 2.864 13.921 2.844c2.661.02 4.704.872 6.071 2.531.671.82 1.175 1.855 1.503 3.075l2.008-.535c-.395-1.469-1.025-2.74-1.881-3.793C19.888 1.877 17.362.773 13.929.75h-.016c-3.432.022-5.921 1.139-7.549 3.083-1.463 1.768-2.214 4.277-2.241 8.165v.004c.027 3.889.778 6.397 2.241 8.165 1.628 1.942 4.117 3.06 7.549 3.082h.016c3.041-.02 5.192-.817 6.949-2.573 2.091-2.088 2.027-4.727 1.34-6.339-.512-1.192-1.493-2.158-3.183-2.88zM13.73 16.011c-1.174.082-2.113-.527-2.435-1.537-.2-.628-.109-1.17.273-1.674.473-.638 1.251-.96 2.312-.96h.039c.525.003 1.024.06 1.489.169-.17 2.048-.847 3.064-1.678 3.002z" />
    </svg>
  )
}

type Platform = 'linkedin' | 'newsletter' | 'twitter' | 'instagram' | 'tiktok' | 'facebook' | 'threads'

interface Channel {
  id: string
  platform: Platform
  label: string | null
  account_type: string
  is_active: boolean
  token_expires_at: number | null  // unix timestamp seconds; null = no credential (newsletter/blog)
}

interface ReadyOutput {
  id: string
  title: string | null
  status: string
  updated_at: string
  channels: { platform: Platform; label: string | null } | null
}

interface PendingPage {
  id: string
  name: string
}

interface PendingAccount {
  id: string
  username: string
  name: string
}

interface PendingLiProfile {
  id: string
  name: string
  type: 'personal' | 'page'
}

const PLATFORMS: {
  key: Platform | 'blog'
  name: string
  Icon: React.ComponentType<{ className?: string }>
  tagline: string
  available: boolean
  connectHref: string | null
}[] = [
  {
    key: 'linkedin',
    name: 'LinkedIn',
    Icon: Share2,
    tagline: 'Publish directly to your profile.',
    available: true,
    connectHref: '/api/channels/linkedin/connect',
  },
  {
    key: 'threads',
    name: 'Threads',
    Icon: ThreadsIcon,
    tagline: 'Publish directly to your Threads profile.',
    available: true,
    connectHref: '/api/channels/threads/connect',
  },
  {
    key: 'twitter',
    name: 'X (Twitter)',
    Icon: XIcon,
    tagline: 'Publish directly to your X profile.',
    available: true,
    connectHref: '/api/channels/twitter/connect',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    Icon: InstagramIcon,
    tagline: 'Connect your Business or Creator account.',
    available: true,
    connectHref: '/api/channels/instagram/connect',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    Icon: TikTokIcon,
    tagline: 'Connect your TikTok account.',
    available: true,
    connectHref: '/api/channels/tiktok/connect',
  },
  {
    key: 'facebook',
    name: 'Facebook',
    Icon: FacebookIcon,
    tagline: 'Publish to your Facebook Page.',
    available: true,
    connectHref: '/api/channels/facebook/connect',
  },
  {
    key: 'newsletter',
    name: 'Email',
    Icon: Mail,
    tagline: 'Newsletter export — coming soon.',
    available: false,
    connectHref: null,
  },
  {
    key: 'blog',
    name: 'Blog',
    Icon: Globe,
    tagline: 'Markdown export — coming soon.',
    available: false,
    connectHref: null,
  },
]

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function AccountTypeBadge({ type }: { type: string }) {
  if (type === 'personal') return null
  return (
    <span className="rounded-full border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 capitalize">
      {type}
    </span>
  )
}

const SEVEN_DAYS_S = 7 * 24 * 60 * 60
const ONE_DAY_S    = 24 * 60 * 60

function tokenExpiryStatus(expiresAt: number | null): 'ok' | 'soon' | 'expired' | 'none' {
  if (expiresAt === null) return 'none'
  const nowS = Math.floor(Date.now() / 1000)
  if (expiresAt < nowS) return 'expired'
  if (expiresAt < nowS + SEVEN_DAYS_S) return 'soon'
  return 'ok'
}

function TokenExpiryWarning({ expiresAt, connectHref }: { expiresAt: number | null; connectHref: string | null }) {
  const status = tokenExpiryStatus(expiresAt)
  if (status === 'ok' || status === 'none') return null

  const daysLeft = expiresAt !== null
    ? Math.max(0, Math.floor((expiresAt - Math.floor(Date.now() / 1000)) / ONE_DAY_S))
    : 0

  const isExpired = status === 'expired'
  const label = isExpired
    ? 'Session expired — reconnect to publish'
    : daysLeft === 0
      ? 'Session expires today — reconnect'
      : `Session expires in ${daysLeft}d — reconnect`

  return (
    <span className={cn(
      'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
      isExpired
        ? 'bg-red-50 text-red-600 border border-red-200'
        : 'bg-amber-50 text-amber-700 border border-amber-200'
    )}>
      {connectHref ? (
        <a href={connectHref}>{label}</a>
      ) : label}
    </span>
  )
}

// ─── Picker modal ─────────────────────────────────────────────────────────────

function PickerModal({
  title,
  items,
  onSelect,
  onClose,
}: {
  title: string
  items: { id: string; label: string }[]
  onSelect: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [selecting, setSelecting] = useState<string | null>(null)

  async function pick(id: string) {
    setSelecting(id)
    await onSelect(id)
    setSelecting(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => pick(item.id)}
              disabled={!!selecting}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                selecting === item.id
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400'
              )}
            >
              {selecting === item.id ? 'Connecting…' : item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function PublishingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>([])
  const [ready, setReady] = useState<ReadyOutput[]>([])
  const [totalPublished, setTotalPublished] = useState(0)
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Picker state
  const [fbPages, setFbPages] = useState<PendingPage[] | null>(null)
  const [igAccounts, setIgAccounts] = useState<PendingAccount[] | null>(null)
  const [liProfiles, setLiProfiles] = useState<PendingLiProfile[] | null>(null)

  function flash(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const loadChannels = useCallback(async () => {
    const res = await fetch('/api/channels')
    if (res.ok) setChannels(await res.json())
  }, [])

  async function load() {
    const [cRes, approvedRes, publishedRes] = await Promise.all([
      fetch('/api/channels'),
      fetch('/api/outputs?status=approved'),
      fetch('/api/outputs?status=published'),
    ])
    if (cRes.ok) setChannels(await cRes.json())
    const approvedOutputs: ReadyOutput[] = approvedRes.ok ? await approvedRes.json() : []
    const publishedOutputs: ReadyOutput[] = publishedRes.ok ? await publishedRes.json() : []
    setReady(approvedOutputs.slice(0, 10))
    setTotalPublished(publishedOutputs.length)
    setLastPublishedAt(publishedOutputs[0]?.updated_at ?? null)
    setLoading(false)
  }

  // Handle ?connected=, ?error=, ?select= params
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error     = searchParams.get('error')
    const select    = searchParams.get('select')

    if (connected === 'linkedin')                       flash('LinkedIn connected.', true)
    else if (connected === 'twitter')                   flash('X (Twitter) connected.', true)
    else if (connected === 'threads')                   flash('Threads connected.', true)
    else if (connected === 'facebook')                  flash('Facebook connected.', true)
    else if (connected === 'instagram')                 flash('Instagram connected.', true)
    else if (connected === 'tiktok')                    flash('TikTok connected.', true)
    else if (error === 'facebook_no_pages')             flash('No Facebook Pages found. Create a Page and try again.', false)
    else if (error === 'instagram_no_business_account') flash('No Instagram Business account found. Link one to a Facebook Page and try again.', false)
    else if (error === 'twitter_pkce_missing')          flash('Session expired — please try again.', false)
    else if (error === 'tiktok_pkce_missing')           flash('Session expired — please try again.', false)
    else if (error === 'session_expired')               flash('Session expired — please try again.', false)
    else if (error === 'token_exchange_failed')         flash('The platform rejected the connection. Check your app credentials.', false)
    else if (error === 'profile_fetch_failed')          flash('Connected but couldn\'t fetch your profile. Try again.', false)
    else if (error === 'channel_db_failed')             flash('Database error saving channel. Try again.', false)
    else if (error === 'credential_db_failed')          flash('Database error saving credentials. Try again.', false)
    else if (error === 'connect_failed')                flash('Connection failed. Please try again.', false)
    else if (error)                                     flash('Connection cancelled.', false)

    if (select === 'facebook') {
      fetch('/api/channels/facebook/pending-pages')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.pages) setFbPages(data.pages) })
      router.replace('/channels')
    } else if (select === 'instagram') {
      fetch('/api/channels/instagram/pending-accounts')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.accounts) setIgAccounts(data.accounts) })
      router.replace('/channels')
    } else if (select === 'linkedin') {
      fetch('/api/channels/linkedin/pending-profiles')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.profiles) setLiProfiles(data.profiles) })
      router.replace('/channels')
    } else if (connected || error) {
      router.replace('/channels')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDisconnect(channelId: string) {
    if (!confirm('Disconnect this account?')) return
    await fetch(`/api/channels/${channelId}`, { method: 'DELETE' })
    setChannels(prev => prev.filter(c => c.id !== channelId))
    flash('Account disconnected.', true)
  }

  // ── FB page picker select
  async function handleSelectFbPage(pageId: string) {
    const res = await fetch('/api/channels/facebook/select-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId }),
    })
    if (res.ok) {
      setFbPages(null)
      await loadChannels()
      flash('Facebook page connected.', true)
    } else {
      const data = await res.json().catch(() => ({}))
      flash(data.error ?? 'Failed to connect page.', false)
    }
  }

  // ── LinkedIn profile/page picker select
  async function handleSelectLiProfile(profileId: string) {
    const res = await fetch('/api/channels/linkedin/select-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId }),
    })
    if (res.ok) {
      setLiProfiles(null)
      await loadChannels()
      flash('LinkedIn account connected.', true)
    } else {
      const data = await res.json().catch(() => ({}))
      flash(data.error ?? 'Failed to connect account.', false)
    }
  }

  // ── IG account picker select
  async function handleSelectIgAccount(accountId: string) {
    const res = await fetch('/api/channels/instagram/select-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
    if (res.ok) {
      setIgAccounts(null)
      await loadChannels()
      flash('Instagram account connected.', true)
    } else {
      const data = await res.json().catch(() => ({}))
      flash(data.error ?? 'Failed to connect account.', false)
    }
  }

  const PUBLISH_ROUTES: Partial<Record<Platform, string>> = {
    linkedin:  '/api/channels/linkedin/post',
    threads:   '/api/channels/threads/post',
    twitter:   '/api/channels/twitter/post',
    facebook:  '/api/channels/facebook/post',
  }

  const PLATFORM_LABELS: Partial<Record<Platform, string>> = {
    linkedin: 'LinkedIn',
    threads:  'Threads',
    twitter:  'X (Twitter)',
    facebook: 'Facebook',
  }

  async function handlePublishNow(outputId: string, platform: Platform) {
    const route = PUBLISH_ROUTES[platform]
    if (!route) return
    setPublishing(outputId)
    const res = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputId }),
    })
    const data = await res.json()
    const label = PLATFORM_LABELS[platform] ?? platform
    if (res.ok) {
      if (!data.alreadyPublished) {
        setTotalPublished(n => n + 1)
        setLastPublishedAt(new Date().toISOString())
      }
      flash(data.alreadyPublished ? `Already posted to ${label}.` : `Posted to ${label}.`, true)
      setReady(prev => prev.filter(o => o.id !== outputId))
    } else {
      flash(data.error ?? 'Publish failed.', false)
    }
    setPublishing(null)
  }

  return (
    <div className="max-w-xl space-y-10">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-5 right-5 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg transition-all',
          toast.ok
            ? 'border-zinc-200 bg-white text-zinc-900'
            : 'border-red-100 bg-red-50 text-red-800'
        )}>
          {toast.msg}
        </div>
      )}

      {/* LinkedIn profile/page picker */}
      {liProfiles && (
        <PickerModal
          title="Choose a LinkedIn account to connect"
          items={liProfiles.map(p => ({
            id:    p.id,
            label: p.type === 'page' ? `${p.name} · Company Page` : `${p.name} · Personal Profile`,
          }))}
          onSelect={handleSelectLiProfile}
          onClose={() => setLiProfiles(null)}
        />
      )}

      {/* FB page picker */}
      {fbPages && (
        <PickerModal
          title="Choose a Facebook Page to connect"
          items={fbPages.map(p => ({ id: p.id, label: p.name }))}
          onSelect={handleSelectFbPage}
          onClose={() => setFbPages(null)}
        />
      )}

      {/* IG account picker */}
      {igAccounts && (
        <PickerModal
          title="Choose an Instagram account to connect"
          items={igAccounts.map(a => ({ id: a.id, label: `@${a.username}` + (a.name !== a.username ? ` · ${a.name}` : '') }))}
          onSelect={handleSelectIgAccount}
          onClose={() => setIgAccounts(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Publishing</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Connect accounts. Publish approved drafts.</p>
        </div>
        {!loading && totalPublished > 0 && (
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums text-zinc-900">{totalPublished}</p>
            <p className="text-xs text-zinc-400">posts published</p>
            {lastPublishedAt && (
              <p className="mt-0.5 text-xs text-zinc-300">last {relativeTime(lastPublishedAt)}</p>
            )}
          </div>
        )}
      </div>

      {/* Accounts — grouped by platform */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">Accounts</h2>
        <div className="space-y-3">
          {PLATFORMS.map(({ key, name, Icon, tagline, available, connectHref }) => {
            const platformChannels = channels.filter(c => c.platform === (key as Platform) && c.is_active)
            const isConnected = platformChannels.length > 0

            return (
              <div key={key} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                {/* Platform header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                    isConnected ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-zinc-900">{name}</p>
                      {isConnected && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                    </div>
                    {!isConnected && (
                      <p className="text-xs text-zinc-400">{tagline}</p>
                    )}
                  </div>
                  {/* Connect button (shown in header when not yet connected) */}
                  {!isConnected && available && connectHref && (
                    <a
                      href={connectHref}
                      className="shrink-0 rounded-lg border border-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 transition-colors"
                    >
                      Connect
                    </a>
                  )}
                  {!available && (
                    <span className="shrink-0 text-xs text-zinc-300">Soon</span>
                  )}
                </div>

                {/* Connected account rows */}
                {platformChannels.map(ch => (
                  <div key={ch.id} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 last:border-b-0">
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-zinc-700 truncate">{ch.label ?? 'Connected account'}</p>
                      <AccountTypeBadge type={ch.account_type} />
                      <TokenExpiryWarning expiresAt={ch.token_expires_at} connectHref={connectHref} />
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {connectHref && (
                        <a href={connectHref} className="text-zinc-300 hover:text-zinc-600 transition-colors" title="Reconnect">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => handleDisconnect(ch.id)} className="text-zinc-300 hover:text-red-400 transition-colors" title="Disconnect">
                        <Unlink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add another account row */}
                {isConnected && available && connectHref && (
                  <a
                    href={connectHref}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Connect another {name} account
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Ready to Publish */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">Ready to Publish</h2>
          {ready.length > 0 && (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
              {ready.length}
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-[60px] rounded-xl border border-zinc-100 bg-white animate-pulse" />)}
          </div>
        ) : ready.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-zinc-900">Nothing approved yet</p>
            <p className="mt-1 text-sm text-zinc-400">Approve a draft in Studio to queue it here.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {ready.map(output => {
              const outputPlatform = output.channels?.platform
              const canPost = outputPlatform != null &&
                outputPlatform in PUBLISH_ROUTES &&
                channels.some(c => c.platform === outputPlatform && c.is_active)
              return (
                <div key={output.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {output.title ?? 'Untitled draft'}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {output.channels?.label ?? output.channels?.platform ?? 'No channel'}
                      {' · '}
                      {relativeTime(output.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canPost && outputPlatform && (
                      <button
                        onClick={() => handlePublishNow(output.id, outputPlatform)}
                        disabled={!!publishing}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                          publishing === output.id
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                            : 'bg-zinc-900 text-white hover:bg-zinc-700'
                        )}
                      >
                        {publishing === output.id ? 'Posting…' : 'Post now'}
                      </button>
                    )}
                    <a href={`/studio/${output.id}`} className="text-zinc-300 hover:text-zinc-500 transition-colors" title="Open in Studio">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}

export default function ChannelsPage() {
  return <Suspense><PublishingContent /></Suspense>
}
