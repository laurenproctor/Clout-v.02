import Link from 'next/link'
import { Lock } from 'lucide-react'

export default function CapturePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Capture</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Raw inputs waiting to become content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/private"
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            Private
          </Link>
          <Link
            href="/capture/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            + New Capture
          </Link>
        </div>
      </div>

      {/* Empty state */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
            <span className="text-lg">⚡</span>
          </div>
          <p className="text-sm font-medium text-zinc-900">No captures yet</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Paste a thought, record your voice, paste a URL, or fill out a quick form. It all goes through the same pipeline.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href="/capture/new"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              New capture
            </Link>
            <Link
              href="/private"
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" />
              Private
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
