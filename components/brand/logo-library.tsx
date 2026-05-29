'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, Check, Trash2, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoLibraryProps {
  logos: string[]
  activeLogo: string | null
  lightLogo?: string | null
  darkLogo?: string | null
  onUpload: (file: File) => Promise<void>
  onActivate: (url: string) => void
  onDelete: (url: string) => Promise<void>
  onTagLight?: (url: string | null) => void
  onTagDark?: (url: string | null) => void
}

export function LogoLibrary({ logos, activeLogo, lightLogo, darkLogo, onUpload, onActivate, onDelete, onTagLight, onTagDark }: LogoLibraryProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      await onUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(url: string) {
    setDeletingUrl(url)
    try {
      await onDelete(url)
    } finally {
      setDeletingUrl(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Logo Library</label>
        <p className="mt-1 text-xs text-zinc-400">
          For the largest design variety, we recommend uploading a dark and a light version of your logo.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {logos.map(url => {
          const isActive = url === activeLogo
          const isDeleting = url === deletingUrl
          const isLight = url === lightLogo
          const isDark = url === darkLogo
          return (
            <div key={url} className="group relative flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => !isActive && onActivate(url)}
                disabled={isActive}
                title={isActive ? 'Active logo' : 'Set as active logo'}
                className={cn(
                  'relative flex h-20 w-20 items-center justify-center rounded-lg border-2 bg-zinc-50 p-2 transition-colors',
                  isActive
                    ? 'border-zinc-800 cursor-default'
                    : 'border-zinc-200 hover:border-zinc-400 cursor-pointer'
                )}
              >
                <Image src={url} alt="Logo" fill className="object-contain p-2" unoptimized />
                {isActive && (
                  <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                )}
                {isLight && !isActive && (
                  <div className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400" title="Light logo variant">
                    <Sun className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                {isDark && !isActive && (
                  <div className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-600" title="Dark logo variant">
                    <Moon className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </button>

              {/* Light / Dark tag buttons — shown on hover */}
              {(onTagLight || onTagDark) && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    title={isLight ? 'Remove light tag' : 'Tag as light logo'}
                    onClick={() => onTagLight?.(isLight ? null : url)}
                    className={cn(
                      'flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors border',
                      isLight
                        ? 'border-amber-400 bg-amber-50 text-amber-600'
                        : 'border-zinc-200 text-zinc-400 hover:border-amber-300 hover:text-amber-500'
                    )}
                  >
                    <Sun className="h-2.5 w-2.5" />
                    Light
                  </button>
                  <button
                    type="button"
                    title={isDark ? 'Remove dark tag' : 'Tag as dark logo'}
                    onClick={() => onTagDark?.(isDark ? null : url)}
                    className={cn(
                      'flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors border',
                      isDark
                        ? 'border-zinc-500 bg-zinc-100 text-zinc-700'
                        : 'border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600'
                    )}
                  >
                    <Moon className="h-2.5 w-2.5" />
                    Dark
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleDelete(url)}
                disabled={isDeleting}
                title="Remove logo"
                className="absolute -bottom-2 -right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 group-hover:flex disabled:opacity-50"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          )
        })}

        {/* Upload tile */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={cn(
            'flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors self-start',
            uploading
              ? 'border-zinc-300 bg-zinc-50 cursor-wait'
              : dragging
              ? 'border-zinc-400 bg-zinc-100'
              : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300'
          )}
        >
          <Upload className="h-4 w-4 text-zinc-400" />
          <span className="text-[10px] text-zinc-400 text-center leading-tight px-1">
            {uploading ? 'Uploading…' : 'Add logo'}
          </span>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        className="sr-only"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
      {logos.length > 0 && (
        <p className="text-xs text-zinc-400">
          Click a logo to set it as active. Hover to tag it as your light or dark variant for auto-formatting.
        </p>
      )}
    </div>
  )
}
