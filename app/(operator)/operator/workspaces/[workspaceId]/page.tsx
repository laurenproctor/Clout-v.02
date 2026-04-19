export default function OperatorWorkspaceDetailPage({
  params,
}: {
  params: { workspaceId: string }
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Workspace Overview</h1>
        <p className="mt-0.5 text-sm text-zinc-500">ID: {params.workspaceId}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total captures', value: '—' },
          { label: 'Total outputs', value: '—' },
          { label: 'Pending review', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">Recent captures</h2>
          <p className="mt-3 text-sm text-zinc-400 italic">No captures yet.</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">Recent outputs</h2>
          <p className="mt-3 text-sm text-zinc-400 italic">No outputs yet.</p>
        </div>
      </div>
    </div>
  )
}
