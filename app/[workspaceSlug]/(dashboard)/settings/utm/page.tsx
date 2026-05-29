'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Save, Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DISTRIBUTION_PLATFORMS, PLATFORM_KEYS, getPlatformDefault, normalizeUTMValue } from '@/lib/distribution/platform-registry'

type PlatformUTM = { source: string; medium: string }
type Settings = Record<string, PlatformUTM>

const UTM_VALUE_PATTERN = /^[a-z0-9_-]+$/

function buildDefaultSettings(): Settings {
  const s: Settings = {}
  for (const key of PLATFORM_KEYS) {
    const d = getPlatformDefault(key)
    s[key] = { source: d.source, medium: d.medium }
  }
  return s
}

function getValidationError(value: string): string | null {
  if (!value) return 'Required'
  if (!UTM_VALUE_PATTERN.test(value)) return 'Lowercase letters, numbers, hyphens, underscores only'
  return null
}

export default function UTMSettingsPage() {
  const [settings, setSettings] = useState<Settings>(buildDefaultSettings())
  const [saved, setSaved]       = useState<Settings>(buildDefaultSettings())
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saveConfirmed, setSaveConfirmed] = useState(false)

  useEffect(() => {
    fetch('/api/workspace/utm')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setSettings(d)
          setSaved(d)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved)

  const hasValidationErrors = PLATFORM_KEYS.some((key) =>
    getValidationError(settings[key]?.source ?? '') || getValidationError(settings[key]?.medium ?? '')
  )

  function updateField(platform: string, field: 'source' | 'medium', value: string) {
    setSettings((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }))
  }

  function normalizeField(platform: string, field: 'source' | 'medium') {
    setSettings((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: normalizeUTMValue(prev[platform][field]) },
    }))
  }

  function resetRow(key: string) {
    const d = getPlatformDefault(key)
    setSettings((prev) => ({ ...prev, [key]: { source: d.source, medium: d.medium } }))
  }

  function resetAll() {
    setSettings(buildDefaultSettings())
  }

  const isCustomized = useCallback((key: string) => {
    const d = getPlatformDefault(key)
    return settings[key]?.source !== d.source || settings[key]?.medium !== d.medium
  }, [settings])

  async function handleSave() {
    if (!isDirty || hasValidationErrors) return
    setSaving(true)
    try {
      const res = await fetch('/api/workspace/utm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        const normalized = await res.json()
        setSettings(normalized)
        setSaved(normalized)
        setSaveConfirmed(true)
        setTimeout(() => setSaveConfirmed(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Attribution</h1>
        <p className="mt-1 text-sm text-zinc-500">
          These values appear in links published to each channel so your analytics platform can
          attribute traffic by source and medium.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Channel</p>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">utm_source</p>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">utm_medium</p>
          <span />
        </div>

        {/* Rows */}
        {PLATFORM_KEYS.map((key, i) => {
          const platform = DISTRIBUTION_PLATFORMS[key]
          const val = settings[key] ?? { source: '', medium: '' }
          const sourceErr = getValidationError(val.source)
          const mediumErr = getValidationError(val.medium)
          const customized = isCustomized(key)

          return (
            <div
              key={key}
              className={cn(
                'grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-3',
                i < PLATFORM_KEYS.length - 1 && 'border-b border-zinc-100'
              )}
            >
              {/* Platform name */}
              <div className="flex items-start pt-2">
                <span className="text-sm text-zinc-800 font-medium">{platform.label}</span>
                {customized && (
                  <span className="ml-2 mt-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                    custom
                  </span>
                )}
              </div>

              {/* utm_source */}
              <div>
                <input
                  type="text"
                  value={val.source}
                  placeholder={getPlatformDefault(key).source}
                  onChange={(e) => updateField(key, 'source', e.target.value)}
                  onBlur={() => normalizeField(key, 'source')}
                  className={cn(
                    'w-full rounded-md border px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1',
                    sourceErr
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                      : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200'
                  )}
                />
                {sourceErr && <p className="mt-1 text-xs text-red-500">{sourceErr}</p>}
                {/* Live preview */}
                <p className="mt-1 truncate text-[10px] text-zinc-400">
                  ?utm_source=<span className="text-zinc-600">{val.source || '…'}</span>
                  &amp;utm_medium=<span className="text-zinc-600">{val.medium || '…'}</span>
                </p>
              </div>

              {/* utm_medium */}
              <div>
                <input
                  type="text"
                  value={val.medium}
                  placeholder={getPlatformDefault(key).medium}
                  onChange={(e) => updateField(key, 'medium', e.target.value)}
                  onBlur={() => normalizeField(key, 'medium')}
                  className={cn(
                    'w-full rounded-md border px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1',
                    mediumErr
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                      : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200'
                  )}
                />
                {mediumErr && <p className="mt-1 text-xs text-red-500">{mediumErr}</p>}
              </div>

              {/* Reset row */}
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty || hasValidationErrors}
          className={cn(
            'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
            saveConfirmed
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : saving || !isDirty || hasValidationErrors
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : 'bg-zinc-900 text-white hover:bg-zinc-700'
          )}
        >
          {saveConfirmed
            ? <><Check className="h-4 w-4" /> Saved</>
            : saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            : <><Save className="h-4 w-4" /> Save changes</>}
        </button>

        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset all to defaults
        </button>
      </div>
    </div>
  )
}
