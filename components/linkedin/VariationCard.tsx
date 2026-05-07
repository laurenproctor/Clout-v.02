'use client'

import type { LinkedInVariation } from '@/lib/linkedin/types'

interface VariationCardProps {
  variation: LinkedInVariation
  onChange: (v: LinkedInVariation) => void
}

export function VariationCard({ variation: _variation, onChange: _onChange }: VariationCardProps) {
  return <div />
}
