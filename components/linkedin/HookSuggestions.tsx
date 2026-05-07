'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { LinkedInHook } from '@/lib/linkedin/types'

interface HookSuggestionsProps {
  hooks: LinkedInHook[]
}

export function HookSuggestions({ hooks }: HookSuggestionsProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer flex items-center gap-1">
        <span>Hook Alternatives ({hooks.length})</span>
        <span className="text-zinc-400">{open ? '▲' : '▼'}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2">
          {hooks.map((hook, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-t border-zinc-100 first:border-0">
              <span className="bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5 text-xs capitalize shrink-0">
                {hook.type}
              </span>
              <span className="text-sm text-zinc-700 flex-1">{hook.text}</span>
              <button
                onClick={() => navigator.clipboard.writeText(hook.text)}
                className="text-zinc-400 hover:text-zinc-600 shrink-0"
                title="Copy"
              >
                <Copy size={14} />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
