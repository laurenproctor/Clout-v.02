import { useCallback, useState } from 'react'
import type { AiActionId } from '@/app/api/ai-actions/route'

export interface SuggestionBlock {
  id: string
  action: AiActionId
  label: string
  field: 'title' | 'body'
  suggestion: string
}

export interface MajorResult {
  label: string
  content: string
}

export function useAiActions(outputId: string) {
  const [running, setRunning] = useState<AiActionId | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionBlock[]>([])
  const [majorResult, setMajorResult] = useState<MajorResult | null>(null)

  const runAction = useCallback(async (
    action: AiActionId,
    currentTitle: string,
    currentBody: string,
  ) => {
    if (running) return
    setRunning(action)
    setMajorResult(null)

    try {
      const res = await fetch('/api/ai-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputId, action, currentBody, currentTitle }),
      })
      if (!res.ok) return
      const data = await res.json()

      if (data.type === 'major') {
        setMajorResult({ label: data.label, content: data.suggestion })
      } else {
        const block: SuggestionBlock = {
          id: crypto.randomUUID(),
          action,
          label: data.label,
          field: data.field ?? 'body',
          suggestion: data.suggestion,
        }
        setSuggestions((prev) => [...prev.filter((s) => s.action !== action), block])
      }
    } finally {
      setRunning(null)
    }
  }, [outputId, running])

  function dismissSuggestion(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  function clearMajorResult() {
    setMajorResult(null)
  }

  return { running, suggestions, majorResult, runAction, dismissSuggestion, clearMajorResult }
}
