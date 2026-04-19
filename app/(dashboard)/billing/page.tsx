export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Billing</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Manage your plan and usage.</p>
      </div>

      {/* Current plan */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Current plan</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">Free</p>
          </div>
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
            Upgrade
          </button>
        </div>
      </div>

      {/* Usage meters */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
        <h2 className="text-sm font-medium text-zinc-900">Usage this period</h2>
        {[
          { label: 'Captures', used: 0, limit: 10 },
          { label: 'Generations', used: 0, limit: 20 },
        ].map(({ label, used, limit }) => (
          <div key={label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-700">{label}</span>
              <span className="text-zinc-500">
                {used} / {limit}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-100">
              <div
                className="h-1.5 rounded-full bg-zinc-900"
                style={{ width: `${(used / limit) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
