'use client'

import { useEffect, useState } from 'react'
import { X, RefreshCw, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface Board {
  id: string
  boardId: string
  name: string
  isDefault: boolean
  isAvailable: boolean
}

export function PinterestBoardModal({
  channelId,
  onClose,
}: {
  channelId: string
  onClose: () => void
}) {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initial board load. setState happens only after the await (not synchronously in the
  // effect body) to avoid cascading renders.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/channels/pinterest/boards?channelId=${encodeURIComponent(channelId)}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error ?? 'Failed to load boards')
        setBoards(data.boards ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load boards')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [channelId])

  async function post(body: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey)
    setError(null)
    try {
      const res = await fetch('/api/channels/pinterest/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, ...body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      if (data.boards) setBoards(data.boards)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Pinterest boards</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-zinc-500">
          Pick the default board new Pins publish to. You can override it per post in Studio.
        </p>

        <button
          type="button"
          onClick={() => post({ action: 'sync' }, 'sync')}
          disabled={busy === 'sync'}
          className="mb-3 flex items-center gap-1.5 self-start text-xs text-zinc-500 transition-colors hover:text-zinc-800 disabled:opacity-40"
        >
          {busy === 'sync' ? <Spinner size="sm" label="Syncing" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sync boards from Pinterest
        </button>

        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {loading ? (
            <div className="py-6 text-center"><Spinner size="sm" label="Loading boards" /></div>
          ) : boards.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400">No boards found. Try syncing.</p>
          ) : (
            boards.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={!b.isAvailable || busy === b.boardId}
                onClick={() => post({ action: 'setAccountDefault', boardId: b.boardId }, b.boardId)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-40 ${
                  b.isDefault ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">
                  {b.name}
                  {!b.isAvailable && <span className="ml-2 text-[10px] text-amber-600">unavailable</span>}
                </span>
                {busy === b.boardId ? (
                  <Spinner size="sm" label="Saving" />
                ) : b.isDefault ? (
                  <Check className="h-4 w-4 shrink-0 text-zinc-900" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
