'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, AlertCircle, Loader2 } from 'lucide-react'

interface Stats {
  queued: number
  publishing: number
  published: number
  failed: number
}

export function PublishingEngine() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/publishing/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setStats(d))
      .catch(() => {})
  }, [])

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-medium text-zinc-900">Publishing Engine</h2>
      </div>

      {!stats ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="space-y-2">
          <StatRow label="Queued" value={stats.queued + stats.publishing} href="/queue" />
          <StatRow label="Published" value={stats.published} href="/queue" />
          {stats.failed > 0 && (
            <Link href="/queue" className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm hover:bg-red-100 transition-colors">
              <span className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {stats.failed} failed — attention needed
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-zinc-50">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value}</span>
    </Link>
  )
}
