'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DISCLOSURE_TEXT } from '@/lib/unipile/disclosure'

interface UnipileConnection {
  accountId: string
  status: 'connected' | 'expired' | 'restricted' | 'revoked'
  connectedAt: string
}

interface StatusResponse {
  enabled: boolean
  optedIn: boolean
  connection: UnipileConnection | null
}

const CONNECT_HREF = '/api/channels/linkedin/unipile/connect'

const ERROR_COPY: Record<string, string> = {
  opt_in_required: 'Please accept the disclosure before connecting.',
  master_disabled: 'The LinkedIn beta connector is not currently available.',
  killed:          'The LinkedIn beta connector is temporarily disabled.',
  auth_failed:     'LinkedIn authentication did not complete. Please try again.',
  link_failed:     'Could not start the connection. Please try again.',
}

// LinkedIn Monitoring Beta entry point. Renders nothing unless the connector is
// enabled (LINKEDIN_UNIPILE_ENABLED). Deliberately labeled as a beta connector — it
// is not equivalent to the official LinkedIn channel.
export function UnipileBetaCard() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [showDisclosure, setShowDisclosure] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const queryError = searchParams.get('unipile_error')
  const justConnected = searchParams.get('unipile_connected') === '1'

  useEffect(() => {
    async function loadStatus() {
      const res = await fetch('/api/channels/linkedin/unipile/status')
      if (res.ok) setStatus(await res.json())
    }
    loadStatus()
  }, [])

  const acceptAndConnect = useCallback(async () => {
    setAccepting(true)
    const res = await fetch('/api/channels/linkedin/unipile/optin', { method: 'POST' })
    if (res.ok) {
      window.location.href = CONNECT_HREF
    } else {
      setAccepting(false)
    }
  }, [])

  // Hidden entirely when the master flag is off — this is an opt-in beta, not a teaser.
  if (!status || !status.enabled) return null

  const connection = status.connection
  const connected = connection?.status === 'connected'

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
          LinkedIn Intelligence
        </h2>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
          Beta
        </span>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-medium text-zinc-900">LinkedIn Monitoring Beta</p>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
          Monitor LinkedIn conversations using an opt-in beta connector. This is read-only.
          Clout will not comment, react, or post without your explicit action.
        </p>

        {queryError && (
          <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {ERROR_COPY[queryError] ?? 'Something went wrong. Please try again.'}
          </p>
        )}
        {justConnected && connected && (
          <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            LinkedIn beta connector connected.
          </p>
        )}

        <div className="mt-4">
          {connected ? (
            <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-800">Connected</p>
                <p className="mt-0.5 text-xs text-zinc-400">Account {connection!.accountId.slice(0, 8)}…</p>
              </div>
              <a
                href={CONNECT_HREF}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-400"
              >
                Reconnect
              </a>
            </div>
          ) : status.optedIn ? (
            <a
              href={CONNECT_HREF}
              className="inline-flex rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-800 transition-colors hover:border-zinc-400"
            >
              Connect LinkedIn (Beta)
            </a>
          ) : (
            <button
              onClick={() => setShowDisclosure(true)}
              className="inline-flex rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-800 transition-colors hover:border-zinc-400"
            >
              Enable LinkedIn Monitoring Beta
            </button>
          )}
        </div>
      </div>

      {showDisclosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <p className="text-sm font-semibold text-zinc-900">Before you connect</p>
            <p className={cn('mt-3 text-xs leading-relaxed text-zinc-600')}>{DISCLOSURE_TEXT}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDisclosure(false)}
                disabled={accepting}
                className="rounded-lg px-3 py-2 text-xs text-zinc-500 transition-colors hover:text-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={acceptAndConnect}
                disabled={accepting}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                {accepting ? 'Connecting…' : 'I understand — connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
