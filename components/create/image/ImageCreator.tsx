'use client'

import { useState, useEffect, useRef } from 'react'
import { ImageIcon, Sun, Moon, Upload, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { VisualPreview } from '@/components/visual/VisualPreview'
import type { AspectRatio, VisualIntent } from '@/lib/visual/types/visual'

type ImageStyle = 'quote-overlay' | 'headline-overlay' | 'blog-image'
type GeneratorState = 'idle' | 'generating' | 'done' | 'error'

interface GeneratedResult {
  assetId: string
  name?: string | null
  slug?: string | null
  description?: string | null
  url: string
  backgroundUrl?: string
  composedUrl?: string | null
  templateId?: string | null
  readabilityRating?: 'excellent' | 'good' | 'fair' | 'poor' | null
  visualIntent: VisualIntent | null
  prompt: string
  aspectRatio: AspectRatio
  generationGroupId: string
}

interface GenerationContext {
  backgroundUrl: string
  templateId: string | null
  prompt: string | null
  backgroundMode: 'generated' | 'uploaded' | 'solid'
  imageStyle: string
  aspectRatio: string
  colorScheme: 'light' | 'dark'
  includeLogo: boolean
  preferredTextZone: string | null
  overlayStrength: 'subtle' | 'balanced' | 'strong'
  textShadow: 'none' | 'light' | 'medium' | 'strong'
  readabilityRating: 'excellent' | 'good' | 'fair' | 'poor' | null
}

interface GenerationParams {
  imageStyle: ImageStyle
  quoteText: string
  attribution: string
  headlineText: string
  subtext: string
  blogTopic: string
  backgroundSource: 'none' | 'upload' | 'generate'
  backgroundDescription: string
  uploadedImageUrl: string | null
  includeLogo: boolean
  colorScheme: 'light' | 'dark'
  aspectRatio: AspectRatio
}

interface ImageCreatorProps {
  workspaceId: string
  logoUrl: string | null
  brandColors: { primary: string; secondary: string; accent: string }
}

const STYLE_TABS: { id: ImageStyle; label: string }[] = [
  { id: 'headline-overlay', label: 'Headline Banner' },
  { id: 'blog-image',      label: 'Blog Image' },
  { id: 'quote-overlay',   label: 'Quote Card' },
]

const STYLE_PLATFORM: Record<ImageStyle, string> = {
  'quote-overlay':   'instagram',
  'headline-overlay': 'blog',
  'blog-image':      'blog',
}

const ASPECT_LABELS: Record<AspectRatio, string> = {
  square:    'Square',
  landscape: 'Landscape',
  portrait:  'Portrait',
}

export function ImageCreator({ logoUrl, brandColors: _brandColors }: ImageCreatorProps) {
  const [imageStyle, setImageStyle] = useState<ImageStyle>('headline-overlay')
  const [quoteText, setQuoteText] = useState('')
  const [attribution, setAttribution] = useState('')
  const [headlineText, setHeadlineText] = useState('')
  const [subtext, setSubtext] = useState('')
  const [blogTopic, setBlogTopic] = useState('')
  const [backgroundSource, setBackgroundSource] = useState<'none' | 'upload' | 'generate'>('none')
  const [backgroundDescription, setBackgroundDescription] = useState('')
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [includeLogo, setIncludeLogo] = useState(false)
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('landscape')
  const [overlayStrength, setOverlayStrength] = useState<'subtle' | 'balanced' | 'strong'>('balanced')
  const [textShadow, setTextShadow] = useState<'none' | 'light' | 'medium' | 'strong'>('none')
  const [generationContext, setGenerationContext] = useState<GenerationContext | null>(null)
  const [genState, setGenState] = useState<GeneratorState>('idle')
  const [result, setResult] = useState<GeneratedResult | null>(null)
  const [downloadName, setDownloadName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const lastGeneratedParams = useRef<GenerationParams | null>(null)

  useEffect(() => {
    setAspectRatio(imageStyle === 'quote-overlay' ? 'square' : 'landscape')
  }, [imageStyle])

  async function handleFileUpload(file: File) {
    setIsUploading(true)
    setUploadError(null)
    setUploadPreview(URL.createObjectURL(file))

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/create/image/upload', { method: 'POST', body: formData })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setUploadedImageUrl(data.url!)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      setUploadPreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  function clearUpload() {
    setUploadedImageUrl(null)
    setUploadPreview(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function getCurrentParams(): GenerationParams {
    return {
      imageStyle,
      quoteText,
      attribution,
      headlineText,
      subtext,
      blogTopic,
      backgroundSource,
      backgroundDescription,
      uploadedImageUrl,
      includeLogo,
      colorScheme,
      aspectRatio,
    }
  }

  function hasFormChanges(): boolean {
    if (!lastGeneratedParams.current) return true
    return JSON.stringify(getCurrentParams()) !== JSON.stringify(lastGeneratedParams.current)
  }

  function buildContentFromParams(p: GenerationParams): string {
    const logoSuffix = (p.includeLogo && p.imageStyle === 'blog-image') ? ' Include brand logo in corner.' : ''
    const schemeSuffix = p.colorScheme === 'dark'
      ? ' Dark color scheme: deep backgrounds, light text, moody and high-contrast.'
      : ' Light color scheme: bright backgrounds, clean and airy aesthetic.'
    const bgDescSuffix = p.backgroundSource === 'generate' && p.backgroundDescription.trim()
      ? ` Background image: ${p.backgroundDescription.trim()}.`
      : ''
    switch (p.imageStyle) {
      case 'quote-overlay':
        return `Quote card: "${p.quoteText}" — ${p.attribution || 'Brand Voice'}. Create a striking social image with this quote as the focal point.${bgDescSuffix}${schemeSuffix}${logoSuffix}`
      case 'headline-overlay': {
        const bgDesc = p.backgroundSource === 'generate' && p.backgroundDescription.trim()
          ? ` ${p.backgroundDescription.trim()}.`
          : ''
        return `Hero banner background for: ${p.headlineText}.${bgDesc} Clean composition with clear space for text overlay — no text or logos in the image.${schemeSuffix}`
      }
      case 'blog-image':
        return `Editorial blog photograph for: ${p.blogTopic}. No text overlays. Pure photography.${schemeSuffix}${logoSuffix}`
    }
  }

  function buildKeyIdeaFromParams(p: GenerationParams): string {
    switch (p.imageStyle) {
      case 'quote-overlay':   return 'quote card'
      case 'headline-overlay': return 'hero banner with headline'
      case 'blog-image':      return 'editorial photograph no text'
    }
  }

  function isReadyToGenerate(): boolean {
    if (genState === 'generating') return false
    if (backgroundSource === 'upload' && isUploading) return false
    switch (imageStyle) {
      case 'quote-overlay':   return quoteText.trim().length > 0
      case 'headline-overlay': return headlineText.trim().length > 0
      case 'blog-image':      return blogTopic.trim().length > 0
    }
  }

  async function handleGenerate() {
    // Snapshot current form values before anything async happens
    const params = getCurrentParams()

    // Guard: if Upload tab is active but no image has been successfully uploaded,
    // block generation to prevent silent fallback to DALL-E.
    // Don't set genState('error') — keep the button active so the user can fix and retry.
    if (params.backgroundSource === 'upload' && !params.uploadedImageUrl) {
      setError('Please wait for your image to finish uploading, or choose a different background option.')
      return
    }

    setGenState('generating')
    setResult(null)
    setGenerationContext(null)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        content: buildContentFromParams(params),
        keyIdea: buildKeyIdeaFromParams(params),
        platform: STYLE_PLATFORM[params.imageStyle],
        aspectRatio: params.aspectRatio,
      }
      if (params.backgroundSource === 'upload' && params.uploadedImageUrl) {
        body.suppliedBackgroundUrl = params.uploadedImageUrl
        body.backgroundMode = 'uploaded'
      } else if (
        params.backgroundSource === 'none' &&
        (params.imageStyle === 'headline-overlay' || params.imageStyle === 'quote-overlay')
      ) {
        body.backgroundMode = 'solid'
      } else {
        body.backgroundMode = 'generated'
      }
      if (params.imageStyle === 'headline-overlay') {
        body.overlayHeadline = params.headlineText.trim()
        if (params.subtext.trim()) body.overlaySubtext = params.subtext.trim()
        body.includeLogo = params.includeLogo
        body.colorScheme = params.colorScheme
      }
      if (params.imageStyle === 'quote-overlay' && params.quoteText.trim()) {
        body.overlayQuote = params.quoteText.trim()
        if (params.attribution.trim()) body.overlayAttribution = params.attribution.trim()
        body.includeLogo = params.includeLogo
        body.colorScheme = params.colorScheme
      }
      if (params.backgroundSource !== 'none') {
        body.overlayStrength = overlayStrength
        if (textShadow !== 'none') body.textShadow = textShadow
      }

      const res = await fetch('/api/visual/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as GeneratedResult & { aspectRatio?: AspectRatio }
      setResult({ ...data, aspectRatio: params.aspectRatio })
      setDownloadName(
        data.name?.trim() ||
        (params.imageStyle === 'headline-overlay' ? params.headlineText.trim()
          : params.imageStyle === 'quote-overlay'  ? params.quoteText.trim().slice(0, 60)
          : params.blogTopic.trim())
      )
      setGenerationContext({
        backgroundUrl:    data.backgroundUrl ?? data.url,
        templateId:       data.templateId    ?? null,
        prompt:           data.prompt        ?? null,
        backgroundMode:   params.backgroundSource === 'none' ? 'solid' : params.backgroundSource === 'upload' ? 'uploaded' : 'generated',
        imageStyle:       params.imageStyle,
        aspectRatio:      params.aspectRatio,
        colorScheme:      params.colorScheme,
        includeLogo:      params.includeLogo,
        preferredTextZone: null,
        overlayStrength,
        textShadow,
        readabilityRating: (data.readabilityRating ?? null) as 'excellent' | 'good' | 'fair' | 'poor' | null,
      })
      lastGeneratedParams.current = params
      setGenState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setGenState('error')
    }
  }

  async function handleStyleUpdate(overrides?: {
    overlayStrength?: 'subtle' | 'balanced' | 'strong'
    textShadow?: 'none' | 'light' | 'medium' | 'strong'
  }) {
    if (!generationContext) return
    setResult(null)
    setGenState('generating')

    const effectiveStrength = overrides?.overlayStrength ?? overlayStrength
    const effectiveShadow   = overrides?.textShadow      ?? textShadow

    try {
      const body: Record<string, unknown> = {
        backgroundMode:       'uploaded',
        suppliedBackgroundUrl: generationContext.backgroundUrl,
        aspectRatio,
        colorScheme,
        includeLogo,
        overlayStrength:      effectiveStrength,
      }
      if (effectiveShadow !== 'none') body.textShadow = effectiveShadow
      if (imageStyle === 'headline-overlay') {
        body.overlayHeadline = headlineText
        if (subtext.trim()) body.overlaySubtext = subtext.trim()
      } else if (imageStyle === 'quote-overlay') {
        body.overlayQuote = quoteText
        if (attribution.trim()) body.overlayAttribution = attribution.trim()
      }

      const res = await fetch('/api/visual/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? 'Update failed')
      }
      const data = await res.json() as GeneratedResult
      setResult({ ...data, aspectRatio })
      setGenerationContext(prev => prev ? {
        ...prev,
        backgroundUrl:   data.backgroundUrl ?? prev.backgroundUrl,
        overlayStrength: effectiveStrength,
        textShadow:      effectiveShadow,
      } : null)
      setGenState('done')
    } catch (err) {
      setGenState('error')
      setError(err instanceof Error ? err.message : 'Style update failed')
    }
  }

  const inputBase = 'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400'

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Style tabs */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 gap-0.5">
          {STYLE_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setImageStyle(tab.id)}
              className={cn(
                'rounded px-4 py-1.5 text-sm font-medium transition-colors',
                imageStyle === tab.id
                  ? 'bg-white shadow-sm text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Controls */}
        <div className="flex flex-col gap-5">
          {/* Style-specific inputs */}
          {imageStyle === 'quote-overlay' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Quote</label>
                <textarea
                  value={quoteText}
                  onChange={e => setQuoteText(e.target.value)}
                  placeholder="Enter the quote text…"
                  rows={4}
                  className={cn(inputBase, 'resize-none')}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Attribution <span className="text-zinc-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={attribution}
                  onChange={e => setAttribution(e.target.value)}
                  placeholder="e.g. — Steve Jobs"
                  className={inputBase}
                />
              </div>

              {/* Background image */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-zinc-600">Background image</p>
                <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 gap-0.5 mb-3">
                  {(['none', 'upload', 'generate'] as const).map(src => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => { setBackgroundSource(src); clearUpload() }}
                      className={cn(
                        'rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                        backgroundSource === src
                          ? 'bg-white shadow-sm text-zinc-900'
                          : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {src === 'none' ? 'None' : src === 'upload' ? 'Upload' : 'Generate'}
                    </button>
                  ))}
                </div>

                {backgroundSource === 'upload' && (
                  <div>
                    {uploadPreview ? (
                      <div className="relative w-full overflow-hidden rounded-md border border-zinc-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={uploadPreview} alt="Background preview" className="h-32 w-full object-cover" />
                        <button
                          type="button"
                          onClick={clearUpload}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/70 text-white hover:bg-zinc-900"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {isUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                            <Spinner size="lg" label="Uploading image" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                        onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f) }}
                        className={cn(
                          'flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-5 text-xs transition-colors',
                          isDragging
                            ? 'border-zinc-500 bg-zinc-100 text-zinc-700'
                            : 'border-zinc-300 bg-zinc-50 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100'
                        )}
                      >
                        <Upload className="h-4 w-4" />
                        {isDragging ? 'Drop image here' : 'Click or drag & drop an image'}
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                    />
                    {uploadError && <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>}
                  </div>
                )}

                {backgroundSource === 'generate' && (
                  <div>
                    <textarea
                      value={backgroundDescription}
                      onChange={e => setBackgroundDescription(e.target.value)}
                      placeholder="Describe the background image… (e.g. misty mountain at dawn, urban street at night)"
                      rows={3}
                      className={cn(inputBase, 'resize-none')}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {imageStyle === 'headline-overlay' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Headline</label>
                <input
                  type="text"
                  value={headlineText}
                  onChange={e => setHeadlineText(e.target.value)}
                  placeholder="Enter the headline…"
                  className={inputBase}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Subtext <span className="text-zinc-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={subtext}
                  onChange={e => setSubtext(e.target.value)}
                  placeholder="Supporting line or description"
                  className={inputBase}
                />
              </div>
              {/* Background image */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-zinc-600">Background image</p>
                <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 gap-0.5 mb-3">
                  {(['none', 'upload', 'generate'] as const).map(src => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => { setBackgroundSource(src); clearUpload() }}
                      className={cn(
                        'rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                        backgroundSource === src
                          ? 'bg-white shadow-sm text-zinc-900'
                          : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {src === 'none' ? 'None' : src === 'upload' ? 'Upload' : 'Generate'}
                    </button>
                  ))}
                </div>

                {backgroundSource === 'upload' && (
                  <div>
                    {uploadPreview ? (
                      <div className="relative w-full overflow-hidden rounded-md border border-zinc-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={uploadPreview} alt="Background preview" className="h-32 w-full object-cover" />
                        <button
                          type="button"
                          onClick={clearUpload}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/70 text-white hover:bg-zinc-900"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {isUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                            <Spinner size="lg" label="Uploading image" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                        onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f) }}
                        className={cn(
                          'flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-5 text-xs transition-colors',
                          isDragging
                            ? 'border-zinc-500 bg-zinc-100 text-zinc-700'
                            : 'border-zinc-300 bg-zinc-50 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100'
                        )}
                      >
                        <Upload className="h-4 w-4" />
                        {isDragging ? 'Drop image here' : 'Click or drag & drop an image'}
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                    />
                    {uploadError && <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>}
                  </div>
                )}

                {backgroundSource === 'generate' && (
                  <textarea
                    value={backgroundDescription}
                    onChange={e => setBackgroundDescription(e.target.value)}
                    placeholder="Describe the background image… (e.g. aerial city skyline at sunset, minimalist studio with soft shadows)"
                    rows={3}
                    className={cn(inputBase, 'resize-none')}
                  />
                )}
              </div>
            </>
          )}

          {imageStyle === 'blog-image' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">Topic or description</label>
              <textarea
                value={blogTopic}
                onChange={e => setBlogTopic(e.target.value)}
                placeholder="Describe the subject, scene, or mood for the image…"
                rows={4}
                className={cn(inputBase, 'resize-none')}
              />
            </div>
          )}

          {/* Aspect ratio */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-600">Aspect ratio</p>
            <div className="flex gap-2">
              {(['square', 'landscape', 'portrait'] as AspectRatio[]).map(ratio => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    aspectRatio === ratio
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                  )}
                >
                  {ASPECT_LABELS[ratio]}
                </button>
              ))}
            </div>
          </div>

          {/* Dark / light scheme */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-600">Color scheme</p>
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setColorScheme('light')}
                className={cn(
                  'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                  colorScheme === 'light'
                    ? 'bg-white shadow-sm text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-700'
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setColorScheme('dark')}
                className={cn(
                  'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                  colorScheme === 'dark'
                    ? 'bg-zinc-900 shadow-sm text-white'
                    : 'text-zinc-500 hover:text-zinc-700'
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
            </div>
          </div>

          {/* Overlay strength — only when a background image is used */}
          {backgroundSource !== 'none' && (imageStyle === 'headline-overlay' || imageStyle === 'quote-overlay') && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-zinc-600">Overlay Strength</p>
              <div className="flex gap-1">
                {(['subtle', 'balanced', 'strong'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setOverlayStrength(s)}
                    className={cn(
                      'flex-1 py-1.5 text-xs rounded-md border capitalize transition-colors',
                      overlayStrength === s
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text shadow — only when a background image is used */}
          {backgroundSource !== 'none' && (imageStyle === 'headline-overlay' || imageStyle === 'quote-overlay') && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-zinc-600">Text Shadow</p>
              <div className="flex gap-1">
                {(['none', 'light', 'medium', 'strong'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTextShadow(s)}
                    className={cn(
                      'flex-1 py-1.5 text-xs rounded-md border capitalize transition-colors',
                      textShadow === s
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logo toggle */}
          {logoUrl && (
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={includeLogo}
                onChange={e => setIncludeLogo(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
              />
              <span className="text-sm text-zinc-700">Include logo</span>
            </label>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!isReadyToGenerate()}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-colors',
              isReadyToGenerate()
                ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                : 'cursor-not-allowed bg-zinc-100 text-zinc-400'
            )}
          >
            {genState === 'generating' && <Spinner size="md" />}
            {genState === 'generating'
              ? 'Generating…'
              : result
                ? hasFormChanges() ? 'Regenerate with Changes' : 'Regenerate'
                : 'Generate Image'}
          </button>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </div>

        {/* Right: Preview */}
        <div className="flex items-start justify-center">
          {genState === 'idle' && !result && (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 py-16 text-center">
              <ImageIcon className="mb-3 h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-400">Your image will appear here</p>
            </div>
          )}

          {genState === 'generating' && (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 py-16 text-center">
              <Spinner size="xl" className="mb-3" />
              <p className="text-sm text-zinc-400">Generating…</p>
            </div>
          )}

          {(genState === 'done' || genState === 'error') && result && (
            <div className="w-full space-y-3">
              <VisualPreview
                url={result.url}
                backgroundUrl={result.backgroundUrl}
                composedUrl={result.composedUrl}
                templateId={result.templateId}
                aspectRatio={result.aspectRatio}
                prompt={result.prompt}
                visualIntent={result.visualIntent}
                assetId={result.assetId}
                downloadSlug={result.slug}
                downloadName={downloadName}
              />

              {generationContext?.readabilityRating && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400">Readability:</span>
                  <span className={cn(
                    'font-medium',
                    generationContext.readabilityRating === 'poor' || generationContext.readabilityRating === 'fair'
                      ? 'text-amber-500'
                      : 'text-green-600'
                  )}>
                    {{ excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' }[generationContext.readabilityRating]}
                  </span>
                </div>
              )}

              {genState === 'done' && generationContext && (imageStyle === 'headline-overlay' || imageStyle === 'quote-overlay') && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStyleUpdate()}
                    className="flex-1 rounded-md border border-zinc-200 py-2 px-3 text-xs text-zinc-600 hover:border-zinc-400 transition-colors"
                  >
                    Update Style
                  </button>
                  {backgroundSource !== 'none' && (
                    <button
                      type="button"
                      onClick={() => handleStyleUpdate({ overlayStrength: 'strong', textShadow: 'medium' })}
                      className="flex-1 rounded-md border border-zinc-200 py-2 px-3 text-xs text-zinc-600 hover:border-zinc-400 transition-colors"
                    >
                      Improve Readability
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
