'use client'

import type { HookExploration, BlogGenerationRequest } from '@/lib/blog/types'

interface ArticlePreviewRailProps {
  exploration: HookExploration | null
  selectedHeadline: string
  request: Partial<BlogGenerationRequest>
}

const READING_TIME: Record<string, string> = {
  short: '4 min read',
  standard: '7 min read',
  long: '12 min read',
  pillar: '20 min read',
}

const DISTRIBUTION_CHANNELS = [
  { label: 'LinkedIn', icon: '🔗' },
  { label: 'X / Twitter', icon: '𝕏' },
  { label: 'Newsletter', icon: '✉' },
]

function synthesizeMetaDescription(why: string, keyword: string): string {
  const base = why.length > 120 ? why.slice(0, 117) + '...' : why
  if (keyword && !base.toLowerCase().includes(keyword.toLowerCase())) {
    return base
  }
  return base
}

function mapAnglesToH2s(angles: string[]): string[] {
  return angles.slice(0, 4).map(angle => {
    // Capitalize and trim to make it look like a heading
    const trimmed = angle.trim()
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  })
}

export function ArticlePreviewRail({ exploration, selectedHeadline, request }: ArticlePreviewRailProps) {
  if (!exploration || !selectedHeadline) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-64 text-center px-6">
        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="3" width="12" height="2" rx="1" fill="#d4d4d8" />
            <rect x="3" y="7" width="10" height="1.5" rx="0.75" fill="#e4e4e7" />
            <rect x="3" y="10" width="11" height="1.5" rx="0.75" fill="#e4e4e7" />
            <rect x="3" y="13" width="8" height="1.5" rx="0.75" fill="#e4e4e7" />
          </svg>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-48">
          Select a narrative direction to preview your article structure
        </p>
      </div>
    )
  }

  const selectedOption = exploration.headlineOptions.find(o => o.title === selectedHeadline)
  const metaDescription = selectedOption
    ? synthesizeMetaDescription(selectedOption.why, request.primaryKeyword ?? '')
    : ''
  const outlineH2s = mapAnglesToH2s(exploration.alternateAngles)
  const readTime = READING_TIME[request.length ?? 'standard'] ?? '7 min read'

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Estimated Title</p>
        <h2 className="text-sm font-semibold text-zinc-900 leading-snug italic">
          {selectedHeadline}
        </h2>
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Meta Description</p>
        <p className="text-xs text-zinc-400 italic leading-relaxed border border-dashed border-zinc-200 rounded-lg p-3">
          {metaDescription}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Article Outline</p>
        <div className="border border-dashed border-zinc-200 rounded-lg p-3 space-y-1.5">
          {outlineH2s.length > 0 ? outlineH2s.map((h2, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-300">H2</span>
              <span className="text-xs text-zinc-500 italic">{h2}</span>
            </div>
          )) : (
            <p className="text-xs text-zinc-400 italic">Outline will be generated</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="#a1a1aa" strokeWidth="1.2" />
          <path d="M7 4v3l2 1.5" stroke="#a1a1aa" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="text-xs text-zinc-400">{readTime}</span>
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Distribution</p>
        <div className="space-y-1.5">
          {DISTRIBUTION_CHANNELS.map(ch => (
            <div key={ch.label} className="flex items-center gap-2">
              <span className="text-xs">{ch.icon}</span>
              <span className="text-xs text-zinc-500">{ch.label}</span>
              <span className="ml-auto text-xs text-zinc-300 italic">will be generated</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
