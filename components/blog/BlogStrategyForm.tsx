'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { Lens } from '@/types/domain'
import type { BlogGenerationRequest } from '@/lib/blog/types'
import { SourceInputTabs } from './SourceInputTabs'
import { OpinionStrengthSelector } from './OpinionStrengthSelector'
import { AudienceIdentitySelector } from './AudienceIdentitySelector'
import { MultiLensSelector } from './MultiLensSelector'

interface BlogStrategyFormProps {
  lenses: Lens[]
  values: Partial<BlogGenerationRequest>
  onChange: (values: Partial<BlogGenerationRequest>) => void
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

export function BlogStrategyForm({ lenses, values, onChange }: BlogStrategyFormProps) {
  const set = (patch: Partial<BlogGenerationRequest>) => onChange({ ...values, ...patch })

  return (
    <div className="space-y-4">
      {/* Source */}
      <SourceInputTabs
        sourceType={values.sourceType ?? 'keyword'}
        sourceContent={values.sourceContent ?? ''}
        primaryKeyword={values.primaryKeyword ?? ''}
        onChangeType={(sourceType) => set({ sourceType })}
        onChangeContent={(sourceContent) => set({ sourceContent })}
        onChangeKeyword={(primaryKeyword) => set({ primaryKeyword })}
      />

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Title <span className="text-zinc-300 font-normal">(optional)</span></label>
        <input
          type="text"
          placeholder="Leave blank to generate from keyword"
          value={values.title ?? ''}
          onChange={e => set({ title: e.target.value || undefined })}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        />
      </div>

      {/* Goal Type */}
      <div>
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Goal</label>
        <select
          value={values.goalType ?? 'thought_leadership'}
          onChange={e => set({ goalType: e.target.value as BlogGenerationRequest['goalType'] })}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        >
          {GOAL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Audience Identity */}
      <div>
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Audience</label>
        <AudienceIdentitySelector
          value={values.audienceIdentity ?? 'founder'}
          onChange={(audienceIdentity) => set({ audienceIdentity })}
        />
      </div>

      {/* Opinion Strength */}
      <div>
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Opinion Strength</label>
        <OpinionStrengthSelector
          value={values.opinionStrength ?? 'assertive'}
          onChange={(opinionStrength) => set({ opinionStrength })}
        />
      </div>

      {/* Lenses */}
      <div>
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Lenses</label>
        <MultiLensSelector
          lenses={lenses}
          selectedIds={values.lensIds ?? []}
          onChange={(lensIds) => set({ lensIds })}
        />
      </div>

      {/* Advanced */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced" className="border-zinc-100">
          <AccordionTrigger className="text-xs font-medium text-zinc-400 py-2 hover:text-zinc-600 hover:no-underline">
            Advanced Strategy
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {/* Tone */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Tone</label>
                <select
                  value={values.tone ?? 'balanced'}
                  onChange={e => set({ tone: e.target.value as BlogGenerationRequest['tone'] })}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none"
                >
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="contrarian">Contrarian</option>
                </select>
              </div>

              {/* Length */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Length</label>
                <select
                  value={values.length ?? 'standard'}
                  onChange={e => set({ length: e.target.value as BlogGenerationRequest['length'] })}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none"
                >
                  <option value="short">Short (~800 words)</option>
                  <option value="standard">Standard (~1500 words)</option>
                  <option value="long">Long (~2500 words)</option>
                  <option value="pillar">Pillar (~4000 words)</option>
                </select>
              </div>

              {/* Search Intent */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Search Intent</label>
                <select
                  value={values.searchIntent ?? 'informational'}
                  onChange={e => set({ searchIntent: e.target.value as BlogGenerationRequest['searchIntent'] })}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none"
                >
                  <option value="informational">Informational</option>
                  <option value="commercial">Commercial</option>
                  <option value="transactional">Transactional</option>
                  <option value="navigational">Navigational</option>
                </select>
              </div>

              {/* Reading Level */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Reading Level</label>
                <select
                  value={values.readingLevel ?? 'professional'}
                  onChange={e => set({ readingLevel: e.target.value as BlogGenerationRequest['readingLevel'] })}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none"
                >
                  <option value="general">General</option>
                  <option value="professional">Professional</option>
                  <option value="technical">Technical</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              {/* Additional Context */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Additional Context</label>
                <textarea
                  placeholder="Any extra instructions, constraints, or context for the AI..."
                  value={values.additionalContext ?? ''}
                  onChange={e => set({ additionalContext: e.target.value || undefined })}
                  rows={3}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none resize-none"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
