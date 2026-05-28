'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopicSelector } from '@/components/feed/TopicSelector'
import { FocusAreaSelector } from '@/components/feed/FocusAreaSelector'
import { CompetitorInput } from '@/components/feed/CompetitorInput'
import { EditorialVoiceSelector } from '@/components/feed/EditorialVoiceSelector'

interface FeedSettings {
  brand_name: string
  content_topics: string[]
  services: string[]
  competitors: string[]
  editorial_voices: string[]
}

export default function SignalFeedSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<FeedSettings>({
    brand_name: '',
    content_topics: [],
    services: [],
    competitors: [],
    editorial_voices: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch('/api/feed/settings')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: FeedSettings) => {
        setSettings(data)
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
          editorial_voices: settings.editorial_voices,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setToast({ message: 'Settings saved', type: 'success' })
      router.refresh()
    } catch {
      setToast({ message: 'Failed to save settings', type: 'error' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-semibold text-zinc-900">Signal Feed</h1>
      <p className="mt-1 text-sm text-zinc-500">Edit your feed configuration. Changes apply when you save.</p>

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
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
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
