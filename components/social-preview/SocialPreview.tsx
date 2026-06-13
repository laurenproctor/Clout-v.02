'use client'

import * as React from 'react'
import { Maximize2 } from 'lucide-react'
import type { PreviewData, PreviewMode, PreviewTheme, PreviewPlatform, RendererProps } from './core/types'
import { getSpec } from './core/spec'
import { getModeConfig } from './core/scale'
import { PreviewFrame } from './PreviewFrame'

import { LinkedInPreview } from './renderers/LinkedInPreview'
import { XPreview } from './renderers/XPreview'
import { InstagramPreview } from './renderers/InstagramPreview'
import { ThreadsPreview } from './renderers/ThreadsPreview'
import { FacebookPreview } from './renderers/FacebookPreview'
import { BlueskyPreview } from './renderers/BlueskyPreview'
import { MastodonPreview } from './renderers/MastodonPreview'
import { GoogleBusinessPreview } from './renderers/GoogleBusinessPreview'
import { TikTokPreview } from './renderers/TikTokPreview'
import { SubstackPreview } from './renderers/SubstackPreview'
import { ArticlePreview } from './renderers/ArticlePreview'
import { FallbackPreview } from './renderers/FallbackPreview'

/**
 * The single public entry point for realistic post previews. It is PURE — it
 * never fetches. Callers resolve media/author via adapters + usePreviewAssets
 * and pass a fully-formed `PreviewData`.
 *
 *   <SocialPreview data={previewData} mode="compact" onExpand={openModal} />
 *
 * `mode` controls visual scale; `density` (derived from mode, or overridden)
 * controls content behavior. Each platform is rendered once at native width;
 * PreviewFrame reserves the scaled layout box.
 */

const RENDERERS: Record<PreviewPlatform, (props: RendererProps) => React.ReactNode> = {
  linkedin: LinkedInPreview,
  x: XPreview,
  instagram: InstagramPreview,
  threads: ThreadsPreview,
  facebook: FacebookPreview,
  bluesky: BlueskyPreview,
  mastodon: MastodonPreview,
  google_business: GoogleBusinessPreview,
  tiktok: TikTokPreview,
  substack: SubstackPreview,
  article: ArticlePreview,
  fallback: FallbackPreview,
}

export interface SocialPreviewProps {
  data: PreviewData
  mode?: PreviewMode
  theme?: PreviewTheme
  /** Override the density derived from `mode` (rare). */
  density?: RendererProps['density']
  /** When provided, renders an expand affordance (compact mode) that calls this. */
  onExpand?: () => void
  className?: string
}

export function SocialPreview({
  data,
  mode = 'full',
  theme = 'light',
  density,
  onExpand,
  className,
}: SocialPreviewProps) {
  const spec = getSpec(data.platform)
  const modeCfg = getModeConfig(mode)
  const resolvedDensity = density ?? modeCfg.density
  const Renderer = RENDERERS[data.platform] ?? FallbackPreview

  const showExpand = onExpand && mode !== 'full'

  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
      <PreviewFrame baseWidth={spec.baseWidth} scale={modeCfg.scale}>
        <Renderer data={data} theme={theme} density={resolvedDensity} />
      </PreviewFrame>

      {showExpand && (
        <button
          type="button"
          onClick={onExpand}
          aria-label="Expand preview"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 26,
            height: 26,
            borderRadius: 6,
            border: 'none',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Maximize2 size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
