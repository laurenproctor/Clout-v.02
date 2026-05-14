'use client'

import { useState, useEffect } from 'react'
import { Plus, Globe } from 'lucide-react'
import { ConnectionCard } from '@/components/publishing/ConnectionCard'
import { ConnectWordPressModal } from '@/components/publishing/ConnectWordPressModal'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'

export default function PublishingSettingsPage() {
  const [connections, setConnections]           = useState<ProviderConnectionSafe[]>([])
  const [loading, setLoading]                   = useState(true)
  const [showConnectModal, setShowConnectModal]  = useState(false)

  useEffect(() => {
    fetch('/api/publishing/connections')
      .then(r => r.ok ? r.json() : [])
      .then((data: ProviderConnectionSafe[]) => setConnections(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4">
        <div className="h-7 w-52 rounded bg-zinc-100" />
        <div className="h-4 w-80 rounded bg-zinc-100" />
        <div className="h-20 rounded-lg bg-zinc-100" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Publishing Destinations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect your CMS sites to publish articles directly from Clout.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Connected Sites</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {connections.length === 0
                ? 'No sites connected yet.'
                : `${connections.length} site${connections.length === 1 ? '' : 's'} connected`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" /> Connect Site
          </button>
        </div>

        {connections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
              <Globe className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="max-w-xs text-center text-sm text-zinc-500">
              Connect your WordPress site to publish articles directly from Clout.
            </p>
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Connect WordPress
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {connections.map(c => (
              <div key={c.id} className="p-4">
                <ConnectionCard
                  connection={c}
                  onDelete={id => setConnections(prev => prev.filter(x => x.id !== id))}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 px-5 py-4">
        <p className="text-xs font-medium text-zinc-500">Coming soon</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {['Ghost', 'Substack', 'Medium', 'Webflow', 'Beehiiv', 'HubSpot', 'Notion'].map(name => (
            <span key={name} className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-400">
              {name}
            </span>
          ))}
        </div>
      </div>

      {showConnectModal && (
        <ConnectWordPressModal
          onClose={() => setShowConnectModal(false)}
          onConnected={c => setConnections(prev => [c, ...prev])}
        />
      )}
    </div>
  )
}
