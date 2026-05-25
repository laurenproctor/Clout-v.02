'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { DateTime } from 'luxon'
import { cn } from '@/lib/utils'
import * as Dialog from '@radix-ui/react-dialog'

type WorkspaceData = {
  id: string
  name: string
  slug: string
  plan: string
  avatar_url: string | null
  brand_color: string | null
  slug_changed_at: string | null
}

type SubscriptionData = {
  plan: string
  status: string
  current_period_end: string | null
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'rate_limited'

export default function WorkspaceSettingsPage() {
  const activeWorkspace = useWorkspace()
  const router = useRouter()
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [sub, setSub] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [brandColor, setBrandColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugDaysLeft, setSlugDaysLeft] = useState<number | null>(null)
  const [slugSaving, setSlugSaving] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)

  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/workspace')
      .then(r => r.ok ? r.json() : null)
      .then((ws) => {
        if (ws?.workspace) {
          setData(ws.workspace)
          setName(ws.workspace.name ?? '')
          setBrandColor(ws.workspace.brand_color ?? '#18181b')
          setSlug(ws.workspace.slug ?? '')
          if (ws.workspace.slug_changed_at) {
            const days = DateTime.now().diff(
              DateTime.fromISO(ws.workspace.slug_changed_at), 'days'
            ).days
            if (days < 30) setSlugDaysLeft(Math.ceil(30 - days))
          }
        }
        if (ws?.subscription) setSub(ws.subscription)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!slug || slug === data?.slug || slugDaysLeft !== null) return
    setSlugStatus('checking')
    const t = setTimeout(async () => {
      const res = await fetch(`/api/workspace/slug-check?slug=${encodeURIComponent(slug)}`)
      if (res.ok) {
        const { available } = await res.json()
        setSlugStatus(available ? 'available' : 'taken')
      }
    }, 200)
    return () => clearTimeout(t)
  }, [slug, data?.slug, slugDaysLeft])

  const canEdit = activeWorkspace.userRole === 'owner' || activeWorkspace.userRole === 'admin'
  const isRateLimited = slugDaysLeft !== null

  async function handleSaveIdentity() {
    setSaving(true)
    await fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, brand_color: brandColor }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  async function handleSaveSlug() {
    setSlugSaving(true)
    setSlugError(null)
    const res = await fetch('/api/workspace/slug', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
    if (res.ok) {
      const { slug: newSlug } = await res.json()
      router.replace(`/${newSlug}/settings/workspace`)
    } else {
      const d = await res.json()
      setSlugError(d.error ?? 'Failed to save')
    }
    setSlugSaving(false)
  }

  async function handleDelete() {
    if (deleteConfirm !== data?.slug) return
    setDeleting(true)
    const res = await fetch('/api/workspace', { method: 'DELETE' })
    if (res.ok) {
      router.push('/')
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-lg border border-zinc-200 bg-zinc-50 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Identity */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Identity</h2>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Workspace name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Brand color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              disabled={!canEdit}
              className="h-8 w-8 rounded border border-zinc-200 cursor-pointer disabled:opacity-50"
            />
            <input
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              disabled={!canEdit}
              className="w-28 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-mono text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <button
          onClick={handleSaveIdentity}
          disabled={!canEdit || saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-zinc-800 transition-colors"
        >
          {saved ? 'Saved' : saving ? 'Saving...' : 'Save changes'}
        </button>
      </section>

      {/* Workspace URL */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Workspace URL</h2>
        <p className="text-xs text-zinc-500">
          This is your unique URL on Clout. Changing it will redirect old links for 30 days.
        </p>

        <div className={cn('flex items-center overflow-hidden rounded-md border', {
          'border-zinc-200 opacity-60': isRateLimited || !canEdit,
          'border-zinc-300': !isRateLimited && canEdit && slugStatus === 'idle',
          'border-emerald-400': slugStatus === 'available',
          'border-red-400': slugStatus === 'taken',
        })}>
          <span className="border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 whitespace-nowrap">
            clout.so/
          </span>
          <input
            value={slug}
            onChange={e => { setSlug(e.target.value); setSlugStatus('idle') }}
            disabled={isRateLimited || !canEdit}
            className="flex-1 px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none bg-white disabled:bg-zinc-50"
          />
          {!isRateLimited && canEdit && (
            <button
              onClick={handleSaveSlug}
              disabled={slugSaving || slugStatus !== 'available' || slug === data?.slug}
              className="border-l border-zinc-200 px-4 py-2 text-sm font-medium bg-zinc-900 text-white disabled:bg-zinc-200 disabled:text-zinc-400"
            >
              Save
            </button>
          )}
        </div>

        {slug !== data?.slug && !isRateLimited && (
          <div className="flex items-center gap-1.5">
            {slugStatus === 'available' && (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-zinc-500">{slug} is available</span>
                {data?.slug_changed_at && (
                  <span className="ml-auto text-xs text-zinc-400">
                    Last changed {DateTime.fromISO(data.slug_changed_at).toRelativeCalendar()}
                  </span>
                )}
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

        {isRateLimited && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
            <span className="text-base leading-none">⏳</span>
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Slug changed {30 - (slugDaysLeft ?? 30)} days ago
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                You can change your slug again in <strong>{slugDaysLeft} day{slugDaysLeft === 1 ? '' : 's'}</strong>.
                Slugs are locked for 30 days to protect existing links.
              </p>
            </div>
          </div>
        )}

        {slugError && <p className="text-xs text-red-600">{slugError}</p>}
      </section>

      {/* Plan */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">Plan</h2>
        <p className="text-sm text-zinc-500 capitalize">
          {sub?.plan ?? activeWorkspace.plan} plan
          {sub?.current_period_end && (
            <span className="text-zinc-400">
              {' '}· Renews {DateTime.fromISO(sub.current_period_end).toLocaleString(DateTime.DATE_MED)}
            </span>
          )}
        </p>
        <a
          href={`/${activeWorkspace.slug}/settings/billing`}
          className="text-xs font-medium text-zinc-600 underline"
        >
          Manage billing →
        </a>
      </section>

      {/* Danger zone */}
      {activeWorkspace.userRole === 'owner' && (
        <section className="rounded-lg border border-red-200 bg-white p-6 space-y-3">
          <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="text-xs text-zinc-500">
            Permanently deletes this workspace, all its content, and all member access. This cannot be undone.
          </p>
          <button
            onClick={() => setShowDelete(true)}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete workspace
          </button>
        </section>
      )}

      <Dialog.Root open={showDelete} onOpenChange={setShowDelete}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
            <Dialog.Title className="text-base font-semibold text-zinc-900 mb-2">
              Delete workspace
            </Dialog.Title>
            <p className="text-sm text-zinc-500 mb-4">
              This will permanently delete <strong>{data?.name}</strong> and all its data.
              Type <strong>{data?.slug}</strong> to confirm.
            </p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={data?.slug}
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-mono mb-4 focus:border-zinc-400 focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDelete(false)}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== data?.slug || deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete workspace'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
