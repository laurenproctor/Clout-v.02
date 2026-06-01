'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { ColorPicker } from '@/components/brand/color-picker'
import { FontSelector } from '@/components/brand/font-selector'
import { ToneSelector } from '@/components/brand/tone-selector'
import { LogoLibrary } from '@/components/brand/logo-library'
import { BrandPreview, type BrandSettings } from '@/components/brand/brand-preview'
import { ImageryPreview, type ImagerySettings } from '@/components/brand/imagery-preview'
import { ExampleBoard } from '@/components/brand/example-board'
import { NegativeRulesInput } from '@/components/brand/negative-rules-input'
import { ImageryUploader } from '@/components/brand/imagery-uploader'
import { SubjectsInput } from '@/components/brand/subjects-input'
import { TypographySettingsPanel } from '@/components/brand/typography-settings-panel'
import { DEFAULT_TYPOGRAPHY } from '@/lib/brand/typographyDefaults'
import type { TypographySettings } from '@/types/typography'
import { Globe, Sparkles } from 'lucide-react'

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'
import { cn } from '@/lib/utils'

type StyleTraits = BrandSettings['style_traits']

const DEFAULT_BRAND: BrandSettings = {
  brand_name: null,
  logo_url: null,
  logo_url_light: null,
  logo_url_dark: null,
  primary_color: '#1A1A1A',
  secondary_color: '#FFFFFF',
  accent_color: '#D4A574',
  accent_color_2: null,
  dark_bg_color: null,
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

const DEFAULT_IMAGERY: ImagerySettings = {
  visual_styles: [],
  imagery_type: [],
  composition: null,
  overlay_text_style: null,
  mood_traits: [],
  negative_rules: [],
  example_board: [],
  negative_example_board: [],
  uploaded_imagery: [],
  subjects: [],
  generation_notes: '',
}

export default function BrandSettingsPage() {
  const [activeTab, setActiveTab] = useState<'identity' | 'imagery'>('identity')

  // Identity state
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND)
  const [logoUrlLight, setLogoUrlLight] = useState<string | null>(null)
  const [logoUrlDark, setLogoUrlDark] = useState<string | null>(null)
  const [logoLibrary, setLogoLibrary] = useState<string[]>([])
  const [brandLoading, setBrandLoading] = useState(true)
  const [brandStatus, setBrandStatus] = useState<SaveStatus>('idle')
  const [brandError, setBrandError] = useState<string | null>(null)
  const brandLoaded = useRef(false)
  const brandSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeCard, setActiveCard] = useState<'quote' | 'tile' | 'carousel'>('quote')
  const [inferUrl, setInferUrl] = useState('')
  const [inferring, setInferring] = useState(false)
  const [inferError, setInferError] = useState<string | null>(null)

  const [typographySettings, setTypographySettings] = useState<TypographySettings>(DEFAULT_TYPOGRAPHY)

  // Imagery state
  const [imagery, setImagery] = useState<ImagerySettings>(DEFAULT_IMAGERY)
  const [imageryLoading, setImageryLoading] = useState(true)
  const [imageryStatus, setImageryStatus] = useState<SaveStatus>('idle')
  const [imageryError, setImageryError] = useState<string | null>(null)
  const imageryLoaded = useRef(false)
  const imagerySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeImageryCard, setActiveImageryCard] = useState<'hero' | 'story' | 'tile'>('hero')

  useEffect(() => {
    fetch('/api/brand')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setBrand({
            brand_name: data.brand_name ?? null,
            logo_url: data.logo_url ?? null,
            primary_color: data.primary_color ?? DEFAULT_BRAND.primary_color,
            secondary_color: data.secondary_color ?? DEFAULT_BRAND.secondary_color,
            accent_color: data.accent_color ?? DEFAULT_BRAND.accent_color,
            accent_color_2: data.accent_color_2 ?? null,
            dark_bg_color: data.dark_bg_color ?? null,
            font_heading: data.font_heading ?? DEFAULT_BRAND.font_heading,
            font_body: data.font_body ?? DEFAULT_BRAND.font_body,
            font_heading_url: data.font_heading_url ?? undefined,
            font_body_url: data.font_body_url ?? undefined,
            tone_traits: data.tone_traits ?? [],
            style_traits: data.style_traits ?? DEFAULT_BRAND.style_traits,
          })
          if (data.typography_settings) {
            setTypographySettings({ ...DEFAULT_TYPOGRAPHY, ...(data.typography_settings as TypographySettings) })
          }
          setLogoUrlLight(data.logo_url_light ?? null)
          setLogoUrlDark(data.logo_url_dark ?? null)
          // Ensure any existing logo_url (pre-library) is included in the library view
          const library: string[] = data.logo_library ?? []
          const activeUrl: string | null = data.logo_url ?? null
          if (activeUrl && !library.includes(activeUrl)) {
            setLogoLibrary([activeUrl, ...library])
          } else {
            setLogoLibrary(library)
          }
        }
      })
      .finally(() => { setBrandLoading(false); setTimeout(() => { brandLoaded.current = true }, 0) })
  }, [])

  useEffect(() => {
    fetch('/api/brand/imagery')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setImagery({
          visual_styles: data.visual_styles ?? [],
          imagery_type: Array.isArray(data.imagery_type) ? data.imagery_type : (data.imagery_type ? [data.imagery_type] : []),
          composition: data.composition ?? null,
          overlay_text_style: data.overlay_text_style ?? null,
          mood_traits: data.mood_traits ?? [],
          negative_rules: data.negative_rules ?? [],
          example_board: data.example_board ?? [],
          negative_example_board: data.negative_example_board ?? [],
          uploaded_imagery: data.uploaded_imagery ?? [],
          subjects: data.subjects ?? [],
          generation_notes: data.generation_notes ?? '',
        })
      })
      .finally(() => { setImageryLoading(false); setTimeout(() => { imageryLoaded.current = true }, 0) })
  }, [])

  function updateBrand(patch: Partial<BrandSettings>) {
    setBrand(prev => ({ ...prev, ...patch }))
  }

  function updateStyleTrait(key: keyof StyleTraits, value: string) {
    setBrand(prev => ({
      ...prev,
      style_traits: { ...prev.style_traits, [key]: value },
    }))
  }

  function updateImagery(patch: Partial<ImagerySettings>) {
    setImagery(prev => ({ ...prev, ...patch }))
  }

  async function handleImageryUpload(file: File): Promise<void> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/brand/imagery/upload', { method: 'POST', body: fd })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Upload failed') }
    const { url } = await res.json()
    updateImagery({ uploaded_imagery: [...imagery.uploaded_imagery, url] })
  }

  async function handleImageryDelete(url: string): Promise<void> {
    const res = await fetch('/api/brand/imagery/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Delete failed') }
    updateImagery({ uploaded_imagery: imagery.uploaded_imagery.filter(u => u !== url) })
  }

  async function handleLogoUpload(file: File): Promise<void> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/brand/logo', { method: 'POST', body: fd })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Upload failed') }
    const { url } = await res.json()
    setLogoLibrary(prev => prev.includes(url) ? prev : [...prev, url])
    updateBrand({ logo_url: url })
  }

  function handleLogoActivate(url: string) {
    updateBrand({ logo_url: url })
    // Persist immediately so the active logo survives without hitting Save Brand
    fetch('/api/brand', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_url: url }),
    })
  }

  async function handleLogoDelete(url: string): Promise<void> {
    const res = await fetch('/api/brand/logo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Delete failed') }
    setLogoLibrary(prev => prev.filter(u => u !== url))
    if (brand.logo_url === url) {
      const remaining = logoLibrary.filter(u => u !== url)
      updateBrand({ logo_url: remaining[0] ?? null })
    }
  }

  function handleTagLight(url: string | null) {
    setLogoUrlLight(url)
    fetch('/api/brand', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_url_light: url }),
    })
  }

  function handleTagDark(url: string | null) {
    setLogoUrlDark(url)
    fetch('/api/brand', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_url_dark: url }),
    })
  }

  function makeFontUploader(role: 'heading' | 'body') {
    return async (file: File): Promise<string> => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('role', role)
      const res = await fetch('/api/brand/font', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Upload failed') }
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
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Inference failed') }
      const inferred = await res.json()
      updateBrand({
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

  // Refs always hold the latest values so timer callbacks never see stale closures
  const brandSaveData = useRef({ brand, typographySettings })
  useEffect(() => { brandSaveData.current = { brand, typographySettings } })

  const imagerySaveData = useRef(imagery)
  useEffect(() => { imagerySaveData.current = imagery })

  const handleSaveBrand = useCallback(async () => {
    setBrandStatus('saving')
    setBrandError(null)
    const { brand: b, typographySettings: t } = brandSaveData.current
    const res = await fetch('/api/brand', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...b, typography_settings: t }),
    })
    if (res.ok) {
      setBrandStatus('saved')
      setTimeout(() => setBrandStatus('idle'), 3000)
    } else {
      const d = await res.json()
      setBrandError(d.error ?? 'Save failed')
      setBrandStatus('error')
    }
  }, [])

  const handleSaveImagery = useCallback(async () => {
    setImageryStatus('saving')
    setImageryError(null)
    const res = await fetch('/api/brand/imagery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imagerySaveData.current),
    })
    if (res.ok) {
      setImageryStatus('saved')
      setTimeout(() => setImageryStatus('idle'), 3000)
    } else {
      const d = await res.json()
      setImageryError(d.error ?? 'Save failed')
      setImageryStatus('error')
    }
  }, [])

  // Auto-save brand on change (debounced 1.5s)
  useEffect(() => {
    if (!brandLoaded.current) return
    setBrandStatus('unsaved')
    if (brandSaveTimer.current) clearTimeout(brandSaveTimer.current)
    brandSaveTimer.current = setTimeout(handleSaveBrand, 1500)
    return () => { if (brandSaveTimer.current) clearTimeout(brandSaveTimer.current) }
  }, [brand, typographySettings, handleSaveBrand])

  // Auto-save imagery on change (debounced 1.5s)
  useEffect(() => {
    if (!imageryLoaded.current) return
    setImageryStatus('unsaved')
    if (imagerySaveTimer.current) clearTimeout(imagerySaveTimer.current)
    imagerySaveTimer.current = setTimeout(handleSaveImagery, 1500)
    return () => { if (imagerySaveTimer.current) clearTimeout(imagerySaveTimer.current) }
  }, [imagery, handleSaveImagery])

  const loading = brandLoading || imageryLoading

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

  const status = activeTab === 'identity' ? brandStatus : imageryStatus
  const statusError = activeTab === 'identity' ? brandError : imageryError
  const onSave = activeTab === 'identity' ? handleSaveBrand : handleSaveImagery

  return (
    <div className="mx-auto max-w-5xl pb-16">
      {/* Sticky header with save status */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-zinc-100 -mx-4 px-4 md:-mx-8 md:px-8 mb-6">
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Brand Guidelines</h1>
            <p className="text-xs text-zinc-400">Define your visual identity and imagery direction.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status indicator — only shown for unsaved/error states; button handles the rest */}
            {(status === 'unsaved' || status === 'error') && (
              <span className={cn('flex items-center gap-1.5 text-xs', {
                'text-amber-500': status === 'unsaved',
                'text-red-500': status === 'error',
              })}>
                {status === 'unsaved' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />}
                {status === 'unsaved' ? 'Unsaved changes' : (statusError ?? 'Save failed')}
              </span>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={status === 'saving' || status === 'saved'}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white transition-all',
                status === 'saved'
                  ? 'bg-emerald-600 cursor-default'
                  : status === 'saving'
                    ? 'bg-zinc-900 opacity-50 cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-700'
              )}
            >
              {status === 'saved' && <Check className="h-3 w-3" />}
              {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
              {status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 border-t border-zinc-100">
          {(['identity', 'imagery'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
                activeTab === tab
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: settings panel */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* ── IDENTITY TAB ── */}
          {activeTab === 'identity' && (
            <>
              {/* Infer from URL */}
              <div className="rounded-lg border border-zinc-200 bg-white p-5">
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

              {/* Identity */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
                <h2 className="text-sm font-semibold text-zinc-900">Identity</h2>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Brand Name{brand.logo_url && <span className="ml-1 normal-case font-normal text-zinc-400 tracking-normal">(optional when logo is set)</span>}
                  </label>
                  <input
                    type="text"
                    value={brand.brand_name ?? ''}
                    onChange={e => updateBrand({ brand_name: e.target.value || null })}
                    placeholder={brand.logo_url ? 'Leave blank to use logo only' : 'Acme Corp'}
                    className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>
                <LogoLibrary
                  logos={logoLibrary}
                  activeLogo={brand.logo_url ?? null}
                  lightLogo={logoUrlLight}
                  darkLogo={logoUrlDark}
                  onUpload={handleLogoUpload}
                  onActivate={handleLogoActivate}
                  onDelete={handleLogoDelete}
                  onTagLight={handleTagLight}
                  onTagDark={handleTagDark}
                />
              </div>

              {/* Colors */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
                <h2 className="text-sm font-semibold text-zinc-900">Colors</h2>
                <div className="grid grid-cols-3 gap-4">
                  <ColorPicker label="Primary" value={brand.primary_color} onChange={v => updateBrand({ primary_color: v })} />
                  <ColorPicker label="Light Background" value={brand.secondary_color} onChange={v => updateBrand({ secondary_color: v })} />
                  <ColorPicker label="Accent" value={brand.accent_color} onChange={v => updateBrand({ accent_color: v })} />
                  <ColorPicker
                    label="Accent 2"
                    value={brand.accent_color_2 ?? ''}
                    onChange={v => updateBrand({ accent_color_2: v || null })}
                  />
                  <ColorPicker
                    label="Dark Background"
                    value={brand.dark_bg_color ?? ''}
                    onChange={v => updateBrand({ dark_bg_color: v || null })}
                  />
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
                  onChange={(name, url) => updateBrand({ font_heading: name, font_heading_url: url })}
                  onUpload={makeFontUploader('heading')}
                />
                <FontSelector
                  label="Body Font"
                  role="body"
                  value={brand.font_body}
                  customUrl={brand.font_body_url}
                  onChange={(name, url) => updateBrand({ font_body: name, font_body_url: url })}
                  onUpload={makeFontUploader('body')}
                />
                <div className="pt-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Per-Element Styles</p>
                  <TypographySettingsPanel
                    value={typographySettings}
                    globalHeadingFont={brand.font_heading}
                    globalBodyFont={brand.font_body}
                    brandColors={{ primary: brand.primary_color, secondary: brand.secondary_color, accent: brand.accent_color }}
                    onChange={setTypographySettings}
                  />
                </div>
              </div>

              {/* Tone */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <ToneSelector value={brand.tone_traits} onChange={v => updateBrand({ tone_traits: v })} />
              </div>

              {/* Style traits */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
                <h2 className="text-sm font-semibold text-zinc-900">Style <span className="text-zinc-400 font-normal">(Optional)</span></h2>
                {([
                  { key: 'border_radius' as keyof StyleTraits, label: 'Corner Style', options: ['none', 'subtle', 'balanced', 'rounded', 'pill'] },
                  { key: 'visual_density' as keyof StyleTraits, label: 'Visual Density', options: ['compact', 'balanced', 'spacious'] },
                  { key: 'color_scheme' as keyof StyleTraits, label: 'Default Color Scheme', options: ['light', 'dark'] },
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

            </>
          )}

          {/* ── IMAGERY TAB ── */}
          {activeTab === 'imagery' && (
            <>
              {/* Visual Style */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-900">Visual Style</h2>
                <p className="text-xs text-zinc-500">Select all that define your brand world.</p>
                <div className="flex flex-wrap gap-2">
                  {['Editorial', 'Luxury', 'Startup Modern', 'Bold Graphic', 'Minimalist', 'Technical', 'Warm Human', 'Futuristic'].map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => {
                        const next = imagery.visual_styles.includes(style)
                          ? imagery.visual_styles.filter(s => s !== style)
                          : [...imagery.visual_styles, style]
                        updateImagery({ visual_styles: next })
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                        imagery.visual_styles.includes(style)
                          ? 'border-zinc-800 bg-zinc-800 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400'
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Imagery Type */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-900">Imagery Type</h2>
                <p className="text-xs text-zinc-500">Select all that apply.</p>
                <div className="flex flex-wrap gap-2">
                  {['Photography', 'Illustration', 'Mixed', 'Text-led', 'Abstract'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const next = imagery.imagery_type.includes(type)
                          ? imagery.imagery_type.filter(t => t !== type)
                          : [...imagery.imagery_type, type]
                        updateImagery({ imagery_type: next })
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                        imagery.imagery_type.includes(type)
                          ? 'border-zinc-800 bg-zinc-800 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Composition */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-900">Composition</h2>
                <div className="flex flex-wrap gap-2">
                  {['Centered', 'Asymmetrical', 'Whitespace', 'Close Crop', 'Cinematic', 'Grid'].map(comp => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => updateImagery({ composition: imagery.composition === comp ? null : comp })}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                        imagery.composition === comp
                          ? 'border-zinc-800 bg-zinc-800 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400'
                      )}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay Text Style */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-900">Overlay Text Style</h2>
                <div className="flex flex-wrap gap-2">
                  {['None', 'Headline Overlay', 'Quote Card', 'Editorial Masthead', 'Stat Callout'].map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => updateImagery({
                        overlay_text_style: style === 'None'
                          ? null
                          : (imagery.overlay_text_style === style ? null : style)
                      })}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                        (style === 'None' ? imagery.overlay_text_style === null : imagery.overlay_text_style === style)
                          ? 'border-zinc-800 bg-zinc-800 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400'
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood Traits */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-900">Mood</h2>
                <div className="flex flex-wrap gap-2">
                  {['Premium', 'Calm', 'Bold', 'Intellectual', 'Energetic', 'Serious'].map(mood => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => {
                        const next = imagery.mood_traits.includes(mood)
                          ? imagery.mood_traits.filter(m => m !== mood)
                          : [...imagery.mood_traits, mood]
                        updateImagery({ mood_traits: next })
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                        imagery.mood_traits.includes(mood)
                          ? 'border-zinc-800 bg-zinc-800 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400'
                      )}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subjects & Generation Guidelines */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
                <h2 className="text-sm font-semibold text-zinc-900">Generation Guidelines</h2>
                <SubjectsInput
                  value={imagery.subjects}
                  onChange={v => updateImagery({ subjects: v })}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Additional Instructions
                  </label>
                  <textarea
                    value={imagery.generation_notes}
                    onChange={e => updateImagery({ generation_notes: e.target.value })}
                    placeholder="e.g. Always use natural light. Avoid showing faces. Prefer wide-angle outdoor shots with warm tones..."
                    rows={4}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none resize-none"
                  />
                  <p className="text-xs text-zinc-400">Free-form instructions to guide image generation for this brand.</p>
                </div>
              </div>

              {/* Negative Rules */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <NegativeRulesInput
                  value={imagery.negative_rules}
                  onChange={v => updateImagery({ negative_rules: v })}
                />
              </div>

              {/* Example Imagery Upload */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Example Imagery</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Upload images that represent your brand. Used directly in posts and as inspiration for image generation.</p>
                </div>
                <ImageryUploader
                  images={imagery.uploaded_imagery}
                  onUpload={handleImageryUpload}
                  onDelete={handleImageryDelete}
                />
              </div>

              {/* Example Board */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <ExampleBoard
                  value={imagery.example_board}
                  onChange={v => updateImagery({ example_board: v })}
                  negativeBoard={imagery.negative_example_board}
                  onNegativeChange={v => updateImagery({ negative_example_board: v })}
                  visualStyles={imagery.visual_styles}
                  imageryTypes={imagery.imagery_type}
                  moodTraits={imagery.mood_traits}
                  toneTraits={brand.tone_traits}
                  subjects={imagery.subjects}
                  generationNotes={imagery.generation_notes}
                  colorScheme={brand.style_traits.color_scheme}
                />
              </div>

            </>
          )}
        </div>

        {/* Right: sticky preview — switches based on active tab */}
        <div className="w-full lg:w-80 lg:shrink-0">
          <div className="sticky top-6">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">Live Preview</p>
            {activeTab === 'identity' ? (
              <BrandPreview
                settings={{ ...brand, logo_url_light: logoUrlLight, logo_url_dark: logoUrlDark }}
                typographySettings={typographySettings}
                activeCard={activeCard}
                onCardSelect={setActiveCard}
              />
            ) : (
              <ImageryPreview
                imagery={imagery}
                primaryColor={brand.primary_color}
                secondaryColor={brand.secondary_color}
                accentColor={brand.accent_color}
                logoUrl={brand.logo_url}
                brandName={brand.brand_name}
                headingFont={brand.font_heading}
                bodyFont={brand.font_body}
                typographySettings={typographySettings}
                activeCard={activeImageryCard}
                onCardSelect={setActiveImageryCard}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
