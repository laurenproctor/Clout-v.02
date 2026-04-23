'use client'

import { useState, useEffect } from 'react'
import { ColorPicker } from '@/components/brand/color-picker'
import { FontSelector } from '@/components/brand/font-selector'
import { ToneSelector } from '@/components/brand/tone-selector'
import { LogoUploader } from '@/components/brand/logo-uploader'
import { BrandPreview, type BrandSettings } from '@/components/brand/brand-preview'
import { Globe, Sparkles } from 'lucide-react'

type StyleTraits = BrandSettings['style_traits']

const DEFAULT_BRAND: BrandSettings = {
  brand_name: null,
  logo_url: null,
  primary_color: '#1A1A1A',
  secondary_color: '#FFFFFF',
  accent_color: '#D4A574',
  font_heading: 'Playfair Display',
  font_body: 'Inter',
  font_heading_url: undefined,
  font_body_url: undefined,
  tone_traits: [],
  style_traits: {
    border_radius: 'balanced',
    visual_density: 'balanced',
    color_scheme: 'light',
    texture: 'none',
  },
}

export default function BrandSettingsPage() {
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<'quote' | 'tile' | 'carousel'>('quote')
  const [inferUrl, setInferUrl] = useState('')
  const [inferring, setInferring] = useState(false)
  const [inferError, setInferError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/brand')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setBrand({
          brand_name: data.brand_name ?? null,
          logo_url: data.logo_url ?? null,
          primary_color: data.primary_color ?? DEFAULT_BRAND.primary_color,
          secondary_color: data.secondary_color ?? DEFAULT_BRAND.secondary_color,
          accent_color: data.accent_color ?? DEFAULT_BRAND.accent_color,
          font_heading: data.font_heading ?? DEFAULT_BRAND.font_heading,
          font_body: data.font_body ?? DEFAULT_BRAND.font_body,
          font_heading_url: data.font_heading_url ?? undefined,
          font_body_url: data.font_body_url ?? undefined,
          tone_traits: data.tone_traits ?? [],
          style_traits: data.style_traits ?? DEFAULT_BRAND.style_traits,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  function update(patch: Partial<BrandSettings>) {
    setBrand(prev => ({ ...prev, ...patch }))
  }

  function updateStyleTrait(key: keyof StyleTraits, value: string) {
    setBrand(prev => ({
      ...prev,
      style_traits: { ...prev.style_traits, [key]: value },
    }))
  }

  async function handleLogoUpload(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/brand/logo', { method: 'POST', body: fd })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error ?? 'Upload failed')
    }
    const { url } = await res.json()
    update({ logo_url: url })
    return url
  }

  function makeFontUploader(role: 'heading' | 'body') {
    return async (file: File): Promise<string> => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('role', role)
      const res = await fetch('/api/brand/font', { method: 'POST', body: fd })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Upload failed')
      }
      const { url } = await res.json()
      return url
    }
  }

  async function handleInfer() {
    if (!inferUrl.trim()) return
    setInferring(true)
    setInferError(null)
    try {
      const res = await fetch('/api/brand/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inferUrl.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Inference failed')
      }
      const inferred = await res.json()
      update({
        ...(inferred.brand_name && { brand_name: inferred.brand_name }),
        ...(inferred.primary_color && { primary_color: inferred.primary_color }),
        ...(inferred.secondary_color && { secondary_color: inferred.secondary_color }),
        ...(inferred.accent_color && { accent_color: inferred.accent_color }),
        ...(inferred.font_heading && { font_heading: inferred.font_heading }),
        ...(inferred.font_body && { font_body: inferred.font_body }),
        ...(inferred.tone_traits?.length && { tone_traits: inferred.tone_traits }),
      })
      setInferUrl('')
    } catch (err) {
      setInferError(err instanceof Error ? err.message : 'Failed to infer brand')
    } finally {
      setInferring(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/brand', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brand),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Save failed')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-zinc-100" />
          <div className="h-64 rounded-lg bg-zinc-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-900">Brand Guidelines</h1>
        <p className="mt-1 text-sm text-zinc-500">Define your visual identity. This powers all future content visuals.</p>
      </div>

      {/* Infer from URL */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-900">Generate from Website</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-3">Enter your website URL and we'll infer your brand colors, fonts, and tone.</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="url"
              value={inferUrl}
              onChange={e => setInferUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInfer()}
              placeholder="https://yourbrand.com"
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleInfer}
            disabled={inferring || !inferUrl.trim()}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {inferring ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {inferError && <p className="mt-2 text-xs text-red-500">{inferError}</p>}
      </div>

      {/* Two-column: settings left, preview right (sticky) */}
      <div className="flex gap-8">
        <div className="flex-1 space-y-5 min-w-0">

          {/* Identity */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
            <h2 className="text-sm font-semibold text-zinc-900">Identity</h2>
            <div className="flex gap-5">
              <LogoUploader
                value={brand.logo_url ?? null}
                onUpload={handleLogoUpload}
                onRemove={() => update({ logo_url: null })}
              />
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Brand Name</label>
                <input
                  type="text"
                  value={brand.brand_name ?? ''}
                  onChange={e => update({ brand_name: e.target.value || null })}
                  placeholder="Acme Corp"
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
            <h2 className="text-sm font-semibold text-zinc-900">Colors</h2>
            <div className="grid grid-cols-3 gap-4">
              <ColorPicker label="Primary" value={brand.primary_color} onChange={v => update({ primary_color: v })} />
              <ColorPicker label="Secondary" value={brand.secondary_color} onChange={v => update({ secondary_color: v })} />
              <ColorPicker label="Accent" value={brand.accent_color} onChange={v => update({ accent_color: v })} />
            </div>
          </div>

          {/* Typography */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
            <h2 className="text-sm font-semibold text-zinc-900">Typography</h2>
            <FontSelector
              label="Heading Font"
              role="heading"
              value={brand.font_heading}
              customUrl={brand.font_heading_url}
              onChange={(name, url) => update({ font_heading: name, font_heading_url: url })}
              onUpload={makeFontUploader('heading')}
            />
            <FontSelector
              label="Body Font"
              role="body"
              value={brand.font_body}
              customUrl={brand.font_body_url}
              onChange={(name, url) => update({ font_body: name, font_body_url: url })}
              onUpload={makeFontUploader('body')}
            />
          </div>

          {/* Tone */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <ToneSelector value={brand.tone_traits} onChange={v => update({ tone_traits: v })} />
          </div>

          {/* Style traits */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
            <h2 className="text-sm font-semibold text-zinc-900">Style <span className="text-zinc-400 font-normal">(Optional)</span></h2>

            {([
              { key: 'border_radius' as keyof StyleTraits, label: 'Corner Style', options: ['none', 'subtle', 'balanced', 'rounded', 'pill'] },
              { key: 'visual_density' as keyof StyleTraits, label: 'Visual Density', options: ['compact', 'balanced', 'spacious'] },
              { key: 'color_scheme' as keyof StyleTraits, label: 'Color Scheme', options: ['light', 'dark'] },
              { key: 'texture' as keyof StyleTraits, label: 'Texture', options: ['none', 'subtle', 'medium', 'bold'] },
            ] as const).map(({ key, label, options }) => (
              <div key={key}>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateStyleTrait(key, opt)}
                      className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors border ${
                        brand.style_traits[key] === opt
                          ? 'border-zinc-800 bg-zinc-800 text-white'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-zinc-800 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Brand'}
            </button>
          </div>
        </div>

        {/* Right: sticky live preview */}
        <div className="w-80 shrink-0">
          <div className="sticky top-6">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">Live Preview</p>
            <BrandPreview
              settings={brand}
              activeCard={activeCard}
              onCardSelect={setActiveCard}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
