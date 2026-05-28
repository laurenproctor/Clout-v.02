// components/create/CreateCard.tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ContentType } from '@/lib/content/contentTypes'

interface CreateCardProps {
  type: ContentType
  slug: string
  /** 'featured' = full-width active layout; 'grid' = compact coming-soon layout */
  variant: 'featured' | 'grid'
}

export function CreateCard({ type, slug, variant }: CreateCardProps) {
  const Icon = type.icon
  const isActive = type.status === 'active'

  const cardContent = (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isActive
          ? 'border-zinc-200 bg-white hover:ring-1 hover:ring-zinc-300'
          : 'cursor-default border-zinc-100 bg-zinc-50 opacity-60',
        variant === 'featured' ? 'flex items-start gap-4 p-5' : 'flex flex-col p-4',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md',
          isActive ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400',
          variant === 'featured' ? 'h-10 w-10' : 'mb-3 h-8 w-8',
        )}
      >
        <Icon className={variant === 'featured' ? 'h-5 w-5' : 'h-4 w-4'} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium',
            isActive ? 'text-zinc-900' : 'text-zinc-500',
            variant === 'featured' ? 'text-sm mb-1' : 'text-xs mb-1.5',
          )}
        >
          {type.title}
        </p>
        <p
          className={cn(
            'leading-relaxed',
            isActive ? 'text-zinc-500' : 'text-zinc-400',
            variant === 'featured' ? 'text-sm' : 'text-xs',
          )}
        >
          {type.description}
        </p>
      </div>

      {/* CTA or status pill */}
      {isActive && type.ctaLabel ? (
        <div className="shrink-0 self-center">
          <span className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
            {type.ctaLabel}
          </span>
        </div>
      ) : type.statusLabel ? (
        <div className={cn('shrink-0', variant === 'featured' ? 'self-center' : 'mt-3')}>
          <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-400">
            {type.statusLabel}
          </span>
        </div>
      ) : null}
    </div>
  )

  if (isActive && type.route) {
    return <Link href={`/${slug}${type.route}`}>{cardContent}</Link>
  }

  return cardContent
}
