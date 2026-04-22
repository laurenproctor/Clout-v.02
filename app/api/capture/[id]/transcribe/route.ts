import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: captureId } = await params
  const supabase = await createClient()

  // Load capture — must belong to this workspace
  const { data: capture, error: fetchError } = await supabase
    .from('captures')
    .select('id, audio_path, status, workspace_id')
    .eq('id', captureId)
    .eq('workspace_id', session.workspaceId)
    .single()

  if (fetchError || !capture) {
    return NextResponse.json({ error: 'Capture not found' }, { status: 404 })
  }
  if (!capture.audio_path) {
    return NextResponse.json({ error: 'No audio file on this capture' }, { status: 400 })
  }
  if (capture.status === 'ready') {
    return NextResponse.json({ status: 'ready' })
  }

  // Mark processing
  await supabase
    .from('captures')
    .update({ status: 'processing' })
    .eq('id', captureId)

  // Download audio from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('voice-captures')
    .download(capture.audio_path as string)

  if (downloadError || !fileData) {
    await supabase.from('captures').update({ status: 'failed' }).eq('id', captureId)
    return NextResponse.json({ error: 'Failed to download audio' }, { status: 500 })
  }

  // Call OpenAI Whisper
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    await supabase.from('captures').update({ status: 'failed' }).eq('id', captureId)
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  }

  const audioBuffer = await fileData.arrayBuffer()
  const filename = (capture.audio_path as string).split('/').pop() ?? 'audio.webm'

  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), filename)
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!whisperRes.ok) {
    const text = await whisperRes.text()
    await supabase.from('captures').update({ status: 'failed' }).eq('id', captureId)
    return NextResponse.json(
      { error: `Transcription failed: ${whisperRes.status} ${text}` },
      { status: 500 }
    )
  }

  const { text: transcript } = await whisperRes.json()

  // Save transcript and mark ready
  await supabase
    .from('captures')
    .update({
      transcript,
      raw_content: transcript,
      status: 'ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', captureId)

  return NextResponse.json({ status: 'ready', transcript })
}
