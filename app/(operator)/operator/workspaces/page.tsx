export default function OperatorWorkspacesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Managed Workspaces</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          All workspaces you are assigned to manage.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white">
        {/* Table header */}
        <div className="grid grid-cols-4 gap-4 border-b border-zinc-100 px-4 py-3">
          {['Workspace', 'Plan', 'Members', 'Assigned Operator'].map((h) => (
            <p key={h} className="text-xs font-medium uppercase tracking-wide text-zinc-400">{h}</p>
          ))}
        </div>
        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-zinc-900">No workspaces assigned</p>
          <p className="mt-1 text-sm text-zinc-500">
            Workspaces assigned to you will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}
