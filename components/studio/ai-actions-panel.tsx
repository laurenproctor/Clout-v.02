'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, Copy, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AiActionId } from '@/app/api/ai-actions/route'
import type { MajorResult } from '@/hooks/use-ai-actions'

const GROUPS = [
  {
    label: 'Refine',
    actions: [
      { id: 'sharpen_opener' as AiActionId, label: 'Sharpen opener' },
      { id: 'shorter' as AiActionId, label: 'Shorter' },
      { id: 'more_direct' as AiActionId, label: 'More direct' },
      { id: 'stronger_cta' as AiActionId, label: 'Stronger CTA' },
    ],
  },
  {
    label: 'Transform',
    actions: [
      { id: 'thread' as AiActionId, label: 'Thread' },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
  running: AiActionId | null
  majorResult: MajorResult | null
  onAction: (action: AiActionId) => void
}

export function AiActionsPanel({ open, onClose, running, majorResult, onAction }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  async function copyResult(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden="true" />
      )}
      <div
        role="dialog"
        aria-label="AI Actions"
        className={cn(
          'fixed right-0 top-0 bottom-0 z-40 w-[280px] flex flex-col',
          'bg-zinc-950 border-l border-zinc-800',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-200">AI Actions</span>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2 px-1">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.actions.map((action) => {
                  const isRunning = running === action.id
                  return (
                    <button
                      key={action.id}
                      onClick={() => onAction(action.id)}
                      disabled={running !== null}
                      className={cn(
                        'w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-left transition-colors',
                        isRunning
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
                        running !== null && !isRunning && 'opacity-30 cursor-not-allowed'
                      )}
                    >
                      <span>{action.label}</span>
                      {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {majorResult && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-300">{majorResult.label}</span>
                <button
                  onClick={() => copyResult(majorResult.content)}
                  className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  {copied
                    ? <><Check className="h-3 w-3" /> Copied</>
                    : <><Copy className="h-3 w-3" /> Copy</>
                  }
                </button>
              </div>
              <p className="px-3 py-3 text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {majorResult.content}
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-800 flex-shrink-0">
          <p className="text-[10px] text-zinc-700">
            <kbd className="font-mono">⌘J</kbd> to toggle
          </p>
        </div>
      </div>
    </>
  )
}
