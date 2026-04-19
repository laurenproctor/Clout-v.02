import { task, logger } from '@trigger.dev/sdk/v3'

// Job: transcribe a voice capture
// Triggered after a capture with source='voice' is created
// Reads audio from Supabase Storage, sends to transcription service,
// writes transcript back to captures.transcript
export const transcribeJob = task({
  id: 'transcribe-capture',
  run: async (payload: { capture_id: string }) => {
    await logger.info('Transcribe job stub', { capture_id: payload.capture_id })
    // TODO: implement transcription
  },
})
