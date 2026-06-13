'use client'

import { useState } from 'react'
import { X, ShoppingBag } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface ConnectShopifyModalProps {
  onClose: () => void
}

export function ConnectShopifyModal({ onClose }: ConnectShopifyModalProps) {
  const [shop, setShop]             = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    let domain = shop.trim().toLowerCase()
    if (!domain) return

    domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!domain.includes('.')) {
      domain = `${domain}.myshopify.com`
    }

    setSubmitting(true)
    window.location.href = `/api/publishing/providers/shopify/install?shop=${encodeURIComponent(domain)}`
    setTimeout(() => setSubmitting(false), 8000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Connect Shopify Store</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Publish blog articles to your storefront</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Store Domain
            </label>
            <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 focus-within:border-zinc-400">
              <span className="shrink-0 pl-3 text-sm text-zinc-400">https://</span>
              <input
                type="text"
                value={shop}
                onChange={e => setShop(e.target.value)}
                placeholder="your-store.myshopify.com"
                required
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400">
              Enter your myshopify.com domain or just the store name.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-xs font-medium text-zinc-600">You&apos;ll be redirected to Shopify to authorize access.</p>
            <p className="mt-1 text-[11px] text-zinc-400">Clout will request <strong>write_content</strong> and <strong>read_content</strong> permissions to publish blog articles.</p>
          </div>

          {error && (
            <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-md border border-zinc-200 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#96BF48] py-2 text-sm font-medium text-white transition-colors hover:bg-[#85ab3e] disabled:opacity-50">
              {submitting ? <Spinner size="sm" /> : <ShoppingBag className="h-3.5 w-3.5" />}
              {submitting ? 'Redirecting…' : 'Connect with Shopify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
