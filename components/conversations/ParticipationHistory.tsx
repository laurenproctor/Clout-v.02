'use client'

import { Badge } from '@/components/ui/badge'
import type { ConversationResponse } from '@/types/domain'

interface Props { responses: ConversationResponse[] }

export function ParticipationHistory({ responses }: Props) {
  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center max-w-2xl">
        <p className="text-sm font-medium text-muted-foreground">No responses generated yet</p>
        <p className="text-xs text-muted-foreground mt-1">Generate drafts from opportunities to see them here.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium">Generated Responses</h2>
        <span className="text-xs text-muted-foreground">{responses.length} total</span>
      </div>
      {responses.map(r => (
        <div key={r.id} className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs capitalize">{r.responseType}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{r.content}</p>
          <button
            onClick={() => navigator.clipboard.writeText(r.content)}
            className="text-xs text-muted-foreground hover:text-foreground mt-2 underline"
          >
            Copy
          </button>
        </div>
      ))}
    </div>
  )
}
