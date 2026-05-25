'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (slug: string) => void
}

export function CreateWorkspaceModal({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name))
    }
  }, [name, slugEdited])

  // Debounced availability check
  useEffect(() => {
    if (!slug) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/workspace/slug-check?slug=${encodeURIComponent(slug)}`)
      if (res.ok) {
        const { available } = await res.json()
        setSlugStatus(available ? 'available' : 'taken')
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (slugStatus !== 'available' || !name.trim()) return
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), slug }),
    })
    if (res.ok) {
      const { workspace } = await res.json()
      onOpenChange(false)
      setName('')
      setSlug('')
      setSlugEdited(false)
      onCreated(workspace.slug)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to create workspace')
    }
    setSubmitting(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-zinc-900">
              Create workspace
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Workspace name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Amlon Group"
                required
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Workspace URL
              </label>
              <div className="flex items-center gap-0 rounded-md border border-zinc-200 overflow-hidden focus-within:border-zinc-400">
                <span className="px-3 py-2 text-sm text-zinc-400 bg-zinc-50 border-r border-zinc-200 whitespace-nowrap">
                  clout.so/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }}
                  className="flex-1 px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none"
                />
              </div>
              {slug && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  {slugStatus === 'available' && (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-zinc-500">{slug} is available</span>
                    </>
                  )}
                  {slugStatus === 'taken' && (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <span className="text-xs text-red-600">{slug} is already taken</span>
                    </>
                  )}
                  {slugStatus === 'checking' && (
                    <span className="text-xs text-zinc-400">Checking...</span>
                  )}
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || slugStatus !== 'available' || !name.trim()}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-zinc-800 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create workspace'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
