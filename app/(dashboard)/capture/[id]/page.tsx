export default function CaptureDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Capture</h1>
        <p className="mt-0.5 text-sm text-zinc-500">ID: {params.id}</p>
      </div>

      {/* Raw content */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Raw input</p>
          <div className="mt-2 min-h-[120px] rounded-md bg-zinc-50 border border-zinc-200 p-4">
            <p className="text-sm text-zinc-400 italic">Loading capture...</p>
          </div>
        </div>

        {/* Status + source */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Source</p>
            <span className="mt-1 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700">
              Text
            </span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Status</p>
            <span className="mt-1 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700">
              Ready
            </span>
          </div>
        </div>
      </div>

      {/* Generate CTA */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-medium text-zinc-900">Generate content</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Choose a Lens and generate publish-ready content from this capture.
        </p>
        <button
          disabled
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
        >
          Select a Lens to generate →
        </button>
      </div>
    </div>
  )
}
