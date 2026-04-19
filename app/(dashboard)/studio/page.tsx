import Link from 'next/link'

export default function StudioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Studio</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Review, edit, and approve your generated content.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 w-fit">
        {['All', 'Draft', 'Review', 'Approved'].map((tab) => (
          <button
            key={tab}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'All'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
            <span className="text-lg">✍️</span>
          </div>
          <p className="text-sm font-medium text-zinc-900">No content yet</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Generated content will appear here. Create a capture and run it through a Lens to get started.
          </p>
          <Link
            href="/capture"
            className="mt-4 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Go to Capture
          </Link>
        </div>
      </div>
    </div>
  )
}
