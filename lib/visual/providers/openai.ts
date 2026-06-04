// lib/visual/providers/openai.ts
// gpt-image-1 implementation of ImageProvider.
// Uses raw fetch — no openai npm package required.
//
// CRITICAL: All provider-specific behavior (size vocabulary, parameter names,
// response shape) must remain here. Never leak provider details into
// generateImage.ts or the prompt compilation layer.

import type { AspectRatio, GeneratedImage, ImageProvider } from '../types/visual'

// gpt-image-1 size vocabulary (different from dall-e-3)
const SIZE_MAP: Record<AspectRatio, '1024x1024' | '1536x1024' | '1024x1536'> = {
  square:    '1024x1024',
  landscape: '1536x1024',
  portrait:  '1024x1536',
}

// gpt-image-1 quality mapping
const QUALITY_MAP: Record<'standard' | 'hd', 'medium' | 'high'> = {
  standard: 'medium',
  hd:       'high',
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
      model:           'chatgpt-image-latest',
      prompt:          input.prompt,
      size:            SIZE_MAP[input.aspectRatio],
      quality:         QUALITY_MAP[input.quality ?? 'standard'],
      n:               1,
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
      data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>
    }

    const item = data.data[0]
    if (!item) throw new Error('OpenAI returned no image data')

    // gpt-image-1 may return b64_json instead of url — handle both
    let providerUrl: string
    if (item.url) {
      providerUrl = item.url
    } else if (item.b64_json) {
      providerUrl = `data:image/png;base64,${item.b64_json}`
    } else {
      throw new Error('OpenAI returned neither url nor b64_json')
    }

    console.log('[visual/openai] generation complete', {
      latencyMs,
      model:       'chatgpt-image-latest',
      aspectRatio: input.aspectRatio,
      quality:     QUALITY_MAP[input.quality ?? 'standard'],
    })

    return {
      providerUrl,
      revisedPrompt:    item.revised_prompt,
      provider:         'openai',
      providerMetadata: { latencyMs, size: SIZE_MAP[input.aspectRatio] },
    }
  }
}

export function getOpenAIProvider(): ImageProvider {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  return new OpenAIImageProvider(apiKey)
}
