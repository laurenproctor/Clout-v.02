'use client'

import { useState, useEffect, Fragment } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { ConnectionCard } from '@/components/publishing/ConnectionCard'
import { ConnectWordPressModal } from '@/components/publishing/ConnectWordPressModal'
import { ConnectShopifyModal } from '@/components/publishing/ConnectShopifyModal'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'

function WordPressIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
      <span className="font-[Georgia,serif] text-lg font-bold text-blue-600">W</span>
    </div>
  )
}

function ShopifyIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f9e8]">
      <span className="font-[Georgia,serif] text-lg font-bold text-[#5a8a00]">S</span>
    </div>
  )
}

interface PlatformCardProps {
  icon: React.ReactNode
  name: string
  description: string
  connections: ProviderConnectionSafe[]
  onConnect: () => void
  onAddAnother: () => void
  onDelete: (id: string) => void
}

function PlatformCard({ icon, name, description, connections, onConnect, onAddAnother, onDelete }: PlatformCardProps) {
  const isConnected = connections.length > 0
  const isDegraded = connections.some(c => c.consecutiveFailureCount >= 3)

  return (
    <div className="flex min-h-[240px] flex-col rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-300 hover:shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        {icon}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{name}</h3>
            {isConnected && !isDegraded && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            )}
            {isDegraded && (
              <span className="flex items-center gap-1 text-[11px] text-amber-600">
                <AlertTriangle className="h-3 w-3" /> Degraded
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-zinc-500">{description}</p>

      <div className="mt-auto">
        {isConnected ? (
          <div className="space-y-2">
            {connections.map(c => (
              <ConnectionCard
                key={c.id}
                connection={c}
                onDelete={onDelete}
              />
            ))}
            <button
              type="button"
              onClick={onAddAnother}
              className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
            >
              <Plus className="h-3 w-3" />
              Add another
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Connect {name}
          </button>
        )}
      </div>
    </div>
  )
}

const FLOW_STEPS = ['Studio', 'Intelligence', 'Publish', 'Reach'] as const

const PLANNED = ['Ghost', 'Substack', 'Medium', 'Webflow', 'Beehiiv', 'HubSpot', 'Notion'] as const

export default function PublishingSettingsPage() {
  const [connections, setConnections]          = useState<ProviderConnectionSafe[]>([])
  const [loading, setLoading]                  = useState(true)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showShopifyModal, setShowShopifyModal] = useState(false)

  useEffect(() => {
    fetch('/api/publishing/connections')
      .then(r => r.ok ? r.json() : [])
      .then((data: ProviderConnectionSafe[]) => setConnections(data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') || params.get('error')) {
      window.history.replaceState({}, '', '/settings/publishing')
    }
  }, [])

  const wpConnections      = connections.filter(c => c.provider === 'wordpress')
  const shopifyConnections = connections.filter(c => c.provider === 'shopify')

  function handleDelete(id: string) {
    setConnections(prev => prev.filter(x => x.id !== id))
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-6 pb-16">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-zinc-100" />
          <div className="h-4 w-96 rounded bg-zinc-100" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-[240px] rounded-2xl bg-zinc-100" />
          <div className="h-[240px] rounded-2xl bg-zinc-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl pb-16">

      {/* Header */}
      <div className="mb-10">
        <h1 className="font-[Signifier] text-3xl font-semibold tracking-tight text-zinc-900">
          Publishing Infrastructure
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Connect publishing platforms to distribute longform content directly from Clout.
        </p>
      </div>

      {/* Distribution Channels */}
      <section className="mb-10">
        <div className="mb-4 flex items-baseline gap-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Distribution Channels
          </p>
          {connections.length > 0 && (
            <span className="text-[11px] text-zinc-400">
              {connections.length} connected
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PlatformCard
            icon={<WordPressIcon />}
            name="WordPress"
            description="Publish longform content directly from Clout into your WordPress environment."
            connections={wpConnections}
            onConnect={() => setShowConnectModal(true)}
            onAddAnother={() => setShowConnectModal(true)}
            onDelete={handleDelete}
          />
          <PlatformCard
            icon={<ShopifyIcon />}
            name="Shopify"
            description="Distribute editorial and commerce content directly into Shopify storefronts and blogs."
            connections={shopifyConnections}
            onConnect={() => setShowShopifyModal(true)}
            onAddAnother={() => setShowShopifyModal(true)}
            onDelete={handleDelete}
          />
        </div>
      </section>

      {/* Content Flow */}
      <section className="mb-10">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
          Content Flow
        </p>
        <div className="flex items-center gap-2.5">
          {FLOW_STEPS.map((step, i) => (
            <Fragment key={step}>
              {i > 0 && <span className="select-none text-zinc-300">·</span>}
              <span
                className={
                  step === 'Publish'
                    ? 'text-xs font-medium text-zinc-700'
                    : 'text-xs text-zinc-400'
                }
              >
                {step}
              </span>
            </Fragment>
          ))}
        </div>
      </section>

      {/* Planned Integrations */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
          Planned Integrations
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {PLANNED.map(name => (
            <span
              key={name}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600"
            >
              {name}
            </span>
          ))}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-support', { detail: { category: 'feature' } }))}
            className="px-1 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
          >
            Request Integration →
          </button>
        </div>
      </section>

      {showConnectModal && (
        <ConnectWordPressModal
          onClose={() => setShowConnectModal(false)}
          onConnected={c => setConnections(prev => [c, ...prev])}
        />
      )}

      {showShopifyModal && (
        <ConnectShopifyModal onClose={() => setShowShopifyModal(false)} />
      )}
    </div>
  )
}
