'use client'

interface GenerationProgressProps {
  label: string
}

export function GenerationProgress({ label }: GenerationProgressProps) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="inline-block h-2 w-2 rounded-full bg-zinc-400 animate-pulse shrink-0" />
        <span className="text-sm text-zinc-600">{label}</span>
      </div>
    </div>
  )
}
