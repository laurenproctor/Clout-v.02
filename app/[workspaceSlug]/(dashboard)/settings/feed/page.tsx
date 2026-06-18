'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { SettingsPageSkeleton } from '@/components/loading/settings-page-skeleton'
import { TopicSelector } from '@/components/feed/TopicSelector'
import { FocusAreaSelector } from '@/components/feed/FocusAreaSelector'
import { CompetitorInput } from '@/components/feed/CompetitorInput'
import { EditorialVoiceSelector } from '@/components/feed/EditorialVoiceSelector'
import type { CompetitorMetadata } from '@/types/feed'

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

interface FeedSettings {
  brand_name: string
  content_topics: string[]
  services: string[]
  competitors: string[]
  competitor_metadata: CompetitorMetadata
  editorial_voices: string[]
  website_url: string
}

interface RefreshResultData {
  newCards: number
  existingCardsRefreshed: number
  articlesReturned: number
  errors?: Array<{ code: string }>
}

// Map a completed refresh response to user-facing copy. Provider error codes are
// translated to operational messages — raw codes/internals are never shown.
function describeRefreshResult(data: RefreshResultData): { text: string; isError: boolean; navigate: boolean } {
  const { newCards, existingCardsRefreshed, articlesReturned } = data
  const errors = data.errors ?? []
  const hasErrors = errors.length > 0
  const signals = (n: number) => `${n} new signal${n === 1 ? '' : 's'}`

  if (newCards > 0) {
    return hasErrors
      ? { text: `Added ${signals(newCards)}. Some topics couldn't be refreshed.`, isError: false, navigate: true }
      : { text: `Added ${signals(newCards)}. Opening your feed…`, isError: false, navigate: true }
  }

  if (existingCardsRefreshed > 0) {
    return hasErrors
      ? { text: 'No new signals found. Some topics couldn’t be refreshed.', isError: false, navigate: false }
      : { text: `No new signals found. Refreshed ${existingCardsRefreshed} existing signal${existingCardsRefreshed === 1 ? '' : 's'}.`, isError: false, navigate: false }
  }

  if (!hasErrors && articlesReturned === 0) {
    return { text: 'No new articles found for your topics right now.', isError: false, navigate: false }
  }

  // No cards and provider errors — translate the dominant cause to operational copy.
  const codes = new Set(errors.map(e => e.code))
  let text: string
  if (codes.has('missing_api_key')) {
    text = 'News refresh isn’t configured correctly.'
  } else if (codes.has('rate_limited') || codes.has('timeout')) {
    text = 'The news source is temporarily unavailable. Try again shortly.'
  } else {
    text = 'The news source is having trouble right now. Try again shortly.'
  }
  return { text, isError: true, navigate: false }
}

function SignalFeedSettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const isSetup = searchParams.get('setup') === '1'
  const workspaceSlug = params.workspaceSlug as string

  const [settings, setSettings] = useState<FeedSettings>({
    brand_name: '',
    content_topics: [],
    services: [],
    competitors: [],
    competitor_metadata: {},
    editorial_voices: [],
    website_url: '',
  })
  const [savedWebsiteUrl, setSavedWebsiteUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savingWebsite, setSavingWebsite] = useState(false)
  const [websiteSaved, setWebsiteSaved] = useState(false)
  const [websiteError, setWebsiteError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const loaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveData = useRef(settings)
  useEffect(() => { saveData.current = settings })

  useEffect(() => {
    fetch('/api/feed/settings')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: FeedSettings) => {
        const url = data.website_url ?? ''
        setSettings({
          ...data,
          competitor_metadata: data.competitor_metadata ?? {},
          website_url: url,
        })
        setSavedWebsiteUrl(url)
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setTimeout(() => { loaded.current = true }, 0)
      })
  }, [])

  const handleSave = useCallback(async () => {
    setStatus('saving')
    setSaveError(null)
    const s = saveData.current
    try {
      const res = await fetch('/api/feed/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: s.brand_name || '',
          content_topics: s.content_topics,
          services: s.services,
          competitors: s.competitors,
          competitor_metadata: s.competitor_metadata,
          editorial_voices: s.editorial_voices,
          website_url: s.website_url || null,
        }),
      })
      if (res.ok) {
        setSavedWebsiteUrl(s.website_url)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setSaveError('Failed to save settings')
        setStatus('error')
      }
    } catch {
      setSaveError('Failed to save settings')
      setStatus('error')
    }
  }, [])

  // Auto-save on change — skipped in setup mode (user must click "Set Up Feed")
  useEffect(() => {
    if (!loaded.current || isSetup) return
    setStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(handleSave, 1500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [settings, handleSave, isSetup])

  async function handleSetup() {
    setStatus('saving')
    setSaveError(null)
    const s = saveData.current
    try {
      const res = await fetch('/api/feed/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: s.brand_name || '',
          content_topics: s.content_topics,
          services: s.services,
          competitors: s.competitors,
          competitor_metadata: s.competitor_metadata,
          editorial_voices: s.editorial_voices,
          website_url: s.website_url || null,
        }),
      })
      if (res.ok) {
        router.push(`/${workspaceSlug}/feed`)
      } else {
        setSaveError('Failed to save settings')
        setStatus('error')
      }
    } catch {
      setSaveError('Failed to save settings')
      setStatus('error')
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshMessage(null)
    try {
      const res = await fetch('/api/feed/refresh', { method: 'POST' })
      const data = await res.json()

      // Route/system failure (500) or the configuration guard (400).
      if (!res.ok || data?.ok === false) {
        setRefreshMessage({
          text: data?.message ?? data?.error ?? 'Refresh failed. Try again shortly.',
          isError: true,
        })
        setTimeout(() => setRefreshMessage(null), 4000)
        return
      }

      const { text, isError, navigate } = describeRefreshResult(data)

      // Navigate only when there are genuinely new cards. Pass the count so the
      // freshly-mounted feed can confirm the refresh (the settings message would
      // otherwise be lost in the navigation).
      if (navigate) {
        setRefreshMessage({ text, isError: false })
        router.push(`/${workspaceSlug}/feed?refresh=added&n=${data.newCards}`)
        return
      }

      setRefreshMessage({ text, isError })
      setTimeout(() => setRefreshMessage(null), 6000)
    } catch {
      setRefreshMessage({ text: 'Refresh failed. Try again shortly.', isError: true })
      setTimeout(() => setRefreshMessage(null), 4000)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSaveWebsite() {
    const url = settings.website_url?.trim()
    if (!url) return

    setSavingWebsite(true)
    setWebsiteError(null)
    try {
      let fullUrl = url
      if (!/^https?:\/\//i.test(fullUrl)) fullUrl = `https://${fullUrl}`

      const res = await fetch('/api/website-intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_url: fullUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')

      setSavedWebsiteUrl(fullUrl)
      setSettings(prev => ({ ...prev, website_url: fullUrl }))
      setWebsiteSaved(true)
      setTimeout(() => setWebsiteSaved(false), 5000)
    } catch (err) {
      // The API returns a curated, operational message (raw scrape/provider
      // errors are only logged server-side), so it's safe to show directly and
      // far more useful than a generic fallback.
      setWebsiteError(err instanceof Error ? err.message : 'Failed to analyze website')
      setTimeout(() => setWebsiteError(null), 6000)
    } finally {
      setSavingWebsite(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Sticky header — non-setup mode only */}
      {!isSetup && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-zinc-100 -mx-6 px-6 mb-6">
          <div className="flex items-center justify-between py-3">
            <div>
              <h1 className="text-base font-semibold text-zinc-900">Signal Feed</h1>
              <p className="text-xs text-zinc-400">Changes are saved automatically.</p>
            </div>
            <div className="flex items-center gap-3">
              {(status === 'unsaved' || status === 'error') && (
                <span className={cn('flex items-center gap-1.5 text-xs', {
                  'text-amber-500': status === 'unsaved',
                  'text-red-500': status === 'error',
                })}>
                  {status === 'unsaved' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />}
                  {status === 'unsaved' ? 'Unsaved changes' : (saveError ?? 'Save failed')}
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={status === 'saving' || status === 'saved'}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white transition-all',
                  status === 'saved'
                    ? 'bg-emerald-600 cursor-default'
                    : status === 'saving'
                      ? 'bg-zinc-900 opacity-50 cursor-not-allowed'
                      : 'bg-zinc-900 hover:bg-zinc-700'
                )}
              >
                {status === 'saved' && <Check className="h-3 w-3" />}
                {status === 'saving' && <Spinner size="xs" />}
                {status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSetup && (
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-900">Set up your Signal Feed</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tell us what topics, focus areas, and competitors matter to your brand. We&apos;ll surface the most relevant signals from across the web.
          </p>
        </div>
      )}

      {loading ? (
        <div className="mt-10 text-sm text-zinc-400">Loading…</div>
      ) : (
        <div className="mt-8 space-y-10">

          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Topics</p>
            <p className="mb-3 text-sm text-zinc-500">The subjects your feed monitors. Signals — news, trends, and conversations — are filtered to match these topics, so you only see what&apos;s relevant to your brand.</p>
            <TopicSelector
              selected={settings.content_topics}
              onChange={topics => setSettings(s => ({ ...s, content_topics: topics }))}
            />
          </section>

          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Focus Areas</p>
            <p className="mb-3 text-sm text-zinc-500">The specific services or products your brand offers. These sharpen the feed&apos;s relevance by prioritizing signals that relate to what you actually do — not just your broader industry.</p>
            <FocusAreaSelector
              selected={settings.services}
              onChange={services => setSettings(s => ({ ...s, services }))}
            />
          </section>

          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Competitors</p>
            <p className="mb-3 text-sm text-zinc-500">Brands you&apos;re competing with. The feed surfaces their content moves, press coverage, and campaigns alongside yours — so you can spot gaps and react before they pull ahead.</p>
            <CompetitorInput
              competitors={settings.competitors}
              onChange={competitors => setSettings(s => ({ ...s, competitors }))}
              competitorMetadata={settings.competitor_metadata}
              onMetadataChange={metadata => setSettings(s => ({ ...s, competitor_metadata: metadata }))}
            />
          </section>

          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Website Intelligence</p>
            <p className="mb-3 text-sm text-zinc-500">
              Your website gives the feed context about what you&apos;ve already covered. Once analyzed, signals are matched against your existing content so you can identify genuine gaps rather than topics you&apos;ve already addressed.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={settings.website_url}
                onChange={e => setSettings(s => ({ ...s, website_url: e.target.value }))}
                placeholder="https://example.com"
                className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-0"
              />
              {settings.website_url !== savedWebsiteUrl && !websiteSaved && (
                <button
                  onClick={handleSaveWebsite}
                  disabled={savingWebsite}
                  className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {savingWebsite ? 'Analyzing…' : 'Analyze'}
                </button>
              )}
              {websiteSaved && (
                <span className="shrink-0 flex items-center gap-1 text-sm text-green-600 font-medium">
                  <Check className="h-4 w-4" />
                  Analyzed
                </span>
              )}
            </div>
            {websiteError && <p className="mt-2 text-xs text-red-500">{websiteError}</p>}
          </section>

          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Editorial Voice</p>
            <p className="mb-3 text-sm text-zinc-500">The tone and perspective you write in. This shapes how signal summaries and content ideas are framed — so the feed speaks in a voice that already sounds like yours.</p>
            <EditorialVoiceSelector
              selected={settings.editorial_voices}
              onChange={voices => setSettings(s => ({ ...s, editorial_voices: voices }))}
            />
          </section>

          <div className="flex items-center gap-4 pt-2 border-t border-zinc-100">
            {isSetup ? (
              <>
                <button
                  onClick={handleSetup}
                  disabled={status === 'saving'}
                  className="bg-zinc-900 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'saving' ? 'Saving…' : 'Set Up Feed'}
                </button>
                {saveError && <span className="text-sm text-red-500">{saveError}</span>}
              </>
            ) : (
              <>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {refreshing ? 'Refreshing feed…' : 'Refresh feed'}
                </button>
                <Link
                  href={`/${workspaceSlug}/feed`}
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Go to Feed
                </Link>
                {refreshMessage && (
                  <span className={cn('text-sm', refreshMessage.isError ? 'text-red-500' : 'text-green-600')}>
                    {refreshMessage.text}
                  </span>
                )}
              </>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default function SignalFeedSettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SignalFeedSettingsContent />
    </Suspense>
  )
}
