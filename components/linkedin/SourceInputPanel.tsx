'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { LinkedInSourceType } from '@/lib/linkedin/types'

interface SourceInputPanelProps {
  sourceType: LinkedInSourceType | undefined
  sourceContent: string | undefined
  onSourceTypeChange: (type: LinkedInSourceType) => void
  onSourceContentChange: (content: string) => void
}

const inputBase =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors'

export function SourceInputPanel({
  sourceType,
  sourceContent,
  onSourceTypeChange,
  onSourceContentChange,
}: SourceInputPanelProps) {
  const [uploadedFileName, setUploadedFileName] = useState<string>('')

  const tabValue = sourceType ?? 'text'

  function handleTabChange(value: string) {
    onSourceTypeChange(value as LinkedInSourceType)
    onSourceContentChange('') // clear stale content from previous tab
  }

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Source</p>
      <Tabs value={tabValue} onValueChange={handleTabChange}>
        <TabsList className="mb-3">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="clout_capture">From Clout</TabsTrigger>
        </TabsList>

        <TabsContent value="url">
          <input
            type="url"
            placeholder="https://..."
            value={sourceContent ?? ''}
            onChange={e => onSourceContentChange(e.target.value)}
            className={inputBase}
          />
        </TabsContent>

        <TabsContent value="text">
          <textarea
            rows={6}
            placeholder="Paste your source content..."
            value={sourceContent ?? ''}
            onChange={e => onSourceContentChange(e.target.value)}
            className={`resize-none ${inputBase}`}
          />
        </TabsContent>

        <TabsContent value="upload">
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
        </TabsContent>

        <TabsContent value="clout_capture">
          <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
            Connect a Clout capture — coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
