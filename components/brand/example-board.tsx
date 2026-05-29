'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Check, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Legacy static images — fallback when Unsplash API key is not configured
export const BOARD_IMAGES = [
  { id: 'editorial-01', url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&q=80', label: 'Editorial',      tags: ['Editorial', 'Photography', 'Minimalist', 'Minimal'] },
  { id: 'luxury-01',    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', label: 'Luxury',         tags: ['Luxury', 'Photography', 'Premium'] },
  { id: 'minimal-01',   url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', label: 'Minimal',      tags: ['Minimal', 'Minimalist', 'Photography', 'Calm'] },
  { id: 'bold-01',      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80', label: 'Bold Graphic',   tags: ['Bold Graphic', 'Bold', 'Photography', 'Energetic'] },
  { id: 'warm-01',      url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80', label: 'Warm Human',  tags: ['Warm Human', 'Photography', 'Calm'] },
  { id: 'startup-01',   url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80', label: 'Startup Modern', tags: ['Startup Modern', 'Photography', 'Energetic'] },
  { id: 'tech-01',      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80', label: 'Technical',   tags: ['Technical', 'Photography', 'Intellectual'] },
  { id: 'future-01',    url: 'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=400&q=80', label: 'Futuristic',  tags: ['Futuristic', 'Photography', 'Bold'] },
  { id: 'editorial-02', url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80', label: 'Editorial',   tags: ['Editorial', 'Photography', 'Minimalist', 'Minimal'] },
  { id: 'abstract-01',  url: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=400&q=80', label: 'Abstract',      tags: ['Abstract', 'Bold Graphic', 'Futuristic'] },
  { id: 'luxury-02',    url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80', label: 'Luxury',      tags: ['Luxury', 'Photography', 'Premium', 'Serious'] },
  { id: 'warm-02',      url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80', label: 'Warm Human',  tags: ['Warm Human', 'Photography', 'Intellectual'] },
] as const

type BoardImage = typeof BOARD_IMAGES[number]

type DynamicImage = {
  id: string
  url: string
  thumbUrl: string
  label: string
}

function isSuggested(img: BoardImage, visualStyles: string[], imageryTypes: string[], moodTraits: string[]) {
  const signals = new Set([...visualStyles, ...imageryTypes, ...moodTraits].map(s => s.toLowerCase()))
  return img.tags.some(tag => signals.has(tag.toLowerCase()))
}

interface ExampleBoardProps {
  value: string[]
  onChange: (value: string[]) => void
  negativeBoard?: string[]
  onNegativeChange?: (negatives: string[]) => void
  visualStyles?: string[]
  imageryTypes?: string[]
  moodTraits?: string[]
  toneTraits?: string[]
  subjects?: string[]
  generationNotes?: string
  colorScheme?: 'light' | 'dark'
  className?: string
}

export function ExampleBoard({
  value,
  onChange,
  negativeBoard = [],
  onNegativeChange,
  visualStyles = [],
  imageryTypes = [],
  moodTraits = [],
  toneTraits = [],
  subjects = [],
  generationNotes = '',
  colorScheme,
  className,
}: ExampleBoardProps) {
  const [dynamicImages, setDynamicImages] = useState<DynamicImage[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const negativeSet = new Set(negativeBoard)

  const hasSignals = (
    visualStyles.length > 0 || imageryTypes.length > 0 || moodTraits.length > 0 ||
    toneTraits.length > 0 || subjects.length > 0 || generationNotes.trim().length > 0
  )

  const buildParams = useCallback((pageNum: number) => {
    const params = new URLSearchParams()
    visualStyles.forEach(s => params.append('visualStyles', s))
    imageryTypes.forEach(t => params.append('imageryTypes', t))
    moodTraits.forEach(m => params.append('moodTraits', m))
    toneTraits.forEach(t => params.append('toneTraits', t))
    subjects.forEach(s => params.append('subjects', s))
    if (generationNotes.trim()) params.set('generationNotes', generationNotes.trim())
    if (colorScheme) params.set('colorScheme', colorScheme)
    params.set('page', String(pageNum))
    return params
  }, [visualStyles, imageryTypes, moodTraits, toneTraits, subjects, generationNotes, colorScheme]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial / re-fetch when signals change
  useEffect(() => {
    if (!hasSignals) {
      setDynamicImages(null)
      setHasMore(false)
      setPage(1)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setLoading(true)
      setPage(1)
      try {
        const resp = await fetch(`/api/brand/imagery/unsplash-search?${buildParams(1)}`, {
          signal: abortRef.current.signal,
        })
        if (!resp.ok) throw new Error('fetch failed')
        const data = await resp.json()

        if (!data.fallback && data.images.length > 0) {
          setDynamicImages(data.images)
          setHasMore(data.hasMore ?? false)
        } else {
          setDynamicImages(null)
          setHasMore(false)
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setDynamicImages(null)
          setHasMore(false)
        }
      } finally {
        setLoading(false)
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    visualStyles.join(','), imageryTypes.join(','), moodTraits.join(','),
    toneTraits.join(','), subjects.join(','), generationNotes, colorScheme,
  ])

  async function handleLoadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const resp = await fetch(`/api/brand/imagery/unsplash-search?${buildParams(nextPage)}`)
      if (!resp.ok) throw new Error('fetch failed')
      const data = await resp.json()

      if (data.images.length > 0) {
        // Deduplicate by id
        const existingIds = new Set((dynamicImages ?? []).map(img => img.id))
        const fresh = (data.images as DynamicImage[]).filter(img => !existingIds.has(img.id))
        setDynamicImages(prev => [...(prev ?? []), ...fresh])
        setPage(nextPage)
        setHasMore(data.hasMore ?? false)
      } else {
        setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }

  function toggle(identifier: string) {
    if (value.includes(identifier)) {
      onChange(value.filter(v => v !== identifier))
    } else {
      onChange([...value, identifier])
    }
  }

  function markNegative(identifier: string) {
    // Remove from positive selections if present
    if (value.includes(identifier)) {
      onChange(value.filter(v => v !== identifier))
    }
    onNegativeChange?.([...negativeBoard.filter(n => n !== identifier), identifier])
  }

  function clearNegatives() {
    onNegativeChange?.([])
  }

  // Dynamic results mode
  if (dynamicImages !== null || loading) {
    const visibleImages = (dynamicImages ?? []).filter(img => !negativeSet.has(img.url))

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Visual References
          </label>
          <div className="flex items-center gap-2">
            {loading && (
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-zinc-300 border-t-zinc-600" />
                Finding matches…
              </span>
            )}
            {!loading && dynamicImages && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <Sparkles className="h-3 w-3" />
                Curated for you
              </span>
            )}
            {value.length > 0 && (
              <span className="text-xs text-zinc-400">{value.length} selected</span>
            )}
          </div>
        </div>
        <p className="text-xs text-zinc-500 -mt-1">
          Images matched to your style settings. Select any that fit, or dismiss ones you don&apos;t want.
        </p>

        <div className="grid grid-cols-4 gap-2">
          {loading && !dynamicImages
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-zinc-100 animate-pulse" />
              ))
            : visibleImages.map(img => {
                const selected = value.includes(img.url)
                return (
                  <div key={img.id} className="group relative aspect-square">
                    <button
                      type="button"
                      onClick={() => toggle(img.url)}
                      className={cn(
                        'absolute inset-0 overflow-hidden rounded-lg border-2 transition-all',
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
                        <span className="text-[10px] font-medium text-white drop-shadow line-clamp-1">{img.label}</span>
                      </div>
                    </button>
                    {/* Dismiss button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); markNegative(img.url) }}
                      className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                      title="Not this style"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
        </div>

        {/* Load More + exclusion summary */}
        <div className="flex items-center justify-between mt-1">
          <div>
            {negativeBoard.length > 0 && (
              <button
                type="button"
                onClick={clearNegatives}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {negativeBoard.length} excluded · Clear
              </button>
            )}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border border-zinc-300 border-t-zinc-600" />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Fallback: static images sorted by relevance
  const staticImages = hasSignals
    ? [...BOARD_IMAGES].sort((a, b) => {
        const aMatch = isSuggested(a, visualStyles, imageryTypes, moodTraits) ? 0 : 1
        const bMatch = isSuggested(b, visualStyles, imageryTypes, moodTraits) ? 0 : 1
        return aMatch - bMatch
      })
    : [...BOARD_IMAGES]

  const visibleStatic = staticImages.filter(img => !negativeSet.has(img.id))
  const suggestedCount = hasSignals
    ? visibleStatic.filter(img => isSuggested(img, visualStyles, imageryTypes, moodTraits)).length
    : 0

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Visual References
        </label>
        <div className="flex items-center gap-2">
          {hasSignals && suggestedCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Sparkles className="h-3 w-3" />
              {suggestedCount} suggested
            </span>
          )}
          {value.length > 0 && (
            <span className="text-xs text-zinc-400">{value.length} selected</span>
          )}
        </div>
      </div>
      <p className="text-xs text-zinc-500 -mt-1">
        {hasSignals && suggestedCount > 0
          ? 'Top matches sorted first. Select images that fit, or dismiss ones you don\'t want.'
          : 'Select images that match your desired visual direction.'}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {visibleStatic.map(img => {
          const selected = value.includes(img.id)
          const suggested = hasSignals && isSuggested(img, visualStyles, imageryTypes, moodTraits)
          return (
            <div key={img.id} className="group relative aspect-square">
              <button
                type="button"
                onClick={() => toggle(img.id)}
                className={cn(
                  'absolute inset-0 overflow-hidden rounded-lg border-2 transition-all',
                  selected
                    ? 'border-zinc-800'
                    : suggested
                      ? 'border-amber-400/70 hover:border-amber-500'
                      : 'border-transparent hover:border-zinc-300'
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
                {suggested && !selected && (
                  <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className={cn(
                  'absolute bottom-0 inset-x-0 px-1.5 py-1 text-center transition-opacity',
                  selected || suggested ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}>
                  <span className="text-[10px] font-medium text-white drop-shadow">{img.label}</span>
                </div>
              </button>
              {/* Dismiss button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); markNegative(img.id) }}
                className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                title="Not this style"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>

      {negativeBoard.length > 0 && (
        <button
          type="button"
          onClick={clearNegatives}
          className="self-start text-xs text-zinc-400 hover:text-zinc-600 transition-colors mt-1"
        >
          {negativeBoard.length} excluded · Clear
        </button>
      )}
    </div>
  )
}
