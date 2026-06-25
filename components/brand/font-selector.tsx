'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Search, Upload, ChevronDown } from 'lucide-react'

const FONT_ACCEPT = '.woff,.woff2,.ttf,.otf'
const FONT_ACCEPT_RE = /\.(woff2?|ttf|otf)$/i

const HEADING_FONTS = [
  'Playfair Display', 'Fraunces', 'DM Serif Display',
  'Libre Baskerville', 'Cormorant Garamond',
  'Montserrat', 'Raleway', 'Space Grotesk',
]

const BODY_FONTS = [
  'Inter', 'DM Sans', 'Plus Jakarta Sans', 'Nunito',
  'IBM Plex Sans', 'Source Sans 3', 'Lato', 'Merriweather',
]

export function injectGoogleFont(fontName: string) {
  const id = `gf-${fontName.replace(/\s+/g, '-')}`
  if (typeof document === 'undefined' || document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`
  document.head.appendChild(link)
}

interface FontSelectorProps {
  label: string
  value: string
  customUrl?: string
  role: 'heading' | 'body'
  onChange: (fontName: string, customUrl?: string) => void
  onUpload?: (file: File) => Promise<string>
  className?: string
}

export function FontSelector({ label, value, customUrl, role, onChange, onUpload, className }: FontSelectorProps) {
  const [mode, setMode] = useState<'curated' | 'search' | 'custom'>('curated')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const curated = role === 'heading' ? HEADING_FONTS : BODY_FONTS

  useEffect(() => {
    if (!customUrl && value) injectGoogleFont(value)
  }, [value, customUrl])

  async function processFile(file: File) {
    if (!onUpload) return
    setUploading(true)
    setUploadError(null)
    try {
      const url = await onUpload(file)
      onChange(file.name.replace(FONT_ACCEPT_RE, ''), url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!FONT_ACCEPT_RE.test(file.name)) {
      setUploadError('Please drop a .woff, .woff2, .ttf, or .otf file')
      return
    }
    processFile(file)
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</label>

      <div className="flex gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 w-fit">
        {(['curated', 'search', 'custom'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors',
              mode === m ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            {m === 'custom' ? 'Upload' : m}
          </button>
        ))}
      </div>

      {mode === 'curated' && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            style={{ fontFamily: customUrl ? undefined : `"${value}", sans-serif` }}
          >
            <span>{value || 'Select font'}</span>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </button>
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg max-h-60 overflow-y-auto">
              {curated.map(font => {
                injectGoogleFont(font)
                return (
                  <button
                    key={font}
                    type="button"
                    onClick={() => { onChange(font, undefined); setOpen(false) }}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 transition-colors',
                      value === font && !customUrl && 'bg-zinc-50 font-medium'
                    )}
                  >
                    <span style={{ fontFamily: `"${font}", sans-serif` }}>{font}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'search' && (
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type a Google Font name..."
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </div>
          {search.trim() && (
            <button
              type="button"
              onClick={() => { injectGoogleFont(search.trim()); onChange(search.trim(), undefined); setSearch('') }}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-left hover:bg-zinc-100 transition-colors"
            >
              Use &ldquo;<span style={{ fontFamily: `"${search.trim()}", sans-serif` }}>{search.trim()}</span>&rdquo;
            </button>
          )}
          {value && !customUrl && (
            <p className="text-xs text-zinc-500">
              Current: <span style={{ fontFamily: `"${value}", sans-serif` }}>{value}</span>
            </p>
          )}
        </div>
      )}

      {mode === 'custom' && (
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept={FONT_ACCEPT} onChange={handleFileUpload} className="sr-only" />
          <div
            role="button"
            tabIndex={0}
            onClick={() => !uploading && fileRef.current?.click()}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !uploading && fileRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-5 text-sm transition-colors cursor-pointer select-none',
              uploading && 'pointer-events-none opacity-50',
              isDragging
                ? 'border-zinc-500 bg-zinc-100 text-zinc-800'
                : 'border-zinc-300 bg-zinc-50 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'
            )}
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs text-center">
              {uploading
                ? 'Uploading…'
                : isDragging
                  ? 'Drop font file here'
                  : customUrl
                    ? 'Drop or click to replace font'
                    : 'Drop font file here, or click to browse'}
            </span>
            <span className="text-[10px] text-zinc-400">.woff  .woff2  .ttf  .otf</span>
          </div>
          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          {customUrl && <p className="text-xs text-zinc-500">Current: <span className="font-medium">{value}</span></p>}
        </div>
      )}
    </div>
  )
}
