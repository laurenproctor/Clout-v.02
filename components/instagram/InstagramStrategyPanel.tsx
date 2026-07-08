'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Lens } from '@/types/domain'
import type { SourceIntent, LinkedInAudience } from '@/lib/linkedin/types'
import type { InstagramGenerationRequest } from '@/lib/instagram/types'
import { CampaignSelect } from '@/components/create/CampaignSelect'
import { VisualStyleSelector } from './VisualStyleSelector'

interface InstagramStrategyPanelProps {
  values: Partial<InstagramGenerationRequest>
  lenses: Lens[]
  onChange: (patch: Partial<InstagramGenerationRequest>) => void
  canGenerate: boolean
  onGenerate: () => void
  readOnly?: boolean
  showGenerateButton?: boolean
  savedAudiences?: string[]
}

const pillBase = 'text-xs rounded-full px-3 py-1.5 transition-colors cursor-pointer'
const sectionLabel = 'text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2'

function Pill({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        pillBase,
        selected
          ? 'bg-zinc-900 text-white border border-zinc-900'
          : 'border border-zinc-200 text-zinc-600 hover:border-zinc-300',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}

export function InstagramStrategyPanel({
  values,
  lenses,
  onChange,
  canGenerate,
  onGenerate,
  readOnly,
  showGenerateButton,
  savedAudiences = [],
}: InstagramStrategyPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (canGenerate && !readOnly) onGenerate()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, readOnly])

  const intents: { value: SourceIntent; label: string }[] = [
    { value: 'build_authority',     label: 'Build Authority' },
    { value: 'drive_discussion',    label: 'Drive Discussion' },
    { value: 'generate_leads',      label: 'Generate Leads' },
    { value: 'recruit',             label: 'Recruit' },
    { value: 'launch',              label: 'Launch' },
    { value: 'signal_expertise',    label: 'Signal Expertise' },
    { value: 'build_affinity',      label: 'Build Affinity' },
    { value: 'increase_visibility', label: 'Increase Visibility' },
  ]

  const audiences: { value: LinkedInAudience; label: string }[] = [
    { value: 'founders',          label: 'Founders' },
    { value: 'enterprise_buyers', label: 'Enterprise Buyers' },
    { value: 'marketers',         label: 'Marketers' },
    { value: 'operators',         label: 'Operators' },
    { value: 'engineers',         label: 'Engineers' },
    { value: 'investors',         label: 'Investors' },
    { value: 'recruiters',        label: 'Recruiters' },
    { value: 'general_audience',  label: 'General Audience' },
    { value: 'custom',            label: 'Custom…' },
  ]

  function toggleLens(lensId: string) {
    if (readOnly) return
    const current = values.lensIds ?? []
    const next = current.includes(lensId)
      ? current.filter((id) => id !== lensId)
      : [...current, lensId]
    onChange({ lensIds: next })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Visual Style */}
        <VisualStyleSelector
          selected={values.visualStyle}
          onChange={(style) => !readOnly && onChange({ visualStyle: style })}
          disabled={readOnly}
        />

        {/* Intent */}
        <div>
          <p className={sectionLabel}>Intent</p>
          <p className="text-xs text-zinc-400 mb-3 -mt-1">Why this content exists</p>
          <div className="grid grid-cols-2 gap-2">
            {intents.map((item) => (
              <Pill
                key={item.value}
                selected={values.intent === item.value}
                onClick={() => !readOnly && onChange({ intent: item.value })}
                disabled={readOnly}
              >
                {item.label}
              </Pill>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div>
          <p className={sectionLabel}>Audience</p>
          <div className="flex flex-wrap gap-2">
            {audiences.filter((item) => item.value !== 'custom').map((item) => (
              <Pill
                key={item.value}
                selected={values.audience === item.value}
                onClick={() => !readOnly && onChange({ audience: item.value, customAudience: undefined })}
                disabled={readOnly}
              >
                {item.label}
              </Pill>
            ))}
            {savedAudiences
              .filter((saved) => !audiences.some((a) => a.label.toLowerCase() === saved.toLowerCase()))
              .map((saved) => (
                <Pill
                  key={saved}
                  selected={values.audience === 'custom' && values.customAudience === saved}
                  onClick={() => !readOnly && onChange({ audience: 'custom', customAudience: saved })}
                  disabled={readOnly}
                >
                  {saved}
                </Pill>
              ))}
            <Pill
              selected={values.audience === 'custom' && !savedAudiences.some(s => s === values.customAudience)}
              onClick={() => !readOnly && onChange({ audience: 'custom', customAudience: '' })}
              disabled={readOnly}
            >
              Custom…
            </Pill>
          </div>
          {values.audience === 'custom' && (
            <input
              type="text"
              value={values.customAudience ?? ''}
              onChange={(e) => !readOnly && onChange({ customAudience: e.target.value })}
              placeholder="e.g. DTC founders scaling past $1M"
              disabled={readOnly}
              className="mt-2 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
            />
          )}
        </div>

        {/* Campaign — optional attribution */}
        <div>
          <p className={sectionLabel}>Campaign</p>
          <CampaignSelect
            value={values.campaignId ?? null}
            onChange={id => !readOnly && onChange({ campaignId: id })}
            disabled={readOnly}
          />
        </div>

        {/* Advanced */}
        {lenses.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              {showAdvanced ? '− Advanced' : '+ Advanced'}
            </button>
            {showAdvanced && (
              <div className="mt-3">
                <p className={sectionLabel}>Lenses</p>
                <div className="flex flex-wrap gap-2">
                  {lenses.map((lens) => (
                    <Pill
                      key={lens.id}
                      selected={(values.lensIds ?? []).includes(lens.id)}
                      onClick={() => toggleLens(lens.id)}
                      disabled={readOnly}
                    >
                      {lens.name}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showGenerateButton !== false && (
        <div className="p-4 border-t border-zinc-100">
          <button
            onClick={onGenerate}
            disabled={!canGenerate || readOnly}
            className="w-full bg-zinc-900 text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>Generate Instagram Post</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px] font-mono text-zinc-400">
              ⌘↵
            </kbd>
          </button>
        </div>
      )}
    </div>
  )
}
