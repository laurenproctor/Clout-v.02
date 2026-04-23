'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { CaptureComposer } from '@/components/capture/capture-composer'

interface QuickCaptureModalProps {
  open: boolean
  onClose: () => void
}

export function QuickCaptureModal({ open, onClose }: QuickCaptureModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            New capture&nbsp;&nbsp;<kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">⌘K</kbd>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 transition-colors p-1 rounded-md hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <CaptureComposer onClose={onClose} />
      </div>
    </div>
  )
}
