'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface VoiceRecorderProps {
  workspaceId: string
  onRecorded: (audioPath: string, durationSec: number) => void
  onError: (error: string) => void
}

type RecordState = 'idle' | 'recording' | 'uploading'

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VoiceRecorder({ workspaceId, onRecorded, onError }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await uploadAudio(blob)
      }

      recorder.start()
      mediaRef.current = recorder
      setState('recording')
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1)
      }, 1000)
    } catch {
      onError('Could not access microphone. Please check permissions.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRef.current?.stop()
    setState('uploading')
  }

  async function uploadAudio(blob: Blob) {
    const supabase = createClient()
    const filename = `${workspaceId}/${Date.now()}.webm`

    const { data, error } = await supabase.storage
      .from('voice-captures')
      .upload(filename, blob, { contentType: 'audio/webm' })

    if (error || !data) {
      setState('idle')
      onError('Upload failed. Please try again.')
      return
    }

    setState('idle')
    onRecorded(data.path, elapsed)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] rounded-lg border border-zinc-200 bg-white gap-4">
      {state === 'uploading' ? (
        <>
          <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
          <p className="text-sm text-zinc-500">Uploading recording...</p>
        </>
      ) : state === 'recording' ? (
        <>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-zinc-900 tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md"
          >
            <Square className="h-5 w-5 fill-white" />
          </button>
          <p className="text-xs text-zinc-400">Tap to stop</p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={startRecording}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 transition-colors shadow-md"
          >
            <Mic className="h-6 w-6" />
          </button>
          <p className="text-sm text-zinc-500">Tap to record your thought</p>
        </>
      )}
    </div>
  )
}
