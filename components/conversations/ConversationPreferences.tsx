'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import type { ConversationPreferences } from '@/types/domain'

interface Props {
  onPreferencesChange?: () => void
}

function TagInput({
  tags,
  onChange,
  placeholder,
  maxLength,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder: string
  maxLength: number
}) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(value: string) {
    const trimmed = value.trim().replace(/,+$/, '').trim()
    if (!trimmed || tags.includes(trimmed)) {
      setInputValue('')
      return
    }
    onChange([...tags, trimmed])
    setInputValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function handleBlur() {
    if (inputValue.trim()) addTag(inputValue)
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 min-h-[38px] border rounded-md bg-background cursor-text focus-within:ring-1 focus-within:ring-ring"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(tags.filter(t => t !== tag)) }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={e => setInputValue(e.target.value.slice(0, maxLength))}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-xs bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

export function ConversationPreferences({ onPreferencesChange }: Props) {
  const [open, setOpen] = useState(true)
  const [focusTopics, setFocusTopics] = useState<string[]>([])
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>([])
  const [minScore, setMinScore] = useState(40)
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevInstantRef = useRef<{ blocked: string[]; score: number } | null>(null)

  useEffect(() => {
    fetch('/api/conversations/preferences')
      .then(r => r.ok ? r.json() : null)
      .then((data: ConversationPreferences | null) => {
        if (data) {
          setFocusTopics(data.focusTopics)
          setBlockedKeywords(data.blockedKeywords)
          setMinScore(data.minOpportunityScore)
          prevInstantRef.current = { blocked: data.blockedKeywords, score: data.minOpportunityScore }
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const save = useCallback(async (
    topics: string[],
    keywords: string[],
    score: number,
    triggerRefetch: boolean
  ) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/conversations/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusTopics: topics, blockedKeywords: keywords, minOpportunityScore: score }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        if (triggerRefetch) onPreferencesChange?.()
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('idle')
      }
    } catch {
      setSaveStatus('idle')
    }
  }, [onPreferencesChange])

  function scheduleSave(
    topics: string[],
    keywords: string[],
    score: number,
    isInstantField: boolean
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const prev = prevInstantRef.current
      const instantChanged = isInstantField && prev !== null && (
        JSON.stringify(keywords) !== JSON.stringify(prev.blocked) ||
        score !== prev.score
      )
      prevInstantRef.current = { blocked: keywords, score }
      save(topics, keywords, score, instantChanged)
    }, 600)
  }

  function handleFocusTopicsChange(topics: string[]) {
    setFocusTopics(topics)
    if (loaded) scheduleSave(topics, blockedKeywords, minScore, false)
  }

  function handleBlockedKeywordsChange(keywords: string[]) {
    setBlockedKeywords(keywords)
    if (loaded) scheduleSave(focusTopics, keywords, minScore, true)
  }

  function handleMinScoreChange(value: number[]) {
    const score = value[0]
    setMinScore(score)
    if (loaded) scheduleSave(focusTopics, blockedKeywords, score, true)
  }

  if (!loaded) return null

  return (
    <div className="border rounded-lg mb-4 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span>Preferences</span>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-xs text-muted-foreground">Saving…</span>}
          {saveStatus === 'saved' && <span className="text-xs text-green-600">Saved</span>}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-5 border-t">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Focus Topics</label>
            <TagInput
              tags={focusTopics}
              onChange={handleFocusTopicsChange}
              placeholder="e.g. AI in healthcare, SaaS pricing…"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Boost relevance for opportunities touching these topics.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Changes apply on the next ingest run, not immediately.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Blocked Keywords</label>
            <TagInput
              tags={blockedKeywords}
              onChange={handleBlockedKeywordsChange}
              placeholder="e.g. competitor name, off-topic subject…"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Hide opportunities containing these words. Applied instantly.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Minimum Score</label>
              <span className="text-xs font-medium tabular-nums">{minScore}</span>
            </div>
            <Slider
              value={[minScore]}
              min={0}
              max={100}
              step={5}
              onValueChange={handleMinScoreChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Hide opportunities scoring below this threshold. Applied instantly.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
