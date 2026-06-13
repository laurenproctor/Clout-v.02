'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// Minimal shape of the manual-fallback product state returned by the publish endpoint.
interface FallbackState {
  reason: string
  fallback: { title: string; message: string; actions: Array<'copy_content' | 'open_substack' | 'reconnect'> }
}

interface SubstackConnection {
  id: string
  provider: string
  label: string
  siteUrl: string
  isActive: boolean
  metadata: Record<string, unknown>
}

interface Capabilities {
  actionEnabled: Record<string, boolean>
}

interface StudioSubstackBarProps {
  outputId: string
  contentType: string                 // 'substack-note' | 'substack-newsletter'
  bodyText: string                    // current editor body — used by "Copy content"
  initialConnectionId: string | null
  onPublished: () => void             // reload the output after a successful publish
}

const BTN = 'rounded-md px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40'
const PRIMARY = `${BTN} bg-zinc-100 hover:bg-white text-zinc-900`
const GHOST = `${BTN} border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900`
const LOCKED = `${BTN} border border-zinc-800 text-zinc-600 cursor-help`

export function StudioSubstackBar({ outputId, contentType, bodyText, initialConnectionId, onPublished }: StudioSubstackBarProps) {
  const { slug } = useWorkspace()
  const [connections, setConnections] = useState<SubstackConnection[]>([])
  const [caps, setCaps] = useState<Capabilities | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialConnectionId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallback, setFallback] = useState<FallbackState | null>(null)
  const [confirmEmailOpen, setConfirmEmailOpen] = useState(false)

  const isNote = contentType === 'substack-note'

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [connRes, capRes] = await Promise.all([
        fetch('/api/publishing/connections'),
        fetch('/api/publishing/substack/capabilities'),
      ])
      if (cancelled) return
      if (connRes.ok) {
        const all = (await connRes.json()) as SubstackConnection[]
        const substack = all.filter((c) => c.provider === 'substack' && c.isActive)
        setConnections(substack)
        setSelectedId((prev) => prev ?? substack[0]?.id ?? null)
      }
      if (capRes.ok) setCaps((await capRes.json()) as Capabilities)
    })()
    return () => { cancelled = true }
  }, [])

  const selected = connections.find((c) => c.id === selectedId) ?? null
  const enabled = (intent: string) => caps?.actionEnabled?.[intent] ?? false

  async function publish(intent: string) {
    if (!selectedId) { setError('Select a Substack publication first.'); return }
    setBusy(true)
    setError(null)
    setFallback(null)
    try {
      const res = await fetch(`/api/outputs/${outputId}/publish-substack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: selectedId, intent }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        onPublished()
      } else if (res.ok && data.ok === false && data.fallback) {
        // Friendly manual-fallback product state (never an error dead-end).
        setFallback({ reason: data.reason, fallback: data.fallback })
      } else {
        setError(data.error ?? 'Could not publish to Substack.')
      }
    } finally {
      setBusy(false)
    }
  }

  function copyContent() {
    void navigator.clipboard?.writeText(bodyText)
  }

  if (connections.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">No Substack publication connected.</span>
        <Link href={`/${slug}/settings/publishing`} className="text-xs font-semibold text-zinc-200 hover:text-white">
          Connect Substack →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <span className="max-w-[260px] text-right text-xs leading-tight text-red-400">{error}</span>}

      {fallback && (
        <div className="max-w-[320px] rounded-md border border-zinc-800 bg-zinc-950 p-3 text-left">
          <p className="text-xs font-semibold text-zinc-200">{fallback.fallback.title}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-400">{fallback.fallback.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {fallback.fallback.actions.includes('copy_content') && (
              <button onClick={copyContent} className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-900">Copy content</button>
            )}
            {fallback.fallback.actions.includes('open_substack') && selected && (
              <a href={selected.siteUrl} target="_blank" rel="noreferrer" className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-900">Open Substack</a>
            )}
            {fallback.fallback.actions.includes('reconnect') && (
              <Link href={`/${slug}/settings/publishing`} className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-900">Reconnect</Link>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Publication picker */}
        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-300"
          aria-label="Substack publication"
        >
          {connections.map((c) => {
            const name = (c.metadata['publication_name'] as string | undefined) ?? c.label
            return <option key={c.id} value={c.id}>{name}</option>
          })}
        </select>

        {isNote ? (
          <LockableButton
            label="Publish Note"
            unlocked={enabled('substack_note_publish')}
            busy={busy}
            onClick={() => void publish('substack_note_publish')}
          />
        ) : (
          <>
            <button
              onClick={() => void publish('substack_newsletter_draft')}
              disabled={busy || !enabled('substack_newsletter_draft')}
              className={GHOST}
            >
              {busy ? 'Working…' : 'Save draft'}
            </button>
            <LockableButton
              label="Publish on Substack"
              unlocked={enabled('substack_newsletter_publish_web')}
              busy={busy}
              onClick={() => void publish('substack_newsletter_publish_web')}
            />
            <LockableButton
              label="Publish and email subscribers"
              unlocked={enabled('substack_newsletter_send_email')}
              busy={busy}
              // Locked: surface the fallback directly. Unlocked: confirm first (irreversible audience action).
              onClick={() =>
                enabled('substack_newsletter_send_email')
                  ? setConfirmEmailOpen(true)
                  : void publish('substack_newsletter_send_email')
              }
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmEmailOpen}
        onOpenChange={setConfirmEmailOpen}
        title="Publish and email subscribers?"
        body={`You are about to publish this newsletter and email subscribers from ${
          (selected?.metadata['publication_name'] as string | undefined) ?? selected?.label ?? 'this publication'
        }. This action may notify your audience and may not be reversible inside Clout.`}
        confirmLabel="Publish and email"
        onConfirm={() => { setConfirmEmailOpen(false); void publish('substack_newsletter_send_email') }}
      />
    </div>
  )
}

function LockableButton({ label, unlocked, busy, onClick }: { label: string; unlocked: boolean; busy: boolean; onClick: () => void }) {
  if (unlocked) {
    return (
      <button onClick={onClick} disabled={busy} className={PRIMARY}>
        {busy ? 'Working…' : `${label} →`}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={LOCKED}
      title="Verification pending — direct publishing isn't available yet. You can still prepare a draft and finish in Substack."
    >
      {label} · pending
    </button>
  )
}
