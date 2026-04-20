'use client'

import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'

interface BillingOverview {
  total: number
  byPlan: Record<string, number>
  byStatus: Record<string, number>
  withStripe: number
  recent: Array<{
    workspace_id: string
    plan: string
    status: string
    stripe_customer_id: string | null
    current_period_end: string | null
  }>
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', pro: 'Pro', business: 'Business', enterprise: 'Enterprise',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  trialing: 'bg-blue-50 text-blue-700',
  past_due: 'bg-amber-50 text-amber-700',
  canceled: 'bg-red-50 text-red-600',
  paused: 'bg-zinc-100 text-zinc-600',
}

export default function OperatorBillingPage() {
  const [data, setData] = useState<BillingOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    fetch('/api/operator/billing')
      .then((r) => {
        if (r.status === 403) { setForbidden(true); setLoading(false); return null }
        return r.ok ? r.json() : null
      })
      .then((d) => { if (d) { setData(d); setLoading(false) } })
      .catch(() => setLoading(false))
  }, [])

  if (forbidden) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900">Billing Overview</h1>
        <p className="text-sm text-zinc-500">Only super admins can view billing data.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-zinc-200 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg border border-zinc-200 bg-white animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const paidWorkspaces = (data.byPlan.pro ?? 0) + (data.byPlan.business ?? 0) + (data.byPlan.enterprise ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Billing Overview</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Subscription summary across all workspaces.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total workspaces', value: data.total },
          { label: 'Paid', value: paidWorkspaces },
          { label: 'Free', value: data.byPlan.free ?? 0 },
          { label: 'Stripe connected', value: data.withStripe },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* By plan */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900 mb-4">By plan</h2>
          <div className="space-y-2.5">
            {['free', 'pro', 'business', 'enterprise'].map((plan) => {
              const count = data.byPlan[plan] ?? 0
              const pct = data.total > 0 ? (count / data.total) * 100 : 0
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-600">{PLAN_LABELS[plan]}</span>
                    <span className="text-zinc-400">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100">
                    <div className="h-1.5 rounded-full bg-zinc-900" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* By status */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900 mb-4">By status</h2>
          <div className="space-y-2">
            {Object.entries(data.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {status.replace('_', ' ')}
                </span>
                <span className="text-sm font-medium text-zinc-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent subscriptions */}
      {data.recent.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900 mb-4">Recent workspaces</h2>
          <div className="divide-y divide-zinc-100">
            {data.recent.map((sub) => (
              <div key={sub.workspace_id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 font-mono">{sub.workspace_id.slice(0, 8)}…</span>
                  <span className="text-sm text-zinc-700 capitalize">{PLAN_LABELS[sub.plan] ?? sub.plan}</span>
                </div>
                <div className="flex items-center gap-3">
                  {sub.current_period_end && (
                    <span className="text-xs text-zinc-400">
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[sub.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {sub.status.replace('_', ' ')}
                  </span>
                  {sub.stripe_customer_id && (
                    <CreditCard className="h-3.5 w-3.5 text-zinc-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
