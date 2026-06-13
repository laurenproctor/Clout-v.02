'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import type { ConversationOpportunity, ConversationOpportunityType } from '@/types/domain'
import { NotePublishPanel } from './NotePublishPanel'

const TYPE_LABELS: Record<ConversationOpportunityType, string> = {
  comment: 'Comment', note: 'Note', post: 'Post', framework: 'Framework',
  narrative: 'Story', question: 'Question', counterpoint: 'Counterpoint', agreement: 'Agreement',
  pain_point: 'Pain Point',
}

const TYPE_COLORS: Record<ConversationOpportunityType, string> = {
  comment: 'bg-blue-50 text-blue-700 border-blue-200',
  note: 'bg-purple-50 text-purple-700 border-purple-200',
  post: 'bg-green-50 text-green-700 border-green-200',
  framework: 'bg-orange-50 text-orange-700 border-orange-200',
  narrative: 'bg-pink-50 text-pink-700 border-pink-200',
  question: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  counterpoint: 'bg-red-50 text-red-700 border-red-200',
  agreement: 'bg-teal-50 text-teal-700 border-teal-200',
  pain_point: 'bg-amber-50 text-amber-700 border-amber-200',
}

interface Props {
  opportunity: ConversationOpportunity
  onRemove: (id: string) => void
}

export function OpportunityCard({ opportunity: opp, onRemove }: Props) {
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const item = opp.item
  const source = item?.source

  async function generate() {
    setGenerating(true)
    setPanelOpen(true)
    try {
      const res = await fetch('/api/conversations/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: opp.id, responseType: opp.opportunityType }),
      })
      if (res.ok) setDraft((await res.json()).content)
    } finally {
      setGenerating(false)
    }
  }

  async function dismiss() {
    await fetch(`/api/conversations/opportunities/${opp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    })
    onRemove(opp.id)
  }

  async function save() {
    await fetch(`/api/conversations/opportunities/${opp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'saved' }),
    })
    onRemove(opp.id)
  }

  async function copy() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const overallColor =
    opp.overallScore >= 70 ? 'text-green-600' :
    opp.overallScore >= 45 ? 'text-yellow-600' : 'text-muted-foreground'

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[opp.opportunityType]}`}>
                {TYPE_LABELS[opp.opportunityType]}
              </span>
              {source?.title && (
                <Badge variant="outline" className="text-xs font-normal">{source.title}</Badge>
              )}
            </div>
            <h3 className="text-sm font-medium leading-snug">{opp.title}</h3>
          </div>
          <div className="flex-shrink-0 text-right">
            <span className={`text-base font-bold tabular-nums ${overallColor}`}>{opp.overallScore}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        {item?.title && (
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:underline line-clamp-1 block mb-2">
            {item.title}
          </a>
        )}

        <p className="text-sm text-muted-foreground leading-relaxed">{opp.explanation}</p>

        {opp.whyThisMatters && (
          <p className="text-xs text-muted-foreground/70 italic mt-1.5">{opp.whyThisMatters}</p>
        )}

        <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
          <span title="Relevance">R:{opp.relevanceScore}</span>
          <span title="Timeliness">T:{opp.timelinessScore}</span>
          <span title="Uniqueness">U:{opp.uniquenessScore}</span>
          <span title="Opportunity">O:{opp.opportunityScore}</span>
          <span title="Authority">A:{opp.authorityScore}</span>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button size="sm" onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : `Draft ${TYPE_LABELS[opp.opportunityType]}`}
          </Button>
          <Button size="sm" variant="outline" onClick={save}>Save</Button>
          <Button size="sm" variant="ghost" onClick={dismiss} className="text-muted-foreground">Dismiss</Button>
        </div>
      </div>

      {panelOpen && (
        <div className="border-t bg-muted/30 p-4">
          {generating ? (
            <Skeleton className="h-24 rounded" />
          ) : opp.opportunityType === 'note' && draft ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={generate} disabled={generating}>Regenerate</Button>
              </div>
              <NotePublishPanel draft={draft} onChange={setDraft} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Draft {TYPE_LABELS[opp.opportunityType]}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={generate} disabled={generating}>Regenerate</Button>
                  <Button size="sm" variant="outline" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</Button>
                </div>
              </div>
              <Textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="min-h-[120px] bg-background text-sm resize-y"
                placeholder="Draft will appear here…"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
