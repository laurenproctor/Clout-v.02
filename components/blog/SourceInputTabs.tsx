'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BlogGenerationRequest } from '@/lib/blog/types'

interface SourceInputTabsProps {
  sourceType: BlogGenerationRequest['sourceType']
  sourceContent: string
  primaryKeyword: string
  onChangeType: (type: BlogGenerationRequest['sourceType']) => void
  onChangeContent: (content: string) => void
  onChangeKeyword: (keyword: string) => void
}

export function SourceInputTabs({
  sourceType,
  sourceContent,
  primaryKeyword,
  onChangeType,
  onChangeContent,
  onChangeKeyword,
}: SourceInputTabsProps) {
  return (
    <Tabs value={sourceType} onValueChange={(v) => onChangeType(v as BlogGenerationRequest['sourceType'])}>
      <TabsList className="w-full grid grid-cols-3 h-8 bg-zinc-100 rounded-md p-0.5">
        <TabsTrigger value="keyword" className="text-xs rounded-sm">Keyword</TabsTrigger>
        <TabsTrigger value="url" className="text-xs rounded-sm">URL</TabsTrigger>
        <TabsTrigger value="text" className="text-xs rounded-sm">Paste</TabsTrigger>
      </TabsList>

      <TabsContent value="keyword" className="mt-2">
        <input
          type="text"
          placeholder="Primary keyword"
          value={primaryKeyword}
          onChange={e => onChangeKeyword(e.target.value)}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        />
      </TabsContent>

      <TabsContent value="url" className="mt-2">
        <input
          type="url"
          placeholder="https://..."
          value={sourceContent}
          onChange={e => onChangeContent(e.target.value)}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        />
        <input
          type="text"
          placeholder="Primary keyword"
          value={primaryKeyword}
          onChange={e => onChangeKeyword(e.target.value)}
          className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        />
      </TabsContent>

      <TabsContent value="text" className="mt-2">
        <textarea
          placeholder="Paste source content..."
          value={sourceContent}
          onChange={e => onChangeContent(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 resize-none"
        />
        <input
          type="text"
          placeholder="Primary keyword"
          value={primaryKeyword}
          onChange={e => onChangeKeyword(e.target.value)}
          className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        />
      </TabsContent>
    </Tabs>
  )
}
