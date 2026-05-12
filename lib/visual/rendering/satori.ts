// lib/visual/rendering/satori.ts
// Renders a React element to PNG via Satori → @resvg/resvg-js.
// Satori limitations (by design): no CSS transforms, no overflow:hidden on flex,
// no border-radius on images, no box-shadow, inline styles only.
// These constraints enforce compositional discipline — use them, don't fight them.

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import type { ReactElement } from 'react'

export interface SatoriFont {
  name: string
  data: ArrayBuffer
  weight: number
  style: 'normal' | 'italic'
}

export async function renderElementToPNG(
  element: ReactElement,
  width: number,
  height: number,
  fonts: SatoriFont[]
): Promise<Buffer> {
  const svg = await satori(element, {
    width,
    height,
    fonts: fonts.map(f => ({
      name:   f.name,
      data:   f.data,
      weight: f.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
      style:  f.style,
    })),
  })

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
  })
  return Buffer.from(resvg.render().asPng())
}
