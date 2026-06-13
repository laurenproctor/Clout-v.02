'use client'

import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'

interface ConnectWordPressModalProps {
  onClose: () => void
  onConnected: (connection: ProviderConnectionSafe) => void
}

export function ConnectWordPressModal({ onClose, onConnected }: ConnectWordPressModalProps) {
  const [siteUrl, setSiteUrl]         = useState('')
  const [username, setUsername]       = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [label, setLabel]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    let url = siteUrl.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    url = url.replace(/\/$/, '')

    setSubmitting(true)
    try {
      const res = await fetch('/api/publishing/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider:            'wordpress',
          siteUrl:             url,
          username:            username.trim(),
          applicationPassword: appPassword.trim(),
          label:               label.trim() || undefined,
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
            <h2 className="text-sm font-semibold text-zinc-900">Connect WordPress</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Self-hosted or WordPress.com</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {[
            { label: 'Site URL',  value: siteUrl,  onChange: setSiteUrl,  placeholder: 'https://yourblog.com', type: 'text' },
            { label: 'Username',  value: username, onChange: setUsername, placeholder: 'admin',                type: 'text' },
          ].map(({ label: lbl, value, onChange, placeholder, type }) => (
            <div key={lbl}>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">{lbl}</label>
              <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
              />
            </div>
          ))}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Application Password</label>
              <a
                href="https://wordpress.org/documentation/article/application-passwords/"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600"
              >
                How to generate <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <input
              type="password"
              value={appPassword}
              onChange={e => setAppPassword(e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              required
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm focus:border-zinc-400 focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-zinc-400">
              WordPress → Users → Profile → Application Passwords.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Display Name <span className="font-normal normal-case text-zinc-300">(optional — auto-detected)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="My Blog"
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
              {submitting ? 'Connecting…' : 'Connect Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
