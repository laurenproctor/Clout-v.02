'use client'

import Image from 'next/image'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const BOARD_IMAGES = [
  { id: 'editorial-01', url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&q=80', label: 'Editorial' },
  { id: 'luxury-01',    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', label: 'Luxury' },
  { id: 'minimal-01',  url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', label: 'Minimal' },
  { id: 'bold-01',     url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80', label: 'Bold Graphic' },
  { id: 'warm-01',     url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80', label: 'Warm Human' },
  { id: 'startup-01',  url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80', label: 'Startup Modern' },
  { id: 'tech-01',     url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80', label: 'Technical' },
  { id: 'future-01',   url: 'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=400&q=80', label: 'Futuristic' },
  { id: 'editorial-02', url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80', label: 'Editorial' },
  { id: 'abstract-01', url: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=400&q=80', label: 'Abstract' },
  { id: 'luxury-02',   url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80', label: 'Luxury' },
  { id: 'warm-02',     url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80', label: 'Warm Human' },
] as const

interface ExampleBoardProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

export function ExampleBoard({ value, onChange, className }: ExampleBoardProps) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Visual References
        </label>
        {value.length > 0 && (
          <span className="text-xs text-zinc-400">{value.length} selected</span>
        )}
      </div>
      <p className="text-xs text-zinc-500 -mt-1">Select images that match your desired visual direction.</p>
      <div className="grid grid-cols-4 gap-2">
        {BOARD_IMAGES.map(img => {
          const selected = value.includes(img.id)
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => toggle(img.id)}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
                selected ? 'border-zinc-800' : 'border-transparent hover:border-zinc-300'
              )}
            >
              <Image
                src={img.url}
                alt={img.label}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                unoptimized
              />
              <div className={cn(
                'absolute inset-0 transition-opacity',
                selected ? 'bg-zinc-900/40 opacity-100' : 'bg-zinc-900/0 group-hover:bg-zinc-900/20 opacity-100'
              )} />
              {selected && (
                <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
                  <Check className="h-3 w-3 text-zinc-900" />
                </div>
              )}
              <div className={cn(
                'absolute bottom-0 inset-x-0 px-1.5 py-1 text-center transition-opacity',
                selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}>
                <span className="text-[10px] font-medium text-white drop-shadow">{img.label}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
