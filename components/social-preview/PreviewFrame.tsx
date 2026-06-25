'use client'

import * as React from 'react'

/**
 * Renders a native-width preview card scaled by `scale`, while reserving the
 * correct SCALED layout box in the document.
 *
 * Why this is necessary: CSS `transform: scale()` does not affect layout — the
 * browser still reserves the element's pre-transform size. Without an explicit
 * reserved box, a scaled-down card overflows its container (compact panel,
 * modal) or leaves dead space. We measure the inner card's intrinsic height
 * with a ResizeObserver and reserve `width*scale` / `height*scale` on the outer
 * element.
 *
 * One native renderer + one measured scaled frame — the renderers never need to
 * know about `mode`/`scale`.
 */

/**
 * Lowest scale a `fit` frame will shrink to before letting the preview overflow
 * (and scroll) horizontally instead. Below this the "full" card becomes an
 * unreadable thumbnail, which defeats the purpose of a canonical renderer.
 */
const FIT_MIN_SCALE = 0.72

interface PreviewFrameProps {
  /** Native (unscaled) card width in px. */
  baseWidth: number
  /** Visual scale factor (1 = native). */
  scale: number
  /**
   * When true, the frame measures its container and scales the card DOWN to fit
   * the available width (never above `scale`, never below `FIT_MIN_SCALE`). If the
   * container is narrower than `baseWidth * FIT_MIN_SCALE`, the preview overflows
   * and the frame becomes horizontally scrollable rather than shrinking further.
   */
  fit?: boolean
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function PreviewFrame({
  baseWidth,
  scale,
  fit = false,
  children,
  className,
  style,
}: PreviewFrameProps) {
  const innerRef = React.useRef<HTMLDivElement | null>(null)
  const outerRef = React.useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = React.useState(0)
  // null = not yet measured → render at the mode's default scale as a fallback.
  const [containerWidth, setContainerWidth] = React.useState<number | null>(null)

  // Intrinsic (pre-transform) height of the card.
  React.useLayoutEffect(() => {
    const node = innerRef.current
    if (!node) return

    const measure = () => setHeight(node.offsetHeight)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [scale, baseWidth])

  // Container width (only when fitting). Observe the OUTER element — never the
  // scaled inner node — and only update on an actual integer-width change so the
  // observer can't oscillate into a render loop.
  React.useLayoutEffect(() => {
    // Only measure when fitting. When not fitting, `effectiveScale` ignores
    // `containerWidth` entirely, so a stale value is harmless and we avoid an
    // extra synchronous setState here.
    if (!fit) return
    const node = outerRef.current
    if (!node) return

    const measure = () => {
      const w = Math.floor(node.getBoundingClientRect().width)
      // Ignore 0-width measurements (pre-layout / detached) so we never collapse.
      if (w > 0) setContainerWidth((prev) => (prev === w ? prev : w))
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [fit, baseWidth])

  // Resolve the effective scale.
  let effectiveScale = scale
  if (fit && containerWidth != null) {
    const fitScale = containerWidth / baseWidth
    // Never upscale past the mode scale; never shrink past the readability floor.
    effectiveScale = Math.min(scale, Math.max(FIT_MIN_SCALE, fitScale))
  }

  return (
    <div
      ref={outerRef}
      className={className}
      style={{
        position: 'relative',
        // When fitting, the frame fills its column so we can measure it and so an
        // over-floor card can scroll horizontally inside it.
        width: fit ? '100%' : baseWidth * effectiveScale,
        height: height ? height * effectiveScale : undefined,
        overflowX: fit ? 'auto' : undefined,
        ...style,
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: baseWidth,
          transform: `scale(${effectiveScale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}
