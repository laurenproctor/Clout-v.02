'use client'

import { useState } from 'react'
import type { Lens } from '@/types/domain'
import type { BlogGenerationRequest } from '@/lib/blog/types'
import { SourceInputTabs } from './SourceInputTabs'
import { AudienceIdentitySelector } from './AudienceIdentitySelector'
import { OpinionStrengthSelector } from './OpinionStrengthSelector'
import { MultiLensSelector } from './MultiLensSelector'

interface StrategicSetupPanelProps {
  lenses: Lens[]
  onGenerate: (request: BlogGenerationRequest) => void
  disabled?: boolean
}

const GOAL_OPTIONS: Array<{ value: BlogGenerationRequest['goalType']; label: string }> = [
  { value: 'thought_leadership', label: 'Thought Leadership' },
  { value: 'seo', label: 'SEO Article' },
  { value: 'commentary', label: 'Commentary' },
  { value: 'evergreen_guide', label: 'Evergreen Guide' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'product_education', label: 'Product Education' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'news_reaction', label: 'News Reaction' },
]

const DEFAULT_VALUES: Partial<BlogGenerationRequest> = {
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
  narrativeTemperature: 'analytical',
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
}

const labelClass = 'text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block'
const inputClass = 'w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300'

export function StrategicSetupPanel({ lenses, onGenerate, disabled }: StrategicSetupPanelProps) {
  const [values, setValues] = useState<Partial<BlogGenerationRequest>>(DEFAULT_VALUES)

  function set(patch: Partial<BlogGenerationRequest>) {
    setValues(prev => ({ ...prev, ...patch }))
  }

  function handleGenerate() {
    if (!values.primaryKeyword?.trim()) return
    onGenerate(values as BlogGenerationRequest)
  }

  const canGenerate = !!values.primaryKeyword?.trim() && !disabled

  return (
    <div className="flex flex-col items-center justify-start min-h-full py-12 px-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Create a Blog Post</h1>
          <p className="text-sm text-zinc-500">Set your strategic parameters, then we&rsquo;ll generate narrative directions for you to choose from.</p>
        </div>

        <div className="space-y-6">
          {/* Source Input */}
          <div>
            <label className={labelClass}>Source Input</label>
            <SourceInputTabs
              sourceType={values.sourceType ?? 'keyword'}
              sourceContent={values.sourceContent ?? ''}
              primaryKeyword={values.primaryKeyword ?? ''}
              onChangeType={(sourceType) => set({ sourceType })}
              onChangeContent={(sourceContent) => set({ sourceContent })}
              onChangeKeyword={(primaryKeyword) => set({ primaryKeyword })}
            />
          </div>

          {/* Title */}
          <div>
            <label className={labelClass}>
              Title <span className="text-zinc-300 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Leave blank to generate from keyword"
              value={values.title ?? ''}
              onChange={e => set({ title: e.target.value || undefined })}
              className={inputClass}
            />
          </div>

          {/* Content Summary */}
          <div>
            <label className={labelClass}>
              Content Summary <span className="text-zinc-300 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="Describe the article you want to write — key points, angle, or specific content to include"
              value={values.contentSummary ?? ''}
              onChange={e => set({ contentSummary: e.target.value || undefined })}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Goal Type */}
          <div>
            <label className={labelClass}>Goal</label>
            <select
              value={values.goalType ?? 'thought_leadership'}
              onChange={e => set({ goalType: e.target.value as BlogGenerationRequest['goalType'] })}
              className={inputClass}
            >
              {GOAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Audience Identity */}
          <div>
            <label className={labelClass}>Audience</label>
            <AudienceIdentitySelector
              value={values.audienceIdentity ?? 'founder'}
              onChange={(audienceIdentity) => set({ audienceIdentity })}
            />
          </div>

          {/* Opinion Strength */}
          <div>
            <label className={labelClass}>Opinion Strength</label>
            <OpinionStrengthSelector
              value={values.opinionStrength ?? 'assertive'}
              onChange={(opinionStrength) => set({ opinionStrength })}
            />
          </div>

          {/* Lenses */}
          <div>
            <label className={labelClass}>Lenses</label>
            <MultiLensSelector
              lenses={lenses}
              selectedIds={values.lensIds ?? []}
              onChange={(lensIds) => set({ lensIds })}
            />
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full bg-zinc-900 text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disabled ? 'Generating Strategic Directions...' : 'Generate Strategic Directions'}
          </button>
        </div>
      </div>
    </div>
  )
}
