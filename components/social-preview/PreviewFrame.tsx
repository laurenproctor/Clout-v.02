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

interface PreviewFrameProps {
  /** Native (unscaled) card width in px. */
  baseWidth: number
  /** Visual scale factor (1 = native). */
  scale: number
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function PreviewFrame({
  baseWidth,
  scale,
  children,
  className,
  style,
}: PreviewFrameProps) {
  const innerRef = React.useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = React.useState(0)

  React.useLayoutEffect(() => {
    const node = innerRef.current
    if (!node) return

    const measure = () => {
      // Intrinsic (pre-transform) height of the card.
      setHeight(node.offsetHeight)
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [scale, baseWidth])

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: baseWidth * scale,
        height: height ? height * scale : undefined,
        ...style,
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: baseWidth,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}
