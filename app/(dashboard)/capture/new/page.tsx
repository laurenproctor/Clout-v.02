'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CaptureSource } from '@/types/domain'

const SOURCES: { value: CaptureSource; label: string; placeholder: string }[] = [
  { value: 'text', label: 'Text', placeholder: "What's on your mind? Dump it here — raw is fine." },
  { value: 'url', label: 'URL', placeholder: 'Paste a URL to capture context from...' },
  { value: 'structured', label: 'Prompt', placeholder: 'Answer the prompt below...' },
]

export default function NewCapturePage() {
  const router = useRouter()
  const [source, setSource] = useState<CaptureSource>('text')
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activePlaceholder = SOURCES.find((s) => s.value === source)?.placeholder ?? ''

  function addTag(value: string) {
    const tag = value.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          raw_content: source !== 'url' ? content : null,
          source_url: source === 'url' ? content : null,
          is_private: isPrivate,
          tags,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save capture')
        return
      }

      const capture = await res.json()
      router.push(`/capture/${capture.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/capture"
          className="text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">New capture</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source type */}
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 w-fit">
          {SOURCES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSource(value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                source === value
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main input */}
        <div className="rounded-lg border border-zinc-200 bg-white p-1">
          <textarea
            autoFocus
            className="w-full resize-none rounded-md bg-transparent px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none min-h-[200px]"
            placeholder={activePlaceholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* Tags */}
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Life sections
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 text-zinc-400 hover:text-zinc-700"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              className="text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none bg-transparent min-w-[120px]"
              placeholder="work, passions, love..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTag(tagInput)
                }
              }}
              onBlur={() => tagInput.trim() && addTag(tagInput)}
            />
          </div>
        </div>

        {/* Private toggle + submit */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsPrivate((v) => !v)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              isPrivate
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
            )}
          >
            <Lock className="h-3.5 w-3.5" />
            {isPrivate ? 'Private' : 'Keep private'}
          </button>

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className={cn(
              'rounded-md px-5 py-2 text-sm font-medium transition-colors',
              submitting || !content.trim()
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 text-white hover:bg-zinc-700'
            )}
          >
            {submitting ? 'Saving...' : 'Save capture →'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  )
}
