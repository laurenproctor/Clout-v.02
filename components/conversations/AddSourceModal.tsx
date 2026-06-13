'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Mode = 'source' | 'monitor'

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

function isLinkedInUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url.trim())
    if (hostname !== 'linkedin.com' && hostname !== 'www.linkedin.com') return false
    return pathname.startsWith('/in/') || pathname.startsWith('/company/') || pathname.startsWith('/posts/')
  } catch { return false }
}

export function AddSourceModal({ onAdded, onSourceCreated, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('source')

  // Source mode state
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [notesMode, setNotesMode] = useState(false)

  // Monitor mode state
  const [keyword, setKeyword] = useState('')
  const [monitorTitle, setMonitorTitle] = useState('')
  const [monitorProvider, setMonitorProvider] = useState<'reddit' | 'linkedin'>('reddit')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const showNotesToggle  = mode === 'source' && isSubstackUrl(url)
  const showRedditHint   = mode === 'source' && isRedditUrl(url)
  const showLinkedInHint = mode === 'source' && isLinkedInUrl(url)

  async function postSource(sourceUrl: string, sourceTitle: string | null, nm: boolean) {
    const res = await fetch('/api/conversations/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl, title: sourceTitle, notesMode: nm }),
    })
    if (res.status === 409) return { duplicate: true }
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(data.error ?? `HTTP ${res.status}`)
    }
    return { duplicate: false }
  }

  async function submitSource(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const trimmedUrl   = url.trim()
      const trimmedTitle = title.trim() || null

      const articlesResult = await postSource(trimmedUrl, trimmedTitle, false)

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

  async function submitMonitor(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/conversations/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType:   'keyword',
          provider:     monitorProvider,
          keywordQuery: keyword.trim(),
          title:        monitorTitle.trim() || null,
        }),
      })
      if (res.status === 409) {
        setError('This keyword is already being monitored.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      onAdded()
      onSourceCreated?.(monitorTitle.trim() || keyword.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add monitor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold mb-1">{mode === 'monitor' ? 'Add monitor' : 'Add source'}</h2>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
          <button
            type="button"
            onClick={() => { setMode('source'); setError('') }}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${mode === 'source' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Source
          </button>
          <button
            type="button"
            onClick={() => { setMode('monitor'); setError('') }}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${mode === 'monitor' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Monitor
          </button>
        </div>

        {mode === 'source' ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Add a Substack, RSS feed, subreddit, LinkedIn profile, or any publication homepage.
            </p>
            <form onSubmit={submitSource} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">URL</label>
                <Input value={url} onChange={e => { setUrl(e.target.value); setNotesMode(false) }} autoFocus
                  placeholder="https://reddit.com/r/startups, https://linkedin.com/company/openai, or https://foo.substack.com" />
              </div>
              {showLinkedInHint && (
                <p className="text-xs text-muted-foreground -mt-1">
                  Monitor a person (<code>linkedin.com/in/username</code>), a company
                  (<code>linkedin.com/company/name</code>), or a specific post
                  (<code>linkedin.com/posts/…</code>). Only publicly visible content is ingested.
                </p>
              )}
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
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a keyword or phrase. Clout will search for conversations about it automatically.
            </p>
            <form onSubmit={submitMonitor} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Keyword or phrase</label>
                <Input value={keyword} onChange={e => setKeyword(e.target.value)} autoFocus
                  placeholder="fintech Africa, AI agents, SaaS pricing…" />
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Monitor on</p>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="monitor-provider" checked={monitorProvider === 'reddit'}
                      onChange={() => setMonitorProvider('reddit')} className="rounded" />
                    <span className="text-xs font-medium">Reddit</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="monitor-provider" checked={monitorProvider === 'linkedin'}
                      onChange={() => setMonitorProvider('linkedin')} className="rounded" />
                    <span className="text-xs font-medium">LinkedIn</span>
                    <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-700">Beta</span>
                    <span className="text-[10px] text-muted-foreground">read-only</span>
                  </label>
                  {(['Substack', 'News'] as const).map(n => (
                    <label key={n} className="flex items-center gap-2 cursor-not-allowed opacity-50">
                      <input type="radio" disabled className="rounded" />
                      <span className="text-xs">{n}</span>
                      <span className="text-[10px] text-muted-foreground">coming soon</span>
                    </label>
                  ))}
                </div>
                {monitorProvider === 'linkedin' && (
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Monitors LinkedIn conversations through an opt-in beta connector. Read-only —
                    Clout will not comment, react, or post. Requires connecting the LinkedIn beta
                    connector in Settings → Publishing.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Display name <span className="font-normal">(optional)</span>
                </label>
                <Input value={monitorTitle} onChange={e => setMonitorTitle(e.target.value)}
                  placeholder={keyword.trim() || 'My monitor'} />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={!keyword.trim() || submitting}>
                  {submitting ? 'Adding…' : 'Add Monitor'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
