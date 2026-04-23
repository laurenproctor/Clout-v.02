'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X, Paperclip, Loader2, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SupportModalProps {
  open: boolean
  onClose: () => void
}

type Category = 'question' | 'bug' | 'feature' | 'billing' | 'call'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'question', label: 'Ask a question' },
  { id: 'bug', label: 'Report a bug' },
  { id: 'feature', label: 'Request a feature' },
  { id: 'billing', label: 'Billing issue' },
  { id: 'call', label: 'Book a call' },
]

const PLACEHOLDERS: Record<Category, string> = {
  question: 'What would you like to know? We read every message.',
  bug: "What happened? What did you expect? We'll look into it right away.",
  feature: "What would make Clout more useful for you? Describe the problem you're trying to solve.",
  billing: 'What can we help you with? Share any details about your plan or charges.',
  call: '',
}

const CALENDLY_URL = 'https://calendly.com/clout'

export function SupportModal({ open, onClose }: SupportModalProps) {
  const pathname = usePathname()
  const [category, setCategory] = useState<Category>('question')
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setCategory('question')
      setMessage('')
      setScreenshot(null)
      setSuccess(false)
      setError(null)
      setTimeout(() => textareaRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      let screenshotUrl: string | null = null

      if (screenshot) {
        const supabase = createClient()
        const path = `${Date.now()}-${screenshot.name}`
        const { data, error: uploadError } = await supabase.storage
          .from('support-screenshots')
          .upload(path, screenshot, { cacheControl: '3600', upsert: false })
        if (!uploadError && data) {
          const { data: urlData } = supabase.storage
            .from('support-screenshots')
            .getPublicUrl(data.path)
          screenshotUrl = urlData.publicUrl
        }
      }

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message,
          screenshotUrl,
          currentRoute: pathname,
          browserInfo: navigator.userAgent,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Get help or request a feature</p>
            <p className="text-xs text-zinc-400 mt-0.5">The founder, Lauren Proctor, reads every message.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 transition-colors p-1 rounded-md hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center gap-4 px-8 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
              <span className="text-white text-lg">✓</span>
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-900">Got it.</p>
              <p className="text-sm text-zinc-500 mt-1">We usually reply within a few hours.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg border border-zinc-200 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Category pills */}
            <div className="flex flex-wrap gap-2 px-6 pt-5 pb-4">
              {CATEGORIES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                    category === id
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {category === 'call' ? (
              /* Book a call — no form */
              <div className="px-6 pb-6 space-y-4">
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Pick a time that works for you. We'll talk through whatever you need — no agenda required.
                </p>
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
                >
                  Open scheduling page
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <>
                {/* Message */}
                <div className="px-6 pb-2">
                  <textarea
                    ref={textareaRef}
                    className="w-full resize-none bg-zinc-50 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors min-h-[120px]"
                    placeholder={PLACEHOLDERS[category]}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4 bg-zinc-50/60 rounded-b-2xl">
                  {/* Screenshot attach */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {screenshot ? (
                        <span className="text-zinc-700 font-medium truncate max-w-[140px]">{screenshot.name}</span>
                      ) : (
                        'Attach screenshot'
                      )}
                    </button>
                    {screenshot && (
                      <button
                        type="button"
                        onClick={() => setScreenshot(null)}
                        className="text-zinc-300 hover:text-zinc-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        setScreenshot(file)
                        e.target.value = ''
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    {error && <p className="text-xs text-red-600 max-w-[160px] text-right">{error}</p>}
                    <button
                      type="submit"
                      disabled={submitting || !message.trim()}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
                        submitting || !message.trim()
                          ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                          : 'bg-zinc-900 text-white hover:bg-zinc-700'
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        'Send →'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
