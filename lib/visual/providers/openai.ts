// lib/visual/providers/openai.ts
// DALL-E 3 implementation of ImageProvider.
// Uses raw fetch — no openai npm package required.
//
// CRITICAL: All DALL-E-specific behavior (size vocabulary, parameter names,
// response shape) must remain here. Never leak provider details into
// generateImage.ts or the prompt compilation layer.

import type { AspectRatio, GeneratedImage, ImageProvider } from '../types/visual'

// DALL-E 3 only accepts these three sizes
const SIZE_MAP: Record<AspectRatio, '1024x1024' | '1792x1024' | '1024x1792'> = {
  square:    '1024x1024',
  landscape: '1792x1024',
  portrait:  '1024x1792',
}

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations'

class OpenAIImageProvider implements ImageProvider {
  constructor(private readonly apiKey: string) {}

  async generate(input: {
    prompt: string
    aspectRatio: AspectRatio
    quality?: 'standard' | 'hd'
    seed?: number
  }): Promise<GeneratedImage> {
    const startMs = Date.now()

    const body: Record<string, unknown> = {
      model:           'dall-e-3',
      prompt:          input.prompt,
      size:            SIZE_MAP[input.aspectRatio],
      quality:         input.quality ?? 'standard',
      n:               1,
      response_format: 'url',
    }

    const res = await fetch(OPENAI_IMAGES_URL, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const latencyMs = Date.now() - startMs

    if (!res.ok) {
      const text = await res.text()
      console.error('[visual/openai] provider error', { status: res.status, latencyMs, body: text })
      throw new Error(`OpenAI Images API ${res.status}: ${text}`)
    }

    const data = await res.json() as {
      data: Array<{ url: string; revised_prompt?: string }>
    }

    const item = data.data[0]
    if (!item?.url) throw new Error('OpenAI returned no image URL')

    console.log('[visual/openai] generation complete', {
      latencyMs,
      model:       'dall-e-3',
      aspectRatio: input.aspectRatio,
      quality:     input.quality ?? 'standard',
    })

    return {
      providerUrl:      item.url,
      revisedPrompt:    item.revised_prompt,
      provider:         'openai',
      providerMetadata: { latencyMs, size: SIZE_MAP[input.aspectRatio] },
    }
  }
}

// Singleton factory — callers import this, not the class
export function getOpenAIProvider(): ImageProvider {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  return new OpenAIImageProvider(apiKey)
}
