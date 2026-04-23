import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const filename = `${session.workspaceId}/${Date.now()}.webm`

  const arrayBuffer = await file.arrayBuffer()
  const { data, error } = await supabase.storage
    .from('voice-captures')
    .upload(filename, arrayBuffer, {
      contentType: 'audio/webm',
      upsert: false,
    })

  if (error || !data) {
    console.error('[api/capture/audio-upload] upload failed', { error: error?.message, workspaceId: session.workspaceId })
    return NextResponse.json({ error: 'Upload failed', detail: error?.message }, { status: 500 })
  }

  console.log('[api/capture/audio-upload] success', { path: data.path, sizeBytes: file.size })
  return NextResponse.json({ path: data.path })
}
