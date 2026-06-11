'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props { onAdded: () => void; onSourceCreated?: (label: string) => void; onClose: () => void }

function isSubstackUrl(url: string): boolean {
  try { return /\.substack\.com(\/|$)/.test(url.trim()) } catch { return false }
}

function isRedditUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url.trim())
    return hostname === 'reddit.com' || hostname === 'www.reddit.com' || hostname === 'old.reddit.com'
  } catch { return false }
}

export function AddSourceModal({ onAdded, onSourceCreated, onClose }: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [notesMode, setNotesMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const showNotesToggle = isSubstackUrl(url)
  const showRedditHint  = isRedditUrl(url)

  async function postSource(sourceUrl: string, sourceTitle: string | null, mode: boolean) {
    const res = await fetch('/api/conversations/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl, title: sourceTitle, notesMode: mode }),
    })
    if (res.status === 409) return { duplicate: true }
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(data.error ?? `HTTP ${res.status}`)
    }
    return { duplicate: false }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const trimmedUrl   = url.trim()
      const trimmedTitle = title.trim() || null

      // Always create the articles source
      const articlesResult = await postSource(trimmedUrl, trimmedTitle, false)

      // If Notes mode is on, also create the notes-specific source
      if (notesMode && showNotesToggle) {
        const notesTitle = trimmedTitle ? `${trimmedTitle} — Notes` : null
        const notesResult = await postSource(trimmedUrl, notesTitle, true)
        if (notesResult.duplicate && articlesResult.duplicate) {
          setError('Both sources are already being monitored.')
          return
        }
      } else if (articlesResult.duplicate) {
        setError('This source is already being monitored.')
        return
      }

      onAdded()
      onSourceCreated?.(trimmedTitle ?? trimmedUrl)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold mb-1">Add Source</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add a Substack publication, RSS feed URL, or any publication homepage.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">URL</label>
            <Input value={url} onChange={e => { setUrl(e.target.value); setNotesMode(false) }} autoFocus
              placeholder="https://foo.substack.com, https://stratechery.com, or https://reddit.com/r/startups" />
          </div>
          {showRedditHint && (
            <p className="text-xs text-muted-foreground -mt-1">
              Add a subreddit (<code>reddit.com/r/startups</code>), a global search
              (<code>reddit.com/search?q=saas+pricing</code>), or a subreddit-scoped search
              (<code>reddit.com/r/startups/search?q=pricing</code>).
            </p>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Display name <span className="font-normal">(optional)</span>
            </label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Stratechery" />
          </div>

          {showNotesToggle && (
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={notesMode}
                onChange={e => setNotesMode(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <div>
                <span className="text-xs font-medium">Also monitor Notes (short-form posts)</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track short-form observations from this author alongside their articles.
                  Creates a separate source.
                </p>
              </div>
            </label>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!url.trim() || submitting}>
              {submitting ? 'Adding…' : 'Add Source'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
