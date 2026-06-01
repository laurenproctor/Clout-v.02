'use client'

import { useRef, useEffect, useState } from 'react'

interface PostEditorProps {
  body: string
  onChange: (body: string) => void
}

const TRANSFORMS = ["Shorten", "Expand", "Stronger Hook", "Executive Tone", "More Concise", "Add Tension", "Rewrite"]

export function PostEditor({ body, onChange }: PostEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [transforming, setTransforming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [body])

  async function handleTransform(label: string) {
    if (transforming) return
    setTransforming(label)
    setError(null)
    try {
      const res = await fetch('/api/linkedin/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, transform: label }),
      })
      if (!res.ok) throw new Error('Transform failed')
      const data = await res.json() as { body: string }
      onChange(data.body)
    } catch {
      setError(`${label} failed — try again`)
      setTimeout(() => setError(null), 3000)
    } finally {
      setTransforming(null)
    }
  }

  return (
    <div>
      <textarea
        ref={ref}
        value={body}
        onChange={e => onChange(e.target.value)}
        className="w-full min-h-[140px] text-sm leading-relaxed text-zinc-900 resize-none border-0 outline-none focus:ring-0 p-0 bg-transparent"
      />
      {error && (
        <p className="text-[10px] text-red-500 mt-1">{error}</p>
      )}
      <div className="flex gap-1 mt-2 border-t border-zinc-100 pt-2 overflow-x-auto">
        {TRANSFORMS.map(label => (
          <button
            key={label}
            type="button"
            onClick={() => handleTransform(label)}
            disabled={!!transforming}
            className={[
              "shrink-0 text-xs px-2 py-1 rounded transition-colors",
              transforming === label
                ? "text-zinc-500 bg-zinc-100 cursor-wait"
                : transforming
                  ? "text-zinc-300 cursor-not-allowed"
                  : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer",
            ].join(' ')}
          >
            {transforming === label ? '…' : label}
          </button>
        ))}
      </div>
    </div>
  )
}
