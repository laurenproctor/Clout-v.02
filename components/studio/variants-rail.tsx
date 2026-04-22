'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Variant {
  id: string
  label: string
  isCurrent: boolean
}

interface Props {
  variants: Variant[]
}

export function VariantsRail({ variants }: Props) {
  const router = useRouter()
  if (variants.length <= 1) return null

  return (
    <div className="flex flex-col items-center gap-2 w-10 flex-shrink-0 bg-zinc-950 border-r border-zinc-800/50 py-4">
      {variants.map((v) => (
        <button
          key={v.id}
          onClick={() => { if (!v.isCurrent) router.push(`/studio/${v.id}`) }}
          title={v.label}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center font-semibold transition-colors text-[11px]',
            v.isCurrent
              ? 'bg-zinc-700 text-zinc-100'
              : 'bg-zinc-900 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300'
          )}
        >
          {v.label.slice(0, 1).toUpperCase()}
        </button>
      ))}
    </div>
  )
}
