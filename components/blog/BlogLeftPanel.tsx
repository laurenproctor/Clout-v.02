'use client'

import { useState } from 'react'
import type { Lens } from '@/types/domain'
import type { BlogGenerationRequest } from '@/lib/blog/types'
import { BlogStrategyForm } from './BlogStrategyForm'

interface BlogLeftPanelProps {
  lenses: Lens[]
  onGenerate: (request: BlogGenerationRequest) => void
  disabled?: boolean
}

export function BlogLeftPanel({ lenses, onGenerate, disabled }: BlogLeftPanelProps) {
  const [formValues, setFormValues] = useState<Partial<BlogGenerationRequest>>({
    sourceType: 'keyword',
    goalType: 'thought_leadership',
    audienceIdentity: 'founder',
    opinionStrength: 'assertive',
    lensIds: [],
    length: 'standard',
    readingLevel: 'professional',
    brandVoice: 'editorial',
    tone: 'balanced',
    searchIntent: 'informational',
    visualDensity: 'balanced',
    imageStyle: 'editorial',
    secondaryKeywords: [],
    narrativeTemperature: 'analytical', // not shown in UI — here for completeness
    toggles: {
      faqSection: true,
      statistics: true,
      pullQuotes: false,
      tables: false,
      ctaSection: true,
      keyTakeaways: true,
      tldr: false,
      internalLinks: false,
      externalCitations: false,
    },
  })

  function handleGenerate() {
    if (!formValues.primaryKeyword?.trim()) return
    onGenerate(formValues as BlogGenerationRequest)
  }

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-zinc-900 mb-4">Blog Post</h2>
      <BlogStrategyForm
        lenses={lenses}
        values={formValues}
        onChange={setFormValues}
      />
      <button
        type="button"
        onClick={handleGenerate}
        disabled={disabled || !formValues.primaryKeyword?.trim()}
        className="mt-4 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? 'Generating...' : 'Generate'}
      </button>
    </div>
  )
}
