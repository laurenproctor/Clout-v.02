'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VisualObjective, AspectRatio } from '@/lib/visual/types/visual'

export type Quality = 'standard' | 'hd'

const OBJECTIVE_LABELS: { value: VisualObjective; label: string }[] = [
  { value: 'authority',           label: 'Establish Authority' },
  { value: 'education',           label: 'Educate' },
  { value: 'conversation',        label: 'Drive Conversation' },
  { value: 'engagement',          label: 'Increase Shares' },
  { value: 'emotional_resonance', label: 'Emotional Reaction' },
  { value: 'lead_generation',     label: 'Generate Leads' },
]

const AUDIENCE_SUGGESTIONS = [
  'Executives', 'Engineers', 'Investors', 'Consumers',
  'Operators', 'Developers', 'Journalists', 'Creators', 'General Public',
]

export interface VisualControlsValue {
  visualObjective: VisualObjective | null
  audienceFrame: string
  emotionalTone: string
  keyIdea: string
  aspectRatio: AspectRatio
  quality: Quality
  promptOverride: string
}

interface VisualControlsProps {
  value: VisualControlsValue
  onChange: (next: VisualControlsValue) => void
  disabled?: boolean
}

export function VisualControls({ value, onChange, disabled }: VisualControlsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showAudienceSuggestions, setShowAudienceSuggestions] = useState(false)

  function set<K extends keyof VisualControlsValue>(key: K, val: VisualControlsValue[K]) {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Visual Objective */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">
          Visual Objective
        </p>
        <div className="flex flex-wrap gap-1.5">
          {OBJECTIVE_LABELS.map(({ value: v, label }) => (
            <button
              key={v}
              disabled={disabled}
              onClick={() => set('visualObjective', value.visualObjective === v ? null : v)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors',
                value.visualObjective === v
                  ? 'bg-zinc-200 text-zinc-900 border-zinc-200'
                  : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300',
                disabled && 'opacity-40 cursor-not-allowed',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Audience Frame */}
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">
          Audience Frame <span className="font-normal normal-case tracking-normal text-zinc-700">optional</span>
        </p>
        <input
          type="text"
          placeholder="e.g. Executives, Engineers, Investors"
          value={value.audienceFrame}
          disabled={disabled}
          onFocus={() => setShowAudienceSuggestions(true)}
          onBlur={() => setTimeout(() => setShowAudienceSuggestions(false), 150)}
          onChange={e => set('audienceFrame', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 disabled:opacity-40"
        />
        {showAudienceSuggestions && !value.audienceFrame && (
          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden shadow-xl">
            {AUDIENCE_SUGGESTIONS.map(s => (
              <button
                key={s}
                onMouseDown={() => set('audienceFrame', s)}
                className="block w-full text-left px-3 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Emotional Tone */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">
          Emotional Tone <span className="font-normal normal-case tracking-normal text-zinc-700">optional</span>
        </p>
        <input
          type="text"
          placeholder="e.g. contemplative, urgent, hopeful"
          value={value.emotionalTone}
          disabled={disabled}
          onChange={e => set('emotionalTone', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 disabled:opacity-40"
        />
      </div>

      {/* Key Idea */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">
          Key Idea <span className="font-normal normal-case tracking-normal text-zinc-700">optional</span>
        </p>
        <input
          type="text"
          placeholder="e.g. the tension between speed and depth"
          value={value.keyIdea}
          disabled={disabled}
          onChange={e => set('keyIdea', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 disabled:opacity-40"
        />
      </div>

      {/* Visual Settings accordion */}
      <div className="border border-zinc-800 rounded-md overflow-hidden">
        <button
          onClick={() => setSettingsOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        >
          <span className="text-[11px] font-medium text-zinc-500">Visual Settings</span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-zinc-700 transition-transform', settingsOpen && 'rotate-180')} />
        </button>

        {settingsOpen && (
          <div className="border-t border-zinc-800 px-3 pb-3 pt-2.5 flex flex-col gap-3">
            {/* Aspect Ratio */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">Aspect Ratio</p>
              <div className="flex rounded-md border border-zinc-800 overflow-hidden">
                {(['square', 'landscape', 'portrait'] as AspectRatio[]).map(r => (
                  <button
                    key={r}
                    disabled={disabled}
                    onClick={() => set('aspectRatio', r)}
                    className={cn(
                      'flex-1 py-1.5 text-[11px] capitalize border-r border-zinc-800 last:border-r-0 transition-colors',
                      value.aspectRatio === r ? 'bg-zinc-700 text-zinc-100 font-semibold' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300',
                      disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">Quality</p>
              <div className="flex rounded-md border border-zinc-800 overflow-hidden">
                {(['standard', 'hd'] as Quality[]).map(q => (
                  <button
                    key={q}
                    disabled={disabled}
                    onClick={() => set('quality', q)}
                    className={cn(
                      'flex-1 py-1.5 text-[11px] uppercase tracking-wide border-r border-zinc-800 last:border-r-0 transition-colors',
                      value.quality === q ? 'bg-zinc-700 text-zinc-100 font-semibold' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300',
                      disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt override */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">
                Prompt Override <span className="font-normal normal-case tracking-normal text-zinc-700">advanced</span>
              </p>
              <textarea
                rows={3}
                placeholder="Write a full prompt to bypass brand-aware generation entirely."
                value={value.promptOverride}
                disabled={disabled}
                onChange={e => set('promptOverride', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-[11px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 resize-none disabled:opacity-40 leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
