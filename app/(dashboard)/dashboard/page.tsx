import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Your thought leadership command center.
          </p>
        </div>
        <Link
          href="/capture"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          + New Capture
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Captures this month', value: '0' },
          { label: 'Outputs generated', value: '0' },
          { label: 'Drafts awaiting review', value: '0' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent outputs */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Recent outputs</h2>
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-zinc-900">No outputs yet</p>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              Start by capturing a raw thought. Clout will turn it into publish-ready content in under 60 seconds.
            </p>
            <Link
              href="/capture"
              className="mt-4 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Create your first capture
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
