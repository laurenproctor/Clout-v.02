'use client'

import { useState } from 'react'
import type { Platform } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS, PLATFORM_DESCRIPTORS } from '@/lib/syndication/types/intelligence'

interface FocusedEditViewProps {
  platform: Platform
  content: string
  onChange: (content: string) => void
  onCopy: () => void
  onRegenerate: () => void
  onBack: () => void
}

export default function FocusedEditView({
  platform,
  content,
  onChange,
  onCopy,
  onRegenerate,
  onBack,
}: FocusedEditViewProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
        ← All versions
      </button>
      <div className="rounded-lg border border-zinc-200 p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
            {PLATFORM_LABELS[platform]}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">{PLATFORM_DESCRIPTORS[platform]}</p>
        </div>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopy} className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={onRegenerate} className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
            Regenerate {PLATFORM_LABELS[platform]} Version
          </button>
        </div>
      </div>
    </div>
  )
}
