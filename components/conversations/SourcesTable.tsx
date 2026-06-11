'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { AddSourceModal } from './AddSourceModal'
import { ConversationPreferences } from './ConversationPreferences'
import type { ConversationSource, ConversationSourceType } from '@/types/domain'

const TYPE_BADGE: Record<ConversationSourceType, { label: string; cls: string }> = {
  substack:       { label: 'Substack', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  substack_notes: { label: 'Notes',    cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  rss:            { label: 'RSS',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  generic:        { label: 'Web',      cls: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
  reddit:         { label: 'Reddit',   cls: 'bg-red-50 text-red-700 border-red-200' },
  linkedin:       { label: 'LinkedIn', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
}

function fetchStatusMessage(status: string | null): string | null {
  switch (status) {
    case 'pending':    return 'Waiting to fetch…'
    case 'ingesting':  return 'Fetching posts…'
    case 'analyzing':  return 'Analyzing content…'
    case 'no_posts':   return 'No public posts found — may be paywalled'
    case 'no_new_items': return 'No new posts since last check'
    case 'below_threshold': return 'Posts found but none matched your topics'
    case 'error':      return 'Failed to fetch — will retry automatically'
    default:           return null
  }
}

interface Props {
  sources: ConversationSource[]
  onSourcesChange: () => void
  onPreferencesChange?: () => void
  onSourceCreated?: (label: string) => void
  onFocusTopicAdded?: () => void
}

export function SourcesTable({ sources, onSourcesChange, onPreferencesChange, onSourceCreated, onFocusTopicAdded }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshed, setRefreshed] = useState(false)

  async function refreshNow() {
    setRefreshing(true)
    setRefreshed(false)
    try {
      await fetch('/api/conversations/reprocess', { method: 'POST' })
      setRefreshed(true)
      setTimeout(() => setRefreshed(false), 4000)
    } finally {
      setRefreshing(false)
    }
  }

  async function toggleActive(source: ConversationSource) {
    await fetch(`/api/conversations/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !source.active }),
    })
    onSourcesChange()
  }

  async function remove(id: string) {
    if (!confirm('Remove this source? Existing opportunities will remain.')) return
    await fetch(`/api/conversations/sources/${id}`, { method: 'DELETE' })
    onSourcesChange()
  }

  return (
    <div className="max-w-2xl">
      <ConversationPreferences onPreferencesChange={onPreferencesChange} onFocusTopicAdded={onFocusTopicAdded} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium">Monitored Sources</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {refreshed ? 'Fetch started — check Opportunities in a few minutes.' : 'Checked every 3 hours for new conversations.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <Button size="sm" variant="outline" onClick={refreshNow} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh now'}
            </Button>
          )}
          <Button size="sm" onClick={() => setShowModal(true)}>Add Source</Button>
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">No sources yet.</p>
          <Button size="sm" className="mt-3" onClick={() => setShowModal(true)}>Add your first source</Button>
        </div>
      ) : (
        <div className="border rounded-lg divide-y overflow-hidden">
          {sources.map(source => (
            <div key={source.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{source.title ?? source.sourceUrl}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${TYPE_BADGE[source.sourceType]?.cls ?? 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                    {TYPE_BADGE[source.sourceType]?.label ?? source.sourceType}
                  </span>
                  {!source.active && <Badge variant="outline" className="text-xs text-muted-foreground">Paused</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {source.title ? source.sourceUrl : ''}
                  {source.lastFetchedAt ? ` · Last checked ${new Date(source.lastFetchedAt).toLocaleDateString()}` : ' · Not yet fetched'}
                </p>
                {fetchStatusMessage(source.fetchStatus) && (
                  <p className="text-xs text-muted-foreground mt-0.5">{fetchStatusMessage(source.fetchStatus)}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => toggleActive(source)} className="text-xs text-muted-foreground h-7 px-2">
                  {source.active ? 'Pause' : 'Resume'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(source.id)} className="text-xs text-red-500 hover:text-red-600 h-7 px-2">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <AddSourceModal onAdded={onSourcesChange} onSourceCreated={onSourceCreated} onClose={() => setShowModal(false)} />}
    </div>
  )
}
