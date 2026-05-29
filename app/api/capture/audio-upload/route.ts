import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const clientMimeType = formData.get('mimeType') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const mimeType = (clientMimeType || file.type || 'audio/webm').split(';')[0]
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
  const filename = `${session.workspaceId}/${Date.now()}.${ext}`

  const supabase = createServiceClient()
  const arrayBuffer = await file.arrayBuffer()
  const { data, error } = await supabase.storage
    .from('voice-captures')
    .upload(filename, arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error || !data) {
    const detail = error?.message ?? 'Unknown storage error'
    console.error('[api/capture/audio-upload] upload failed', { error: detail, workspaceId: session.workspaceId, sizeBytes: file.size })
    return NextResponse.json({ error: `Upload failed: ${detail}` }, { status: 500 })
  }

  console.log('[api/capture/audio-upload] success', { path: data.path, sizeBytes: file.size, mimeType })
  return NextResponse.json({ path: data.path })
}
