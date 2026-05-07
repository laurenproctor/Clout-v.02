'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedBlogPackage } from '@/lib/blog/types'

interface BlogArticleEditorProps {
  blogPackage: GeneratedBlogPackage
  onRegenerateSection: (sectionIndex: number) => void
}

export function BlogArticleEditor({ blogPackage, onRegenerateSection }: BlogArticleEditorProps) {
  const [regenerating, setRegenerating] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const { article, metadata } = blogPackage

  async function handleRegenerate(index: number) {
    setRegenerating(index)
    try {
      await onRegenerateSection(index)
    } finally {
      setRegenerating(null)
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(article.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Split markdown into sections by h2/h3 headings
  const sections = article.markdown.split(/(?=^#{2,3}\s)/m).filter(Boolean)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{article.title}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-zinc-400">{article.wordCount.toLocaleString()} words</span>
            <span className="text-zinc-200">·</span>
            <span className="text-xs text-zinc-400">~{Math.ceil(article.wordCount / 230)} min read</span>
          </div>
        </div>
        <button
          type="button"
          onClick={copyMarkdown}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          {copied ? 'Copied!' : 'Copy Markdown'}
        </button>
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

      {/* Sections */}
      <div className="divide-y divide-zinc-50">
        {sections.map((section, i) => (
          <div key={i} className="group relative px-6 py-4 hover:bg-zinc-50/50 transition-colors">
            <div className="prose prose-sm prose-zinc max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-800 leading-relaxed">
                {section.trim()}
              </pre>
            </div>
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
          </div>
        ))}
      </div>
    </div>
  )
}
