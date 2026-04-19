export default function StudioEditorPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Edit Output</h1>
        <div className="flex gap-2">
          <button className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
            Save draft
          </button>
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
            Approve
          </button>
        </div>
      </div>

      {/* Lens selector */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Lens</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-8 w-48 rounded-md bg-zinc-100 animate-pulse" />
          <span className="text-xs text-zinc-400">No lens applied</span>
        </div>
      </div>

      {/* Content editor */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Title</label>
          <input
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            placeholder="Output title..."
            disabled
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Body</label>
          <textarea
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none min-h-[280px] resize-y"
            placeholder="Generated content will appear here..."
            disabled
          />
        </div>
      </div>

      <p className="text-xs text-zinc-400">Output ID: {params.id}</p>
    </div>
  )
}
