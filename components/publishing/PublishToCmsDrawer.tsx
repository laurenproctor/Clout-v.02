'use client'

import { useState, useEffect } from 'react'
import { Loader2, ExternalLink, Check } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { blogPackageToCanonical } from '@/lib/publishing/canonical/from-blog'
import { generateSlug } from '@/lib/publishing/canonical/normalizer'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'
import type { GeneratedBlogPackage } from '@/lib/blog/types'

interface PublishToCmsDrawerProps {
  open: boolean
  onClose: () => void
  blogPackage: GeneratedBlogPackage
  sourceId: string          // stable ID for this blog article (used for idempotency)
  workspaceId: string
}

type DrawerStatus = 'idle' | 'publishing' | 'success' | 'error'

export function PublishToCmsDrawer({
  open, onClose, blogPackage, sourceId, workspaceId,
}: PublishToCmsDrawerProps) {
  const [connections, setConnections]        = useState<ProviderConnectionSafe[]>([])
  const [loadingConnections, setLoadingConn] = useState(true)
  const [connectionId, setConnectionId]      = useState('')
  const [title, setTitle]                    = useState(blogPackage.article.title)
  const [slug, setSlug]                      = useState(generateSlug(blogPackage.article.title))
  const [excerpt, setExcerpt]                = useState(blogPackage.metadata.metaDescription ?? '')
  const [publishStatus, setPublishStatus]    = useState<'draft' | 'publish'>('draft')
  const [status, setStatus]                  = useState<DrawerStatus>('idle')
  const [error, setError]                    = useState<string | null>(null)
  const [publishedUrl, setPublishedUrl]      = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoadingConn(true)
    fetch('/api/publishing/connections')
      .then(r => r.ok ? r.json() : [])
      .then((data: ProviderConnectionSafe[]) => {
        setConnections(data)
        if (data.length > 0 && !connectionId) setConnectionId(data[0].id)
      })
      .finally(() => setLoadingConn(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleTitleChange(v: string) {
    setTitle(v)
    setSlug(generateSlug(v))
  }

  async function handlePublish() {
    if (!connectionId) { setError('Select a publishing destination.'); return }
    setStatus('publishing')
    setError(null)

    // Convert blog package to canonical article and apply form overrides
    const article = {
      ...blogPackageToCanonical(blogPackage, workspaceId, sourceId),
      title,
      slug,
      excerpt,
    }

    try {
      const res = await fetch('/api/publishing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          article,
          opts: {
            status:          publishStatus,
            overrideTitle:   title,
            overrideSlug:    slug,
            overrideExcerpt: excerpt,
          },
          sourceType: 'blog',
          sourceId,
        }),
      })

      const data = await res.json() as { providerUrl?: string; error?: string }

      if (!res.ok) { setError(data.error ?? 'Publishing failed.'); setStatus('error'); return }

      setPublishedUrl(data.providerUrl ?? null)
      setStatus('success')
    } catch {
      setError('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="flex w-[420px] flex-col p-0">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Publish to CMS</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Send this article to a connected site.</p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {status === 'success' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">
                  {publishStatus === 'publish' ? 'Published!' : 'Saved as draft'}
                </p>
              </div>
              {publishedUrl && (
                <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900">
                  View on site <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Destination</label>
            {loadingConnections ? (
              <div className="h-9 animate-pulse rounded-md bg-zinc-100" />
            ) : connections.length === 0 ? (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500">
                No publishing destinations.{' '}
                <a href="/settings/publishing" className="text-zinc-900 underline">Add one in Settings.</a>
              </p>
            ) : (
              <select value={connectionId} onChange={e => setConnectionId(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none">
                {connections.map(c => (
                  <option key={c.id} value={c.id}>{c.label} ({c.siteUrl})</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Title</label>
            <input type="text" value={title} onChange={e => handleTitleChange(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Slug</label>
            <input type="text" value={slug} onChange={e => setSlug(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm focus:border-zinc-400 focus:outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Excerpt</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3}
              className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Publish as</label>
            <div className="flex gap-2">
              {(['draft', 'publish'] as const).map(s => (
                <button key={s} type="button" onClick={() => setPublishStatus(s)}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    publishStatus === s
                      ? 'border-zinc-800 bg-zinc-800 text-white'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                  }`}>
                  {s === 'draft' ? 'Draft' : 'Live'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </div>

        <div className="border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={handlePublish}
            disabled={status === 'publishing' || connections.length === 0 || status === 'success'}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {status === 'publishing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {status === 'publishing'
              ? 'Publishing…'
              : status === 'success'
              ? 'Published ✓'
              : publishStatus === 'publish' ? 'Publish Live' : 'Save Draft'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
