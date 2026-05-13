'use client'

import { useEffect, useRef, useState } from 'react'
import type { HookExploration, BlogGenerationRequest } from '@/lib/blog/types'

interface ArticlePreviewRailProps {
  exploration: HookExploration | null
  selectedHeadline: string
  request: Partial<BlogGenerationRequest>
  onHeadlineChange?: (headline: string) => void
  editableOutline?: string[]
  onOutlineChange?: (h2s: string[]) => void
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

function DraggableOutline({
  outline,
  onOutlineChange,
}: {
  outline: string[]
  onOutlineChange: (h2s: string[]) => void
}) {
  const dragIndex = useRef<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)

  function handleDragStart(i: number) {
    dragIndex.current = i
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragIndex.current !== null && dragIndex.current !== i) {
      setDropTarget(i)
    }
  }

  function handleDrop(i: number) {
    const from = dragIndex.current
    if (from === null || from === i) return
    const next = [...outline]
    const [moved] = next.splice(from, 1)
    next.splice(i, 0, moved)
    onOutlineChange(next)
    dragIndex.current = null
    setDropTarget(null)
  }

  function handleDragEnd() {
    dragIndex.current = null
    setDropTarget(null)
  }

  function updateH2(index: number, value: string) {
    onOutlineChange(outline.map((h, i) => (i === index ? value : h)))
  }

  function removeH2(index: number) {
    onOutlineChange(outline.filter((_, i) => i !== index))
  }

  function addH2() {
    onOutlineChange([...outline, ''])
  }

  return (
    <div className="space-y-1.5">
      {outline.map((h2, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-1.5 group rounded transition-colors ${
            dropTarget === i ? 'bg-zinc-100' : ''
          }`}
        >
          {/* Drag handle */}
          <span
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 text-zinc-300 hover:text-zinc-500"
            aria-hidden
          >
            <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
              <circle cx="3" cy="3" r="1.2" fill="currentColor" />
              <circle cx="7" cy="3" r="1.2" fill="currentColor" />
              <circle cx="3" cy="7" r="1.2" fill="currentColor" />
              <circle cx="7" cy="7" r="1.2" fill="currentColor" />
              <circle cx="3" cy="11" r="1.2" fill="currentColor" />
              <circle cx="7" cy="11" r="1.2" fill="currentColor" />
            </svg>
          </span>
          <span className="text-xs font-mono text-zinc-300 shrink-0">H2</span>
          <input
            type="text"
            value={h2}
            onChange={e => updateH2(i, e.target.value)}
            placeholder="Section heading..."
            className="flex-1 min-w-0 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300"
          />
          <button
            type="button"
            onClick={() => removeH2(i)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 hover:text-zinc-500 shrink-0"
            aria-label="Remove section"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addH2}
        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors mt-1"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Add section
      </button>
    </div>
  )
}

export function ArticlePreviewRail({
  exploration,
  selectedHeadline,
  request,
  onHeadlineChange,
  editableOutline,
  onOutlineChange,
}: ArticlePreviewRailProps) {
  const [localHeadline, setLocalHeadline] = useState(selectedHeadline)

  useEffect(() => {
    setLocalHeadline(selectedHeadline)
  }, [selectedHeadline])

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
  const readTime = READING_TIME[request.length ?? 'standard'] ?? '7 min read'

  const outline = editableOutline ?? []

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Title</p>
        {onHeadlineChange ? (
          <textarea
            value={localHeadline}
            onChange={e => {
              setLocalHeadline(e.target.value)
              onHeadlineChange(e.target.value)
            }}
            rows={2}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 leading-snug focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 resize-none"
          />
        ) : (
          <h2 className="text-sm font-semibold text-zinc-900 leading-snug italic">
            {selectedHeadline}
          </h2>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Meta Description</p>
        <p className="text-xs text-zinc-400 italic leading-relaxed border border-dashed border-zinc-200 rounded-lg p-3">
          {metaDescription}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Article Outline</p>
        {onOutlineChange ? (
          <DraggableOutline
            outline={outline}
            onOutlineChange={onOutlineChange}
          />
        ) : (
          <div className="border border-dashed border-zinc-200 rounded-lg p-3 space-y-1.5">
            {outline.length > 0 ? outline.map((h2, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-300">H2</span>
                <span className="text-xs text-zinc-500 italic">{h2}</span>
              </div>
            )) : (
              <p className="text-xs text-zinc-400 italic">Outline will be generated</p>
            )}
          </div>
        )}
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
