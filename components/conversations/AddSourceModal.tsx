'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props { onAdded: () => void; onClose: () => void }

export function AddSourceModal({ onAdded, onClose }: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/conversations/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl: url.trim(), title: title.trim() || null }),
      })
      if (!res.ok) { setError((await res.json()).error ?? 'Failed to add source'); return }
      onAdded()
      onClose()
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
            <Input value={url} onChange={e => setUrl(e.target.value)} autoFocus
              placeholder="https://stratechery.com or https://foo.substack.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Display name <span className="font-normal">(optional)</span>
            </label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Stratechery" />
          </div>
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
