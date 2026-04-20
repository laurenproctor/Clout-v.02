import { task, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'

// Uses OpenAI Whisper API via fetch — no SDK needed
async function transcribeAudio(audioBuffer: ArrayBuffer, filename: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), filename)
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Whisper API error: ${res.status} ${text}`)
  }

  const data = await res.json()
  return data.text as string
}

export const transcribeJob = task({
  id: 'transcribe-capture',
  retry: { maxAttempts: 2 },
  run: async (payload: { capture_id: string }) => {
    const { capture_id } = payload
    const supabase = createServiceClient()

    await logger.info('Starting transcription', { capture_id })

    // Load capture to get audio_path
    const { data: capture } = await supabase
      .from('captures')
      .select('audio_path, workspace_id, status')
      .eq('id', capture_id)
      .single()

    if (!capture?.audio_path) {
      await logger.error('No audio path on capture', { capture_id })
      return
    }

    // Mark as processing
    await supabase
      .from('captures')
      .update({ status: 'processing' })
      .eq('id', capture_id)

    // Download audio from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('voice-captures')
      .download(capture.audio_path)

    if (downloadError || !fileData) {
      await logger.error('Failed to download audio', { error: downloadError?.message })
      await supabase.from('captures').update({ status: 'failed' }).eq('id', capture_id)
      return
    }

    const audioBuffer = await fileData.arrayBuffer()
    const filename = capture.audio_path.split('/').pop() ?? 'audio.webm'

    // Transcribe
    let transcript: string
    try {
      transcript = await transcribeAudio(audioBuffer, filename)
    } catch (err) {
      await logger.error('Transcription failed', { error: String(err) })
      await supabase.from('captures').update({ status: 'failed' }).eq('id', capture_id)
      return
    }

    // Write transcript back and mark ready
    await supabase
      .from('captures')
      .update({
        transcript,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', capture_id)

    await logger.info('Transcription complete', {
      capture_id,
      transcript_length: transcript.length,
    })
  },
})
