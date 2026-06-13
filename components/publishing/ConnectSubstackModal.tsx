'use client'

import { useState } from 'react'
import { X, ExternalLink, AlertTriangle } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'

interface ConnectSubstackModalProps {
  onClose:     () => void
  onConnected: (connection: ProviderConnectionSafe) => void
}

export function ConnectSubstackModal({ onClose, onConnected }: ConnectSubstackModalProps) {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [label,     setLabel]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  function normalizeSubdomain(raw: string): string {
    return raw.trim().toLowerCase().replace(/\.substack\.com.*$/i, '').replace(/^https?:\/\//i, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const sub = normalizeSubdomain(subdomain)
    if (!sub) { setError('Enter your publication subdomain.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/publishing/providers/substack/connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:     email.trim(),
          password,
          subdomain: sub,
          label:     label.trim() || undefined,
        }),
      })

      const data = await res.json() as ProviderConnectionSafe & { error?: string }
      if (!res.ok) { setError(data.error ?? 'Connection failed.'); return }

      onConnected(data)
      onClose()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">Connect Substack</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Beta</span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">Draft creation only — publish from the Substack editor</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p className="text-[11px] leading-relaxed text-amber-700">
              Substack has no official API. This integration uses Substack&apos;s internal session API, which may change without notice. Credentials are encrypted at rest. V1 creates drafts only.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              placeholder="you@example.com"
              required
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="Your Substack password"
              required
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm focus:border-zinc-400 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Stored encrypted and used only to renew your session when it expires (every 30 days).
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Publication Subdomain</label>
              <a
                href="https://substack.com/home"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600"
              >
                Find mine <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 focus-within:border-zinc-400">
              <input
                type="text"
                value={subdomain}
                onChange={e => { setSubdomain(e.target.value); setError(null) }}
                placeholder="mypublication"
                required
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
              />
              <span className="shrink-0 border-l border-zinc-200 px-3 py-2 text-xs text-zinc-400">.substack.com</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Display Name <span className="font-normal normal-case text-zinc-300">(optional — auto-detected)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="My Newsletter"
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-md border border-zinc-200 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50">
              {submitting && <Spinner size="sm" />}
              {submitting ? 'Connecting…' : 'Connect Substack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
