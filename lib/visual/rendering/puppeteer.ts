// lib/visual/rendering/puppeteer.ts
// PuppeteerRenderer — renders an HTML string to PNG via headless Chromium.
// Responsibilities: page lifecycle, font readiness, screenshot, structured metrics.
// Browser acquisition is delegated entirely to BrowserManager.

import type { Renderer } from './renderer'
import { browserManager } from './browser'

export class PuppeteerRenderer implements Renderer {
  async render(html: string, width: number, height: number, templateId?: string): Promise<Buffer> {
    const renderId = crypto.randomUUID()
    const totalStart = Date.now()
    let browserLaunchMs = 0
    let screenshotMs = 0

    const t0 = Date.now()
    const browser = await browserManager.getBrowser()
    browserLaunchMs = Date.now() - t0

    const page = await browser.newPage()
    try {
      await page.setViewport({ width, height, deviceScaleFactor: 3 })
      await page.setContent(html, { waitUntil: 'domcontentloaded' })
      // Explicit font wait — required for custom brand fonts to render correctly
      await page.evaluate(async () => { await document.fonts.ready })

      const t1 = Date.now()
      const shot = await page.screenshot({ type: 'png' })
      screenshotMs = Date.now() - t1

      const totalMs = Date.now() - totalStart
      console.info('[PuppeteerRenderer] render complete', {
        renderId,
        templateId,
        width,
        height,
        browserLaunchMs,
        screenshotMs,
        renderMs: totalMs - screenshotMs - browserLaunchMs,
        totalMs,
        success: true,
      })

      return Buffer.from(shot)
    } catch (err) {
      // Invalidate browser — next request gets a fresh instance
      await browserManager.invalidate()
      console.error('[PuppeteerRenderer] render failed', {
        renderId,
        templateId,
        width,
        height,
        totalMs: Date.now() - totalStart,
        success: false,
        err,
      })
      throw err
    } finally {
      await page.close().catch(() => {})
    }
  }
}

export const defaultRenderer: Renderer = new PuppeteerRenderer()
