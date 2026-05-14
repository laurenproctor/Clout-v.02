'use client'

import { cn } from '@/lib/utils'
import { RefreshCw, Unlink, Plus, Loader2 } from 'lucide-react'
import { useState } from 'react'

function AccountAvatar({ profileImageUrl, label }: { profileImageUrl?: string | null; label: string }) {
  const [imgError, setImgError] = useState(false)
  const initial = label.charAt(0).toUpperCase()

  if (profileImageUrl && !imgError) {
    return (
      <img
        src={profileImageUrl}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <span className="text-[10px] font-semibold text-zinc-500">{initial}</span>
  )
}

const SEVEN_DAYS_S = 7 * 24 * 60 * 60

function tokenExpiryStatus(
  expiresAt: number | null | undefined
): 'ok' | 'soon' | 'expired' | 'none' {
  if (expiresAt == null) return 'none'
  const nowS = Math.floor(Date.now() / 1000)
  if (expiresAt < nowS) return 'expired'
  if (expiresAt < nowS + SEVEN_DAYS_S) return 'soon'
  return 'ok'
}

function TokenExpiryWarning({
  expiresAt,
  reconnectHref,
}: {
  expiresAt: number | null | undefined
  reconnectHref?: string
}) {
  const status = tokenExpiryStatus(expiresAt)
  if (status === 'ok' || status === 'none') return null
  const daysLeft =
    expiresAt != null
      ? Math.max(0, Math.floor((expiresAt - Math.floor(Date.now() / 1000)) / 86400))
      : 0
  const isExpired = status === 'expired'
  const label = isExpired
    ? 'Session expired — reconnect'
    : daysLeft === 0
    ? 'Expires today — reconnect'
    : `Expires in ${daysLeft}d — reconnect`

  return (
    <span
      className={cn(
        'mt-1 block text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit',
        isExpired
          ? 'bg-red-50 text-red-600 border border-red-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      )}
    >
      {reconnectHref ? <a href={reconnectHref}>{label}</a> : label}
    </span>
  )
}

export interface ConnectedAccount {
  id: string
  label: string
  accountType?: string
  tokenExpiresAt?: number | null
  reconnectHref?: string
  consecutiveFailures?: number
  lastPublishedAt?: string | null
  profileImageUrl?: string | null
}

export interface PlatformCardProps {
  name: string
  tagline: string
  icon: React.ReactNode
  iconColorClass?: string
  connected: ConnectedAccount[]
  onConnect?: () => void
  connectHref?: string
  connectLabel?: string
  onDisconnect: (id: string) => void
  onAddAnother?: () => void
  addAnotherHref?: string
  addAnotherLabel?: string
}

export function PlatformCard({
  name,
  tagline,
  icon,
  iconColorClass = 'text-zinc-900',
  connected,
  onConnect,
  connectHref,
  connectLabel = 'Enable Channel',
  onDisconnect,
  onAddAnother,
  addAnotherHref,
  addAnotherLabel,
}: PlatformCardProps) {
  const isConnected = connected.length > 0
  const isDegraded = connected.some((a) => (a.consecutiveFailures ?? 0) >= 3)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  async function handleDisconnect(id: string) {
    if (!confirm('Disconnect this account?')) return
    setDisconnecting(id)
    await onDisconnect(id)
    setDisconnecting(null)
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border p-6 transition-colors',
        isConnected
          ? 'border-zinc-200 bg-zinc-50 shadow-sm'
          : 'border-zinc-200 bg-white hover:border-zinc-300'
      )}
    >
      {/* Platform identity */}
      <div className="mb-5 flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 transition-all duration-200',
            isConnected ? iconColorClass : 'text-zinc-400 grayscale'
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-[Signifier,_Georgia,_serif] text-base font-semibold leading-tight text-zinc-900">
              {name}
            </h3>
            {isConnected && !isDegraded && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            )}
            {isDegraded && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Degraded
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{tagline}</p>
        </div>
      </div>

      {/* Connected accounts or CTA */}
      <div className="mt-auto">
        {isConnected ? (
          <div className="space-y-2">
            {connected.map((account) => (
              <div
                key={account.id}
                className={cn(
                  'rounded-xl border bg-white px-4 py-3 transition-colors',
                  (account.consecutiveFailures ?? 0) >= 3
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-zinc-100'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100">
                    <AccountAvatar profileImageUrl={account.profileImageUrl} label={account.label} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {account.label}
                    </p>
                    {account.accountType && account.accountType !== 'personal' && (
                      <p className="text-xs capitalize text-zinc-400">
                        {account.accountType}
                      </p>
                    )}
                    {account.lastPublishedAt && (
                      <p className="text-xs text-zinc-400">
                        Last published {relativeTime(account.lastPublishedAt)}
                      </p>
                    )}
                    <TokenExpiryWarning
                      expiresAt={account.tokenExpiresAt}
                      reconnectHref={account.reconnectHref}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    {account.reconnectHref && (
                      <a
                        href={account.reconnectHref}
                        className="text-zinc-300 transition-colors hover:text-zinc-600"
                        title="Reconnect"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={disconnecting === account.id}
                      className="text-zinc-300 transition-colors hover:text-red-400 disabled:opacity-40"
                      title="Disconnect"
                    >
                      {disconnecting === account.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add another */}
            {addAnotherHref ? (
              <a
                href={addAnotherHref}
                className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
              >
                <Plus className="h-3 w-3" />
                {addAnotherLabel ?? `Add another ${name} account`}
              </a>
            ) : onAddAnother ? (
              <button
                type="button"
                onClick={onAddAnother}
                className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
              >
                <Plus className="h-3 w-3" />
                {addAnotherLabel ?? `Add another ${name} account`}
              </button>
            ) : null}
          </div>
        ) : connectHref ? (
          <a
            href={connectHref}
            className="block w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            {connectLabel}
          </a>
        ) : onConnect ? (
          <button
            type="button"
            onClick={onConnect}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            {connectLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
