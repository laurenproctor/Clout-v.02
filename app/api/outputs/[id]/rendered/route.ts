import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput } from '@/lib/domain/output'
import { renderOutputForPlatform } from '@/lib/domain/output-utm'
import { createServiceClient } from '@/lib/supabase/service'
import type { OutputContent } from '@/types/domain'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const result = await getOutput(id)
  if (!result.ok || result.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const output = result.data

  // Resolve platform: query param → assigned channel → fallback to 'linkedin'
  const platformParam = req.nextUrl.searchParams.get('platform')
  let platform = platformParam ?? null

  if (!platform && output.channelId) {
    const supabase = createServiceClient()
    const { data: channel } = await supabase
      .from('channels')
      .select('platform')
      .eq('id', output.channelId)
      .single()
    platform = channel?.platform ?? null
  }

  platform ??= 'linkedin'

  const outputContent = output.content as OutputContent & Record<string, unknown>

  const renderResult = await renderOutputForPlatform({
    workspaceId:   output.workspaceId,
    platform,
    outputId:      output.id,
    canonicalId:   output.generationGroupId ?? output.id,
    outputContext: {
      campaignName: outputContent.campaignName as string | undefined,
      cta:          outputContent.cta          as string | undefined,
      lensName:     outputContent.lensName     as string | undefined,
      voice:        outputContent.voiceRegister as string | undefined,
    },
    body: outputContent.body ?? '',
  })

  return NextResponse.json(renderResult)
}
