'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { GeneratedBlogPackage } from '@/lib/blog/types'

interface DistributionCardsProps {
  distribution: GeneratedBlogPackage['distribution']
}

type Channel = 'linkedin' | 'xThread' | 'newsletter'

const CHANNELS: Array<{ key: Channel; label: string; description: string }> = [
  { key: 'linkedin', label: 'LinkedIn', description: 'Authority-forward, compressed argument' },
  { key: 'xThread', label: 'X Thread', description: 'Tension density, short idea units' },
  { key: 'newsletter', label: 'Newsletter', description: 'Intimate, continuation-optimized' },
]

export function DistributionCards({ distribution }: DistributionCardsProps) {
  const [active, setActive] = useState<Channel>('linkedin')
  const [copied, setCopied] = useState(false)

  const content = distribution[active]

  async function copy() {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Distribution</h3>
        <p className="text-xs text-zinc-400">Platform-adapted, not reformatted</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-100">
        {CHANNELS.map(ch => {
          const hasContent = !!distribution[ch.key]
          return (
            <button
              key={ch.key}
              type="button"
              onClick={() => hasContent && setActive(ch.key)}
              disabled={!hasContent}
              className={cn(
                'flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-b-2',
                active === ch.key
                  ? 'border-zinc-900 text-zinc-900'
                  : hasContent
                  ? 'border-transparent text-zinc-500 hover:text-zinc-700'
                  : 'border-transparent text-zinc-300 cursor-not-allowed'
              )}
            >
              {ch.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {content ? (
          <>
            <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 leading-relaxed">
              {content}
            </pre>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={copy}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-400">No content generated for this channel.</p>
        )}
      </div>
    </div>
  )
}
