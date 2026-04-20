'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickCaptureModalProps {
  open: boolean
  onClose: () => void
}

export function QuickCaptureModal({ open, onClose }: QuickCaptureModalProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setContent('')
      setIsPrivate(false)
      setError(null)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const endpoint = isPrivate ? '/api/private' : '/api/capture'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'text', raw_content: content, is_private: isPrivate }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save')
        return
      }

      const capture = await res.json()
      onClose()

      if (isPrivate) {
        router.push('/private')
      } else {
        router.push(`/capture/${capture.id}`)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-xl border border-zinc-200 bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Quick capture  <kbd className="ml-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">⌘K</kbd>
              </p>
              <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              className="w-full resize-none bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none min-h-[120px]"
              placeholder="What's on your mind? Dump it here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
              }}
            />
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 bg-zinc-50 rounded-b-xl">
            <button
              type="button"
              onClick={() => setIsPrivate((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                isPrivate ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              <Lock className="h-3 w-3" />
              Private
            </button>
            <div className="flex items-center gap-2">
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className={cn(
                  'rounded-md px-4 py-1.5 text-xs font-medium transition-colors',
                  submitting || !content.trim()
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-900 text-white hover:bg-zinc-700'
                )}
              >
                {submitting ? 'Saving...' : 'Save  ⌘↵'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
