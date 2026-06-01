'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { TopicSelector } from '@/components/feed/TopicSelector'
import { FocusAreaSelector } from '@/components/feed/FocusAreaSelector'
import { CompetitorInput } from '@/components/feed/CompetitorInput'
import { EditorialVoiceSelector } from '@/components/feed/EditorialVoiceSelector'
import type { CompetitorMetadata } from '@/types/feed'

interface FeedSettings {
  brand_name: string
  content_topics: string[]
  services: string[]
  competitors: string[]
  competitor_metadata: CompetitorMetadata
  editorial_voices: string[]
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
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch('/api/feed/settings')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: FeedSettings) => {
        setSettings({
          ...data,
          competitor_metadata: data.competitor_metadata ?? {},
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/feed/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: settings.brand_name || '',
          content_topics: settings.content_topics,
          services: settings.services,
          competitors: settings.competitors,
          competitor_metadata: settings.competitor_metadata,
          editorial_voices: settings.editorial_voices,
        }),
      })
      if (!res.ok) throw new Error('Save failed')

      if (isSetup) {
        router.push(`/${workspaceSlug}/feed`)
      } else {
        setToast({ message: 'Settings saved', type: 'success' })
        router.refresh()
        setTimeout(() => setToast(null), 3000)
      }
    } catch {
      setToast({ message: 'Failed to save settings', type: 'error' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {isSetup ? (
        <>
          <h1 className="text-xl font-semibold text-zinc-900">Set up your Signal Feed</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tell us what topics, focus areas, and competitors matter to your brand. We&apos;ll surface the most relevant signals from across the web.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold text-zinc-900">Signal Feed</h1>
          <p className="mt-1 text-sm text-zinc-500">Edit your feed configuration. Changes apply when you save.</p>
        </>
      )}

      {loading ? (
        <div className="mt-10 text-sm text-zinc-400">Loading…</div>
      ) : (
        <div className="mt-8 space-y-10">

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Topics</p>
            <TopicSelector
              selected={settings.content_topics}
              onChange={topics => setSettings(s => ({ ...s, content_topics: topics }))}
            />
          </section>

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Focus Areas</p>
            <FocusAreaSelector
              selected={settings.services}
              onChange={services => setSettings(s => ({ ...s, services }))}
            />
          </section>

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Competitors</p>
            <CompetitorInput
              competitors={settings.competitors}
              onChange={competitors => setSettings(s => ({ ...s, competitors }))}
              competitorMetadata={settings.competitor_metadata}
              onMetadataChange={metadata => setSettings(s => ({ ...s, competitor_metadata: metadata }))}
            />
          </section>

          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Editorial Voice</p>
            <EditorialVoiceSelector
              selected={settings.editorial_voices}
              onChange={voices => setSettings(s => ({ ...s, editorial_voices: voices }))}
            />
          </section>

          <div className="flex items-center gap-4 pt-2 border-t border-zinc-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-zinc-900 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : isSetup ? 'Set Up Feed' : 'Save Changes'}
            </button>
            {!isSetup && (
              <Link
                href={`/${workspaceSlug}/feed`}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Go to Feed
              </Link>
            )}
            {toast && (
              <span className={`text-sm ${toast.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {toast.message}
              </span>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default function SignalFeedSettingsPage() {
  return (
    <Suspense>
      <SignalFeedSettingsContent />
    </Suspense>
  )
}
