'use client'

import { useEffect, useState } from 'react'

interface Entitlements {
  captures_per_month: number
  generations_per_month: number
  lenses_max: number
  members_max: number
  voice_minutes_per_month: number
  operator_access: boolean
}

interface Subscription {
  plan: string
  status: string
  entitlements: Entitlements
  current_period_end: string | null
  stripe_customer_id: string | null
}

interface Usage {
  captures_this_month: number
  generations_this_month: number
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', pro: 'Pro', business: 'Business', enterprise: 'Enterprise',
}

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100)
  const nearLimit = pct >= 80
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-zinc-700">{label}</span>
        <span className={nearLimit ? 'text-amber-600 font-medium' : 'text-zinc-500'}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-100">
        <div
          className={`h-1.5 rounded-full transition-all ${nearLimit ? 'bg-amber-500' : 'bg-zinc-900'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/billing').then((r) => r.ok ? r.json() : null),
      fetch('/api/billing/usage').then((r) => r.ok ? r.json() : null),
    ]).then(([sub, use]) => {
      setSubscription(sub)
      setUsage(use)
      setLoading(false)
    })
  }, [])

  const entitlements = subscription?.entitlements

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 rounded bg-zinc-200 animate-pulse" />
        <div className="h-40 rounded-lg border border-zinc-200 bg-white animate-pulse" />
        <div className="h-32 rounded-lg border border-zinc-200 bg-white animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Billing</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Manage your plan and usage.</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Current plan</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {PLAN_LABELS[subscription?.plan ?? 'free'] ?? 'Free'}
            </p>
            {subscription?.status && (
              <p className="mt-0.5 text-sm text-zinc-500 capitalize">{subscription.status}</p>
            )}
            {subscription?.current_period_end && (
              <p className="mt-1 text-xs text-zinc-400">
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
          {subscription?.plan === 'free' && (
            <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
              Upgrade
            </button>
          )}
        </div>

        {entitlements && (
          <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-x-8 gap-y-1.5">
            {[
              { label: 'Captures / month', value: entitlements.captures_per_month },
              { label: 'Generations / month', value: entitlements.generations_per_month },
              { label: 'Max lenses', value: entitlements.lenses_max },
              { label: 'Team members', value: entitlements.members_max },
              { label: 'Voice minutes / month', value: entitlements.voice_minutes_per_month },
              { label: 'Operator access', value: entitlements.operator_access ? 'Yes' : 'No' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-zinc-500">{label}</span>
                <span className="font-medium text-zinc-900">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {usage && entitlements && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
          <h2 className="text-sm font-medium text-zinc-900">Usage this month</h2>
          <UsageMeter label="Captures" used={usage.captures_this_month} limit={entitlements.captures_per_month} />
          <UsageMeter label="Generations" used={usage.generations_this_month} limit={entitlements.generations_per_month} />
        </div>
      )}

      {subscription?.stripe_customer_id && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900 mb-1">Manage subscription</h2>
          <p className="text-sm text-zinc-500 mb-4">Update payment method, view invoices, or cancel.</p>
          <button className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
            Open billing portal →
          </button>
        </div>
      )}
    </div>
  )
}
