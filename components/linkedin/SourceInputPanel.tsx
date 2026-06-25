'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { LinkedInSourceType } from '@/lib/linkedin/types'

interface SourceInputPanelProps {
  sourceType: LinkedInSourceType | undefined
  sourceContent: string | undefined
  onSourceTypeChange: (type: LinkedInSourceType) => void
  onSourceContentChange: (content: string) => void
}

const TABS: { value: LinkedInSourceType; label: string }[] = [
  { value: 'url', label: 'URL' },
  { value: 'text', label: 'Text' },
  { value: 'upload', label: 'Upload' },
  { value: 'clout_capture', label: 'From Clout' },
]

const inputBase =
  'w-full bg-transparent text-[18px] leading-[1.75] text-zinc-900 placeholder:text-zinc-300 focus:outline-none'

export function SourceInputPanel({
  sourceType,
  sourceContent,
  onSourceTypeChange,
  onSourceContentChange,
}: SourceInputPanelProps) {
  const [uploadedFileName, setUploadedFileName] = useState<string>('')

  const tabValue = sourceType ?? 'text'

  function handleTabChange(value: LinkedInSourceType) {
    onSourceTypeChange(value)
    onSourceContentChange('') // clear stale content from previous tab
  }

  return (
    <div className="mt-6 rounded-[22px] border border-zinc-200 bg-white shadow-md overflow-hidden">
      {/* Header tab bar — replaces the old uppercase "SOURCE" label */}
      <div className="flex items-center gap-0 border-b border-zinc-100 px-5 pt-4 pb-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleTabChange(t.value)}
            className={cn(
              'pb-3 px-3 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0',
              tabValue === t.value
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div className="px-6 py-5 min-h-[160px]">
        {tabValue === 'url' && (
          <input
            type="url"
            placeholder="https://..."
            value={sourceContent ?? ''}
            onChange={e => onSourceContentChange(e.target.value)}
            className={inputBase}
          />
        )}

        {tabValue === 'text' && (
          <textarea
            placeholder="Paste your source content..."
            value={sourceContent ?? ''}
            onChange={e => onSourceContentChange(e.target.value)}
            className={`resize-none min-h-[140px] ${inputBase}`}
          />
        )}

        {tabValue === 'upload' && (
          <label className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 p-6 cursor-pointer hover:border-zinc-300 transition-colors bg-white">
            <span className="text-xs text-zinc-500 mb-1">
              {uploadedFileName ? uploadedFileName : 'Drop an image or click to browse'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  setUploadedFileName(file.name)
                  onSourceContentChange(reader.result as string)
                }
                reader.readAsDataURL(file)
              }}
            />
          </label>
        )}

        {tabValue === 'clout_capture' && (
          <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
            Connect a Clout capture — coming soon
          </div>
        )}
      </div>
    </div>
  )
}
