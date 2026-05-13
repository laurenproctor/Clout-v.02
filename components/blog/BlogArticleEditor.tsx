'use client'

import { useState, useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { marked } from 'marked'
import type { GeneratedBlogPackage } from '@/lib/blog/types'

type ViewMode = 'markdown' | 'html' | 'text'

interface BlogArticleEditorProps {
  blogPackage: GeneratedBlogPackage
  onRegenerateSection: (sectionIndex: number) => void
}

function markdownToText(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string
}

function getContent(markdown: string, mode: ViewMode): string {
  if (mode === 'text') return markdownToText(markdown)
  if (mode === 'html') return markdownToHtml(markdown)
  return markdown
}

const MODE_LABELS: Record<ViewMode, string> = {
  markdown: 'Markdown',
  html: 'HTML',
  text: 'Text',
}

const COPY_LABELS: Record<ViewMode, string> = {
  markdown: 'Copy Markdown',
  html: 'Copy HTML',
  text: 'Copy Text',
}

export function BlogArticleEditor({ blogPackage, onRegenerateSection }: BlogArticleEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('markdown')
  const [regenerating, setRegenerating] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const { article, metadata } = blogPackage

  // Split markdown into sections by h2/h3 headings for per-section regeneration
  const sections = useMemo(
    () => article.markdown.split(/(?=^#{2,3}\s)/m).filter(Boolean),
    [article.markdown]
  )

  async function handleRegenerate(index: number) {
    setRegenerating(index)
    try {
      await onRegenerateSection(index)
    } finally {
      setRegenerating(null)
    }
  }

  async function copyContent() {
    const content = getContent(article.markdown, viewMode)
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 truncate">{article.title}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-zinc-400">{article.wordCount.toLocaleString()} words</span>
            <span className="text-zinc-200">·</span>
            <span className="text-xs text-zinc-400">~{Math.ceil(article.wordCount / 230)} min read</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Format toggle */}
          <div className="flex rounded-md border border-zinc-200 overflow-hidden text-xs font-medium">
            {(['markdown', 'html', 'text'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  viewMode === mode
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50'
                )}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={copyContent}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 whitespace-nowrap"
          >
            {copied ? 'Copied!' : COPY_LABELS[viewMode]}
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="border-b border-zinc-100 px-6 py-3 bg-zinc-50 grid grid-cols-1 gap-1">
        <div className="flex gap-2">
          <span className="text-xs font-medium text-zinc-500 shrink-0">Meta Title:</span>
          <span className="text-xs text-zinc-700">{metadata.metaTitle}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-xs font-medium text-zinc-500 shrink-0">Meta Description:</span>
          <span className="text-xs text-zinc-700">{metadata.metaDescription}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-xs font-medium text-zinc-500 shrink-0">Slug:</span>
          <span className="text-xs text-zinc-600 font-mono">/{metadata.slug}</span>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'markdown' || viewMode === 'text' ? (
        <div className="divide-y divide-zinc-50">
          {sections.map((section, i) => {
            const displayed = viewMode === 'text' ? markdownToText(section) : section
            return (
              <div key={i} className="group relative px-6 py-4 hover:bg-zinc-50/50 transition-colors">
                <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-800 leading-relaxed">
                  {displayed.trim()}
                </pre>
                {viewMode === 'markdown' && (
                  <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleRegenerate(i)}
                      disabled={regenerating !== null}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors',
                        regenerating === i
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:border-zinc-300 hover:bg-zinc-50'
                      )}
                    >
                      <RotateCcw className={cn('h-3 w-3', regenerating === i && 'animate-spin')} />
                      {regenerating === i ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* HTML view — full document as source, monospace */
        <div className="px-6 py-4">
          <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-700 leading-relaxed">
            {markdownToHtml(article.markdown)}
          </pre>
        </div>
      )}
    </div>
  )
}
