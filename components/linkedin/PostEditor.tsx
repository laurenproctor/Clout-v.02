'use client'

import { useRef, useEffect } from 'react'

interface PostEditorProps {
  body: string
  onChange: (body: string) => void
}

const TRANSFORMS = ["Shorten", "Expand", "Stronger Hook", "Executive Tone", "More Concise", "Add Tension", "Rewrite"]

export function PostEditor({ body, onChange }: PostEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [body])

  return (
    <div>
      <textarea
        ref={ref}
        value={body}
        onChange={e => onChange(e.target.value)}
        className="w-full min-h-[140px] text-sm leading-relaxed text-zinc-900 resize-none border-0 outline-none focus:ring-0 p-0 bg-transparent"
      />
      <div className="flex gap-1 mt-2 border-t border-zinc-100 pt-2 overflow-x-auto">
        {TRANSFORMS.map(label => (
          <button
            key={label}
            disabled
            className="shrink-0 text-xs text-zinc-400 px-2 py-1 rounded opacity-40 cursor-not-allowed"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
