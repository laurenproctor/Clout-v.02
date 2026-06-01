// lib/visual/rendering/browser.ts
// Process-wide BrowserManager singleton — owns Chromium launch, retry, and recovery.
// PuppeteerRenderer calls only getBrowser(); it never launches Chromium directly.
//
// Serverless note: browser reuse is opportunistic. The pipeline must remain fully
// functional if every request launches a fresh browser due to cold starts or
// instance recycling. Never rely on browser persistence across invocations.

import chromium from '@sparticuz/chromium-min'
import puppeteer, { type Browser } from 'puppeteer-core'

const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

class BrowserManager {
  private static _instance: BrowserManager
  private browser: Browser | null = null

  static getInstance(): BrowserManager {
    if (!BrowserManager._instance) {
      BrowserManager._instance = new BrowserManager()
    }
    return BrowserManager._instance
  }

  async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser
    this.browser = await this.launchWithRetry()
    this.browser.on('disconnected', () => {
      console.warn('[BrowserManager] browser disconnected — will relaunch on next request')
      this.browser = null
    })
    return this.browser
  }

  async invalidate(): Promise<void> {
    await this.browser?.close().catch(() => {})
    this.browser = null
  }

  private async launchWithRetry(attempts = 3): Promise<Browser> {
    let lastErr: unknown
    for (let i = 0; i < attempts; i++) {
      try {
        const t0 = Date.now()
        console.info(`[BrowserManager] launching Chromium (attempt ${i + 1})…`)
        const executablePath = await chromium.executablePath(CHROMIUM_URL)
        const browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: null,
          executablePath,
          headless: true,
        })
        console.info(`[BrowserManager] Chromium ready in ${Date.now() - t0}ms`)
        return browser
      } catch (err) {
        lastErr = err
        console.warn(`[BrowserManager] launch attempt ${i + 1} failed:`, err)
      }
    }
    throw lastErr
  }
}

export const browserManager = BrowserManager.getInstance()
