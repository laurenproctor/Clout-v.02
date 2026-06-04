import {
  buildUTMParams,
  injectUTMIntoContent,
  type UTMParams,
  type UTMOutputContext,
} from '@/lib/analytics/utm'
import { loadUTMContext } from '@/lib/domain/publishing-context'

export type RenderResult = {
  body:        string
  utmParams:   UTMParams | null
  attribution: {
    applied:      boolean
    platform:     string
    urlsModified: number
  }
}

export async function renderOutputForPlatform(params: {
  workspaceId:   string
  platform:      string
  outputId:      string
  canonicalId:   string
  outputContext: UTMOutputContext
  body:          string
}): Promise<RenderResult> {
  const { workspaceId, platform, outputId, canonicalId, outputContext, body } = params

  if (!body.includes('http')) {
    return {
      body,
      utmParams: null,
      attribution: { applied: false, platform, urlsModified: 0 },
    }
  }

  const ctx = await loadUTMContext(workspaceId)
  const utmParams = buildUTMParams({
    platform,
    canonicalId,
    outputId,
    customSources: ctx.utmSettings,
    templates:     ctx.utmTemplates,
    outputContext,
  })

  const rendered = injectUTMIntoContent(body, utmParams)

  // Count modified URLs by comparing matched URLs before/after
  const urlMatches = body.match(/https?:\/\/[^\s<>"')\]]+/g) ?? []
  const urlsModified = urlMatches.filter((url, i) => {
    const after = (rendered.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [])[i]
    return after !== url
  }).length

  return {
    body: rendered,
    utmParams,
    attribution: { applied: urlsModified > 0, platform, urlsModified },
  }
}
