import { useEffect, useRef, useState } from 'react'
import type { OutputContent } from '@/types/domain'

interface AutosaveParams {
  outputId: string
  enabled: boolean
  title: string
  body: string
  hashtags: string[]
  existingContent: OutputContent
}

export function useAutosave({
  outputId,
  enabled,
  title,
  body,
  hashtags,
  existingContent,
}: AutosaveParams) {
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setAutoSaving(true)
      const content: OutputContent = { ...existingContent, body, hashtags }
      const res = await fetch(`/api/outputs/${outputId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      })
      if (res.ok) setLastSaved(new Date())
      setAutoSaving(false)
    }, 2000)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [title, body, hashtags]) // eslint-disable-line react-hooks/exhaustive-deps

  return { autoSaving, lastSaved }
}
