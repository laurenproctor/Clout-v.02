'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'
import type { FormatterWarning } from '@/lib/publishing/providers/medium/formatter'

interface MediumEditorialPreviewProps {
  article: CanonicalArticle
  subtitle?: string
  tags?: string[]
  canonicalUrl?: string
  publication?: string
  warnings?: FormatterWarning[]
  className?: string
}

const WARNING_LABELS: Record<FormatterWarning['type'], string> = {
  subtitle_rendering: 'Subtitle rendering',
  list_heavy:         'List-heavy content',
  cta_detected:       'CTA in closing',
  tags_truncated:     'Tags truncated',
  relative_images:    'Relative image URLs',
}

function readingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 238))
}

function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
}

export function MediumEditorialPreview({
  article,
  subtitle,
  tags = [],
  canonicalUrl,
  publication,
  warnings = [],
  className,
}: MediumEditorialPreviewProps) {
  const wordCount = useMemo(() => {
    return article.body.reduce((acc, node) => {
      if (node.type === 'paragraph')   return acc + countWords(node.html)
      if (node.type === 'heading')     return acc + countWords(node.text)
      if (node.type === 'blockquote')  return acc + countWords(node.html)
      if (node.type === 'code')        return acc + countWords(node.code)
      if (node.type === 'list')        return acc + node.items.reduce((s, i) => s + countWords(i), 0)
      return acc
    }, 0)
  }, [article.body])

  const minutes = readingTime(wordCount)
  const displayTags = tags.slice(0, 5)

  return (
    <div className={cn('rounded-2xl border border-zinc-200 bg-white', className)}>
      {/* Preview header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
        <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
          Medium preview
        </span>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          {publication && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
              {publication}
            </span>
          )}
          <span>{wordCount.toLocaleString()} words</span>
          <span>{minutes} min read</span>
        </div>
      </div>

      {/* Article content */}
      <div className="px-8 py-8 md:px-16 md:py-12">
        <div className="mx-auto max-w-[680px]">

          {/* Title */}
          <h1 className="font-[Georgia,_serif] text-3xl font-bold leading-tight text-zinc-900 md:text-4xl">
            {article.title || <span className="text-zinc-300">Untitled</span>}
          </h1>

          {/* Subtitle / dek */}
          {subtitle && (
            <p className="mt-3 font-[Georgia,_serif] text-lg italic leading-relaxed text-zinc-500">
              {subtitle}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-100 pb-5 text-xs text-zinc-400">
            {canonicalUrl && (
              <span className="truncate">
                Originally published at{' '}
                <span className="text-zinc-600">{canonicalUrl}</span>
              </span>
            )}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {displayTags.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-[11px] text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
                {tags.length > 5 && (
                  <span className="text-[11px] text-amber-500">+{tags.length - 5} truncated</span>
                )}
              </div>
            )}
          </div>

          {/* Body preview */}
          <div className="prose prose-zinc mt-6 max-w-none font-[Georgia,_serif] text-[18px] leading-[1.8] text-zinc-800">
            {article.body.slice(0, 8).map((node, i) => {
              if (node.type === 'paragraph') {
                return (
                  <p
                    key={i}
                    className="mb-5"
                    dangerouslySetInnerHTML={{ __html: node.html }}
                  />
                )
              }
              if (node.type === 'heading') {
                const Tag = `h${node.level}` as 'h2' | 'h3' | 'h4'
                return (
                  <Tag
                    key={i}
                    className="mb-3 mt-8 font-[Georgia,_serif] font-bold text-zinc-900"
                  >
                    {node.text}
                  </Tag>
                )
              }
              if (node.type === 'blockquote') {
                return (
                  <blockquote
                    key={i}
                    className="mb-5 border-l-2 border-zinc-300 pl-5 italic text-zinc-600"
                    dangerouslySetInnerHTML={{ __html: node.html }}
                  />
                )
              }
              if (node.type === 'list') {
                const ListTag = node.ordered ? 'ol' : 'ul'
                return (
                  <ListTag key={i} className="mb-5 space-y-1.5 pl-6">
                    {node.items.map((item, j) => (
                      <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                    ))}
                  </ListTag>
                )
              }
              if (node.type === 'image') {
                return (
                  <figure key={i} className="mb-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={node.url}
                      alt={node.alt ?? ''}
                      className="w-full rounded-lg"
                    />
                    {node.caption && (
                      <figcaption className="mt-2 text-center text-sm text-zinc-400">
                        {node.caption}
                      </figcaption>
                    )}
                  </figure>
                )
              }
              if (node.type === 'divider') {
                return <hr key={i} className="my-8 border-zinc-200" />
              }
              return null
            })}
            {article.body.length > 8 && (
              <p className="mt-4 text-sm italic text-zinc-400">
                — {article.body.length - 8} more sections not shown in preview —
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Formatter warnings */}
      {warnings.length > 0 && (
        <div className="border-t border-zinc-100 px-6 py-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Formatter notes
          </p>
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>
                  <span className="font-medium text-zinc-700">{WARNING_LABELS[w.type]}</span>
                  {' — '}
                  {w.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
