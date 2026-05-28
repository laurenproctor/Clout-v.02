'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { BlogGenerationRequest } from '@/lib/blog/types'

interface AdvancedControlsPanelProps {
  values: Partial<BlogGenerationRequest>
  onChange: (v: Partial<BlogGenerationRequest>) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function AdvancedControlsPanel({ values, onChange, onGenerate, isGenerating }: AdvancedControlsPanelProps) {
  const [showVisualSettings, setShowVisualSettings] = useState(false)

  function set(patch: Partial<BlogGenerationRequest>) {
    onChange({ ...values, ...patch })
  }

  const selectClass = cn(
    'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed'
  )

  const labelClass = 'text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block'

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 mb-1">Refine Your Article</h3>
        <p className="text-xs text-zinc-400">Adjust these settings before generating your article.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Tone */}
        <div>
          <label className={labelClass}>Tone</label>
          <select
            value={values.tone ?? 'balanced'}
            onChange={e => set({ tone: e.target.value as BlogGenerationRequest['tone'] })}
            disabled={isGenerating}
            className={selectClass}
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="contrarian">Contrarian</option>
          </select>
        </div>

        {/* Length */}
        <div>
          <label className={labelClass}>Length</label>
          <select
            value={values.length ?? 'standard'}
            onChange={e => set({ length: e.target.value as BlogGenerationRequest['length'] })}
            disabled={isGenerating}
            className={selectClass}
          >
            <option value="short">Short (~800 words)</option>
            <option value="standard">Standard (~1500 words)</option>
            <option value="long">Long (~2500 words)</option>
            <option value="pillar">Pillar (~4000 words)</option>
          </select>
        </div>

        {/* Reading Level */}
        <div>
          <label className={labelClass}>Reading Level</label>
          <select
            value={values.readingLevel ?? 'professional'}
            onChange={e => set({ readingLevel: e.target.value as BlogGenerationRequest['readingLevel'] })}
            disabled={isGenerating}
            className={selectClass}
          >
            <option value="general">General</option>
            <option value="professional">Professional</option>
            <option value="technical">Technical</option>
            <option value="executive">Executive</option>
          </select>
        </div>

        {/* Search Intent */}
        <div>
          <label className={labelClass}>Search Intent</label>
          <select
            value={values.searchIntent ?? 'informational'}
            onChange={e => set({ searchIntent: e.target.value as BlogGenerationRequest['searchIntent'] })}
            disabled={isGenerating}
            className={selectClass}
          >
            <option value="informational">Informational</option>
            <option value="commercial">Commercial</option>
            <option value="transactional">Transactional</option>
            <option value="navigational">Navigational</option>
          </select>
        </div>
      </div>

      {/* Additional Context */}
      <div>
        <label className={labelClass}>Additional Context</label>
        <textarea
          placeholder="Any extra instructions, constraints, or context for generation..."
          value={values.additionalContext ?? ''}
          onChange={e => set({ additionalContext: e.target.value || undefined })}
          rows={3}
          disabled={isGenerating}
          className={cn(
            'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900',
            'placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300',
            'resize-none disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
      </div>

      {/* Visual Settings Accordion */}
      <div className="border border-zinc-100 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowVisualSettings(!showVisualSettings)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors text-left"
        >
          Image &amp; Visual Settings
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            className={cn('transition-transform', showVisualSettings && 'rotate-180')}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showVisualSettings && (
          <div className="px-4 pb-4 pt-2 space-y-3 border-t border-zinc-100">
            <div>
              <label className={labelClass}>Visual Density</label>
              <select
                value={values.visualDensity ?? 'balanced'}
                onChange={e => set({ visualDensity: e.target.value as BlogGenerationRequest['visualDensity'] })}
                disabled={isGenerating}
                className={selectClass}
              >
                <option value="minimal">Minimal</option>
                <option value="balanced">Balanced</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Image Style</label>
              <select
                value={values.imageStyle ?? 'editorial'}
                onChange={e => set({ imageStyle: e.target.value as BlogGenerationRequest['imageStyle'] })}
                disabled={isGenerating}
                className={selectClass}
              >
                <option value="editorial">Editorial</option>
                <option value="ai_generated">Generated</option>
                <option value="product">Product</option>
                <option value="minimalist">Minimalist</option>
                <option value="technical">Technical</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Generate CTA */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full bg-zinc-900 text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating Article...' : 'Generate Article'}
      </button>
    </div>
  )
}
