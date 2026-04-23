'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Upload, X } from 'lucide-react'
import Image from 'next/image'

interface LogoUploaderProps {
  value: string | null
  onUpload: (file: File) => Promise<string>
  onRemove: () => void
  className?: string
}

export function LogoUploader({ value, onUpload, onRemove, className }: LogoUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Logo</label>

      {value ? (
        <div className="relative flex h-20 w-20 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          <Image src={value} alt="Brand logo" fill className="object-contain p-2" unoptimized />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-white hover:bg-zinc-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors',
            dragging ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
          )}
        >
          <Upload className="h-4 w-4 text-zinc-400" />
          <span className="text-xs text-zinc-400">{uploading ? 'Uploading...' : 'PNG, JPG, SVG, WebP'}</span>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        className="sr-only"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
