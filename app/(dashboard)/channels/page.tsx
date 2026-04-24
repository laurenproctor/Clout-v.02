'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Share2, Mail, Globe, ExternalLink, RefreshCw, Unlink, CheckCircle2 } from 'lucide-react'
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

type Platform = 'linkedin' | 'newsletter' | 'twitter' | 'instagram' | 'tiktok' | 'facebook'

interface Channel {
  id: string
  platform: Platform
  label: string | null
  is_active: boolean
}

interface ReadyOutput {
  id: string
  title: string | null
  status: string
  updated_at: string
  channels: { platform: Platform; label: string | null } | null
}

const PLATFORMS = [
  {
    key: 'linkedin' as const,
    name: 'LinkedIn',
    Icon: Share2,
    tagline: 'Publish directly to your profile.',
    available: true,
    connectHref: '/api/channels/linkedin/connect',
  },
  {
    key: 'twitter' as const,
    name: 'X (Twitter)',
    Icon: XIcon,
    tagline: 'Coming soon.',
    available: false,
    connectHref: null,
  },
  {
    key: 'instagram' as const,
    name: 'Instagram',
    Icon: InstagramIcon,
    tagline: 'Coming soon.',
    available: false,
    connectHref: null,
  },
  {
    key: 'tiktok' as const,
    name: 'TikTok',
    Icon: TikTokIcon,
    tagline: 'Coming soon.',
    available: false,
    connectHref: null,
  },
  {
    key: 'facebook' as const,
    name: 'Facebook',
    Icon: FacebookIcon,
    tagline: 'Coming soon.',
    available: false,
    connectHref: null,
  },
  {
    key: 'newsletter' as const,
    name: 'Email',
    Icon: Mail,
    tagline: 'Newsletter export — coming soon.',
    available: false,
    connectHref: null,
  },
  {
    key: 'blog' as const,
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

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error     = searchParams.get('error')
    if (connected === 'linkedin')                flash('LinkedIn connected.', true)
    else if (connected === 'twitter')            flash('X (Twitter) connected.', true)
    else if (error === 'linkedin_denied')        flash('Connection cancelled.', false)
    else if (error === 'twitter_denied')         flash('Connection cancelled.', false)
    else if (error === 'twitter_pkce_missing')   flash('Session expired — please try again.', false)
    else if (error === 'session_expired')        flash('Session expired — please try again.', false)
    else if (error === 'token_exchange_failed')  flash('The platform rejected the connection. Check your app credentials.', false)
    else if (error === 'profile_fetch_failed')   flash('Connected but couldn\'t fetch your profile. Try again.', false)
    else if (error === 'channel_db_failed')      flash('Database error saving channel. Try again.', false)
    else if (error === 'credential_db_failed')   flash('Database error saving credentials. Try again.', false)
    else if (error === 'connect_failed')         flash('Connection failed. Please try again.', false)
    if (connected || error) router.replace('/channels')
  }, [])

  function flash(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

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

  useEffect(() => { load() }, [])

  async function handleDisconnect(channelId: string) {
    if (!confirm('Disconnect this account?')) return
    await fetch(`/api/channels/${channelId}`, { method: 'DELETE' })
    setChannels(prev => prev.filter(c => c.id !== channelId))
    flash('Account disconnected.', true)
  }

  async function handlePublishNow(outputId: string) {
    setPublishing(outputId)
    const res = await fetch('/api/channels/linkedin/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputId }),
    })
    const data = await res.json()
    if (res.ok) {
      if (!data.alreadyPublished) {
        setTotalPublished(n => n + 1)
        setLastPublishedAt(new Date().toISOString())
      }
      flash(data.alreadyPublished ? 'Already posted to LinkedIn.' : 'Posted to LinkedIn.', true)
      setReady(prev => prev.filter(o => o.id !== outputId))
    } else {
      flash(data.error ?? 'Publish failed.', false)
    }
    setPublishing(null)
  }

  const linkedInChannel = channels.find(c => c.platform === 'linkedin' && c.is_active)

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

      {/* Header + momentum */}
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

      {/* Accounts */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">Accounts</h2>
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white overflow-hidden">
          {PLATFORMS.map(({ key, name, Icon, tagline, available, connectHref }) => {
            const ch = channels.find(c => c.platform === key)
            const isConnected = ch?.is_active ?? false
            return (
              <div key={key} className="flex items-center gap-4 px-5 py-4">
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isConnected ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-zinc-900">{name}</p>
                    {isConnected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    {isConnected && ch?.label ? ch.label : tagline}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {isConnected ? (
                    available && ch && connectHref && (
                      <>
                        <a href={connectHref} className="text-zinc-300 hover:text-zinc-600 transition-colors" title="Reconnect">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </a>
                        <button onClick={() => handleDisconnect(ch.id)} className="text-zinc-300 hover:text-red-400 transition-colors" title="Disconnect">
                          <Unlink className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )
                  ) : available && connectHref ? (
                    <a
                      href={connectHref}
                      className="rounded-lg border border-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 transition-colors"
                    >
                      Connect
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-300">Soon</span>
                  )}
                </div>
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
              const canPost = linkedInChannel && output.channels?.platform === 'linkedin'
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
                    {canPost && (
                      <button
                        onClick={() => handlePublishNow(output.id)}
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
