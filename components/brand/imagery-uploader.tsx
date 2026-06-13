'use client'

import { useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

interface ImageryUploaderProps {
  images: string[]
  onUpload: (file: File) => Promise<void>
  onDelete: (url: string) => Promise<void>
  className?: string
}

export function ImageryUploader({ images, onUpload, onDelete, className }: ImageryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadError(null)
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await onUpload(file)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
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
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
          dragOver
            ? 'border-zinc-400 bg-zinc-100'
            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100'
        )}
      >
        {uploading ? (
          <Spinner size="lg" />
        ) : (
          <Upload className="h-5 w-5 text-zinc-400" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-600">
            {uploading ? 'Uploading...' : 'Drop images here or click to browse'}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">PNG, JPG, WebP, GIF · Max 10 MB each</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}

      {/* Uploaded image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map(url => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-md bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
              />
              <button
                type="button"
                disabled={deletingUrl === url}
                onClick={() => handleDelete(url)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80 disabled:opacity-50"
                aria-label="Remove image"
              >
                {deletingUrl === url ? (
                  <Spinner size="xs" className="text-white" label="Removing image" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && !uploading && (
        <div className="flex items-center gap-2 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
          <ImageIcon className="h-4 w-4 text-zinc-300 shrink-0" />
          <p className="text-xs text-zinc-400">No images uploaded yet. These will be used for posts and to guide image generation.</p>
        </div>
      )}
    </div>
  )
}
