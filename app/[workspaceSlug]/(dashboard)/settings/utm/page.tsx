'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import {
  DISTRIBUTION_PLATFORMS,
  PLATFORM_KEYS,
  getPlatformDefault,
  normalizeUTMValue,
  DEFAULT_UTM_TEMPLATES,
  UTMTemplateSettings,
  UTMTemplateCampaignToken,
  UTMTemplateContentToken,
  UTMTemplateTermToken,
  UTMDateFormat,
  UTM_DATE_FORMATS,
  DEFAULT_UTM_DATE_FORMAT,
} from '@/lib/distribution/platform-registry'

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'
type PlatformUTM = { source: string; medium: string; mediumToken: 'campaign_name' | null }
type PlatformSettings = Record<string, PlatformUTM>

const UTM_VALUE_PATTERN = /^[a-z0-9_-]+$/

function buildDefaultPlatformSettings(): PlatformSettings {
  const s: PlatformSettings = {}
  for (const key of PLATFORM_KEYS) {
    const d = getPlatformDefault(key)
    s[key] = { source: d.source, medium: d.medium, mediumToken: null }
  }
  return s
}

function getValidationError(value: string): string | null {
  if (!value) return 'Required'
  if (!UTM_VALUE_PATTERN.test(value)) return 'Lowercase letters, numbers, hyphens, underscores only'
  return null
}

function getFallbackError(token: string, fallback: string): string | null {
  if (token === 'auto' || token === 'none' || token === 'date') return null
  if (!fallback) return 'Required'
  if (!UTM_VALUE_PATTERN.test(fallback)) return 'Lowercase letters, numbers, hyphens, underscores only'
  return null
}

const MEDIUM_TOKEN_LABELS: Record<string, string> = {
  '':            'Custom value',
  campaign_name: '{campaign_name}',
}

const CAMPAIGN_TOKEN_LABELS: Record<UTMTemplateCampaignToken, string> = {
  auto:          'Auto-ID (current)',
  campaign_name: 'Campaign name',
  date:          'Date',
  custom:        'Custom value',
}

const CONTENT_TOKEN_LABELS: Record<UTMTemplateContentToken, string> = {
  auto:   'Auto-ID (current)',
  cta:    'CTA text',
  date:   'Date',
  custom: 'Custom value',
}

const TERM_TOKEN_LABELS: Record<UTMTemplateTermToken, string> = {
  none:   'None (omit)',
  lens:   'Lens',
  voice:  'Voice',
  date:   'Date',
  custom: 'Custom value',
}

const DATE_FORMAT_LABELS: Record<UTMDateFormat, string> = {
  'yyyy-mm-dd': 'YYYY-MM-DD  (2026-06-07)',
  'yyyy-mm':    'YYYY-MM  (2026-06)',
  'yyyymmdd':   'YYYYMMDD  (20260607)',
  'yyyy':       'YYYY  (2026)',
  'mmm-yyyy':   'MMM-YYYY  (jun-2026)',
}

function formatPreviewDate(format: UTMDateFormat): string {
  const now   = new Date()
  const yyyy  = now.getFullYear().toString()
  const mm    = String(now.getMonth() + 1).padStart(2, '0')
  const dd    = String(now.getDate()).padStart(2, '0')
  const mmm   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][now.getMonth()]
  switch (format) {
    case 'yyyy-mm-dd': return `${yyyy}-${mm}-${dd}`
    case 'yyyy-mm':    return `${yyyy}-${mm}`
    case 'yyyymmdd':   return `${yyyy}${mm}${dd}`
    case 'yyyy':       return yyyy
    case 'mmm-yyyy':   return `${mmm}-${yyyy}`
  }
}

export default function UTMSettingsPage() {
  const [platforms, setPlatforms]   = useState<PlatformSettings>(buildDefaultPlatformSettings())
  const [templates, setTemplates]   = useState<UTMTemplateSettings>(DEFAULT_UTM_TEMPLATES)
  const [loading, setLoading]       = useState(true)
  const [status, setStatus]         = useState<SaveStatus>('idle')
  const [saveError, setSaveError]   = useState<string | null>(null)

  const loaded = useRef(false)
  const isServerUpdate = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveData = useRef({ platforms, templates })
  useEffect(() => { saveData.current = { platforms, templates } })

  useEffect(() => {
    fetch('/api/workspace/utm')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          const { _templates, ...platformData } = d as Record<string, unknown> & { _templates?: UTMTemplateSettings }
          const ps: PlatformSettings = {}
          for (const key of PLATFORM_KEYS) {
            const entry = platformData[key] as { source: string; medium: string; mediumToken?: 'campaign_name' | null } | undefined
            if (entry) {
              ps[key] = { source: entry.source, medium: entry.medium, mediumToken: entry.mediumToken ?? null }
            } else {
              const def = getPlatformDefault(key)
              ps[key] = { source: def.source, medium: def.medium, mediumToken: null }
            }
          }
          isServerUpdate.current = true
          setPlatforms(ps)
          if (_templates) setTemplates(_templates)
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        loaded.current = true
      })
  }, [])

  const hasValidationErrors =
    PLATFORM_KEYS.some((key) =>
      getValidationError(platforms[key]?.source ?? '') ||
      getValidationError(platforms[key]?.medium ?? '')
    ) ||
    getFallbackError(templates.campaign.token, templates.campaign.fallback) !== null ||
    getFallbackError(templates.content.token,  templates.content.fallback)  !== null ||
    getFallbackError(templates.term.token,     templates.term.fallback)     !== null

  const handleSave = useCallback(async () => {
    const { platforms: p, templates: t } = saveData.current
    const hasErrors =
      PLATFORM_KEYS.some((key) =>
        getValidationError(p[key]?.source ?? '') ||
        getValidationError(p[key]?.medium ?? '')
      ) ||
      getFallbackError(t.campaign.token, t.campaign.fallback) !== null ||
      getFallbackError(t.content.token,  t.content.fallback)  !== null ||
      getFallbackError(t.term.token,     t.term.fallback)     !== null

    if (hasErrors) return

    setStatus('saving')
    setSaveError(null)
    try {
      const res = await fetch('/api/workspace/utm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, _templates: t }),
      })
      if (res.ok) {
        const normalized = await res.json() as Record<string, unknown> & { _templates?: UTMTemplateSettings }
        const { _templates: normTemplates, ...normPlatforms } = normalized
        const ps: PlatformSettings = {}
        for (const key of PLATFORM_KEYS) {
          const entry = normPlatforms[key] as { source: string; medium: string; mediumToken?: 'campaign_name' | null } | undefined
          if (entry) ps[key] = { source: entry.source, medium: entry.medium, mediumToken: entry.mediumToken ?? null }
        }
        isServerUpdate.current = true
        setPlatforms(ps)
        if (normTemplates) setTemplates(normTemplates)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setSaveError('Save failed')
        setStatus('error')
      }
    } catch {
      setSaveError('Save failed')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (isServerUpdate.current) {
      isServerUpdate.current = false
      return
    }
    if (!loaded.current) return
    setStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(handleSave, 1500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [platforms, templates, handleSave])

  function updatePlatformField(platform: string, field: 'source' | 'medium', value: string) {
    setPlatforms((prev) => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }))
  }

  function updateMediumToken(platform: string, token: 'campaign_name' | null) {
    setPlatforms((prev) => ({ ...prev, [platform]: { ...prev[platform], mediumToken: token } }))
  }

  function normalizePlatformField(platform: string, field: 'source' | 'medium') {
    setPlatforms((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: normalizeUTMValue(prev[platform][field]) },
    }))
  }

  function resetRow(key: string) {
    const d = getPlatformDefault(key)
    setPlatforms((prev) => ({ ...prev, [key]: { source: d.source, medium: d.medium, mediumToken: null } }))
  }

  function resetAll() {
    setPlatforms(buildDefaultPlatformSettings())
    setTemplates(DEFAULT_UTM_TEMPLATES)
  }

  function isRowCustomized(key: string) {
    const d = getPlatformDefault(key)
    return (
      platforms[key]?.source !== d.source ||
      platforms[key]?.medium !== d.medium ||
      platforms[key]?.mediumToken !== null
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" label="Loading attribution settings" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-zinc-100 -mx-4 px-4 sm:-mx-5 sm:px-5 md:-mx-6 md:px-6 mb-6">
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Attribution</h1>
            <p className="text-xs text-zinc-400">UTM tags applied to links in published posts.</p>
          </div>
          <div className="flex items-center gap-3">
            {(status === 'unsaved' || status === 'error') && (
              <span className={cn('flex items-center gap-1.5 text-xs', {
                'text-amber-500': status === 'unsaved' && !hasValidationErrors,
                'text-red-500': status === 'error' || (status === 'unsaved' && hasValidationErrors),
              })}>
                {status === 'unsaved' && !hasValidationErrors && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />}
                {status === 'unsaved'
                  ? (hasValidationErrors ? 'Fix validation errors to save' : 'Unsaved changes')
                  : (saveError ?? 'Save failed')}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={status === 'saving' || status === 'saved' || hasValidationErrors}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white transition-all',
                status === 'saved'
                  ? 'bg-emerald-600 cursor-default'
                  : status === 'saving' || hasValidationErrors
                    ? 'bg-zinc-900 opacity-50 cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-700'
              )}
            >
              {status === 'saved' && <Check className="h-3 w-3" />}
              {status === 'saving' && <Spinner size="xs" />}
              {status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <p className="mb-1 text-sm text-zinc-500">
            Configure how links in published posts are tagged so your analytics platform can attribute
            traffic by source, medium, and content.
          </p>
        </div>

        {/* ── Card 1: Per-channel sources ───────────────────────────────────────── */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">Per-channel sources</h2>
          <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-4 px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Channel</p>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">utm_source</p>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">utm_medium</p>
              <span />
            </div>

            {PLATFORM_KEYS.map((key, i) => {
              const platform   = DISTRIBUTION_PLATFORMS[key]
              const val        = platforms[key] ?? { source: '', medium: '', mediumToken: null }
              const sourceErr  = getValidationError(val.source)
              const mediumErr  = getValidationError(val.medium)
              const customized = isRowCustomized(key)
              const usingToken = val.mediumToken !== null

              return (
                <div
                  key={key}
                  className={cn(
                    'grid grid-cols-[1fr_1fr_1.5fr_auto] gap-4 px-4 py-3',
                    i < PLATFORM_KEYS.length - 1 && 'border-b border-zinc-100'
                  )}
                >
                  <div className="flex items-start pt-2">
                    <span className="text-sm text-zinc-800 font-medium">{platform.label}</span>
                    {customized && (
                      <span className="ml-2 mt-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        custom
                      </span>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={val.source}
                      placeholder={getPlatformDefault(key).source}
                      onChange={(e) => updatePlatformField(key, 'source', e.target.value)}
                      onBlur={() => normalizePlatformField(key, 'source')}
                      className={cn(
                        'w-full rounded-md border px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1',
                        sourceErr
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                          : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200'
                      )}
                    />
                    {sourceErr && <p className="mt-1 text-xs text-red-500">{sourceErr}</p>}
                  </div>

                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <select
                        value={val.mediumToken ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          updateMediumToken(key, v === '' ? null : v as 'campaign_name')
                        }}
                        className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300 bg-white"
                      >
                        {Object.entries(MEDIUM_TOKEN_LABELS).map(([v, label]) => (
                          <option key={v} value={v}>{label}</option>
                        ))}
                      </select>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={val.medium}
                          placeholder={usingToken ? 'fallback' : getPlatformDefault(key).medium}
                          onChange={(e) => updatePlatformField(key, 'medium', e.target.value)}
                          onBlur={() => normalizePlatformField(key, 'medium')}
                          className={cn(
                            'w-full rounded-md border px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1',
                            mediumErr
                              ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                              : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200',
                            usingToken && 'text-zinc-400'
                          )}
                        />
                      </div>
                    </div>
                    {mediumErr && <p className="text-xs text-red-500">{mediumErr}</p>}
                    {usingToken && (
                      <p className="text-[10px] text-zinc-400">
                        Uses <span className="font-medium text-zinc-600">{val.mediumToken}</span>; falls back to <span className="font-medium text-zinc-600">{val.medium || '…'}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-start pt-2">
                    {customized ? (
                      <button
                        onClick={() => resetRow(key)}
                        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Reset to default"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Card 2: Content templates ─────────────────────────────────────────── */}
        <div>
          <h2 className="mb-1 text-sm font-semibold text-zinc-700">Content templates</h2>
          <p className="mb-3 text-xs text-zinc-500">
            These values are resolved from the post content at publish time. Use tokens to make
            attribution dynamic across campaigns.
          </p>
          <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">

            <TemplateRow
              label="utm_campaign"
              tokenOptions={Object.entries(CAMPAIGN_TOKEN_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              token={templates.campaign.token}
              fallback={templates.campaign.fallback}
              fallbackLabel={templates.campaign.token === 'custom' ? 'Value' : 'Fallback'}
              showFallback={templates.campaign.token !== 'auto' && templates.campaign.token !== 'date'}
              showDateFormat={templates.campaign.token === 'date'}
              dateFormat={templates.campaign.dateFormat ?? DEFAULT_UTM_DATE_FORMAT}
              onTokenChange={(t) => setTemplates((prev) => ({ ...prev, campaign: { ...prev.campaign, token: t as UTMTemplateCampaignToken, dateFormat: t === 'date' ? (prev.campaign.dateFormat ?? DEFAULT_UTM_DATE_FORMAT) : undefined } }))}
              onFallbackChange={(f) => setTemplates((prev) => ({ ...prev, campaign: { ...prev.campaign, fallback: f } }))}
              onDateFormatChange={(fmt) => setTemplates((prev) => ({ ...prev, campaign: { ...prev.campaign, dateFormat: fmt } }))}
              fallbackError={getFallbackError(templates.campaign.token, templates.campaign.fallback)}
              preview={
                templates.campaign.token === 'auto'
                  ? 'utm_campaign=clout_c_abc123…'
                  : templates.campaign.token === 'date'
                  ? `utm_campaign=${formatPreviewDate(templates.campaign.dateFormat ?? DEFAULT_UTM_DATE_FORMAT)}`
                  : templates.campaign.token === 'custom'
                  ? `utm_campaign=${templates.campaign.fallback || '…'}`
                  : `utm_campaign={campaign_name} or "${templates.campaign.fallback || '…'}"`
              }
            />

            <TemplateRow
              label="utm_content"
              tokenOptions={Object.entries(CONTENT_TOKEN_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              token={templates.content.token}
              fallback={templates.content.fallback}
              fallbackLabel={templates.content.token === 'custom' ? 'Value' : 'Fallback'}
              showFallback={templates.content.token !== 'auto' && templates.content.token !== 'date'}
              showDateFormat={templates.content.token === 'date'}
              dateFormat={templates.content.dateFormat ?? DEFAULT_UTM_DATE_FORMAT}
              onTokenChange={(t) => setTemplates((prev) => ({ ...prev, content: { ...prev.content, token: t as UTMTemplateContentToken, dateFormat: t === 'date' ? (prev.content.dateFormat ?? DEFAULT_UTM_DATE_FORMAT) : undefined } }))}
              onFallbackChange={(f) => setTemplates((prev) => ({ ...prev, content: { ...prev.content, fallback: f } }))}
              onDateFormatChange={(fmt) => setTemplates((prev) => ({ ...prev, content: { ...prev.content, dateFormat: fmt } }))}
              fallbackError={getFallbackError(templates.content.token, templates.content.fallback)}
              preview={
                templates.content.token === 'auto'
                  ? 'utm_content=out_def456…'
                  : templates.content.token === 'date'
                  ? `utm_content=${formatPreviewDate(templates.content.dateFormat ?? DEFAULT_UTM_DATE_FORMAT)}`
                  : templates.content.token === 'custom'
                  ? `utm_content=${templates.content.fallback || '…'}`
                  : `utm_content={cta} or "${templates.content.fallback || '…'}"`
              }
            />

            <TemplateRow
              label="utm_term"
              tokenOptions={Object.entries(TERM_TOKEN_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              token={templates.term.token}
              fallback={templates.term.fallback}
              fallbackLabel={templates.term.token === 'custom' ? 'Value' : 'Fallback'}
              showFallback={templates.term.token !== 'none' && templates.term.token !== 'date'}
              showDateFormat={templates.term.token === 'date'}
              dateFormat={templates.term.dateFormat ?? DEFAULT_UTM_DATE_FORMAT}
              onTokenChange={(t) => setTemplates((prev) => ({ ...prev, term: { ...prev.term, token: t as UTMTemplateTermToken, dateFormat: t === 'date' ? (prev.term.dateFormat ?? DEFAULT_UTM_DATE_FORMAT) : undefined } }))}
              onFallbackChange={(f) => setTemplates((prev) => ({ ...prev, term: { ...prev.term, fallback: f } }))}
              onDateFormatChange={(fmt) => setTemplates((prev) => ({ ...prev, term: { ...prev.term, dateFormat: fmt } }))}
              fallbackError={getFallbackError(templates.term.token, templates.term.fallback)}
              preview={
                templates.term.token === 'none'
                  ? '(omitted)'
                  : templates.term.token === 'date'
                  ? `utm_term=${formatPreviewDate(templates.term.dateFormat ?? DEFAULT_UTM_DATE_FORMAT)}`
                  : templates.term.token === 'custom'
                  ? `utm_term=${templates.term.fallback || '…'}`
                  : `utm_term={${templates.term.token}} or "${templates.term.fallback || '…'}"`
              }
            />

          </div>
        </div>

        <div>
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors border border-zinc-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all to defaults
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TemplateRow sub-component ────────────────────────────────────────────────

interface TemplateRowProps {
  label:              string
  tokenOptions:       { value: string; label: string }[]
  token:              string
  fallback:           string
  fallbackLabel:      string
  showFallback:       boolean
  showDateFormat?:    boolean
  dateFormat?:        UTMDateFormat
  onTokenChange:      (token: string) => void
  onFallbackChange:   (value: string) => void
  onDateFormatChange?: (format: UTMDateFormat) => void
  fallbackError:      string | null
  preview:            string
}

function TemplateRow({
  label, tokenOptions, token, fallback, fallbackLabel, showFallback,
  showDateFormat, dateFormat, onTokenChange, onFallbackChange, onDateFormatChange,
  fallbackError, preview,
}: TemplateRowProps) {
  function normalizeOnBlur(value: string) {
    return value.trim().toLowerCase()
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono font-medium text-zinc-500 w-28 shrink-0">{label}</span>
        <select
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300 bg-white"
        >
          {tokenOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {showDateFormat && dateFormat && onDateFormatChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400">Format:</span>
            <select
              value={dateFormat}
              onChange={(e) => onDateFormatChange(e.target.value as UTMDateFormat)}
              className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300 bg-white"
            >
              {UTM_DATE_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>{DATE_FORMAT_LABELS[fmt]}</option>
              ))}
            </select>
          </div>
        )}

        {showFallback && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400">{fallbackLabel}:</span>
            <input
              type="text"
              value={fallback}
              onChange={(e) => onFallbackChange(e.target.value)}
              onBlur={(e) => onFallbackChange(normalizeOnBlur(e.target.value))}
              placeholder={fallbackLabel.toLowerCase()}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1 w-36',
                fallbackError
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                  : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200'
              )}
            />
            {fallbackError && <p className="text-xs text-red-500">{fallbackError}</p>}
          </div>
        )}
      </div>
      <p className="text-[10px] text-zinc-400 pl-[7.5rem] truncate">
        Preview: <span className="text-zinc-600">{preview}</span>
      </p>
    </div>
  )
}
