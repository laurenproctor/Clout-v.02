import { task, logger } from '@trigger.dev/sdk/v3'

// Fires when a private capture is created.
// Pipeline:
//   1. Load capture (raw_content / transcript)
//   2. Load workspace profile (mental_models, philosophies, tone_notes)
//   3. Load system lens "Extract the Gold"
//   4. Build prompt: system_prompt + profile context + capture content
//   5. Call Claude (claude-sonnet-4-6)
//   6. Parse response into content (string) + insights [{title, body}]
//   7. Insert into private_enrichments via service client
export const enrichPrivateJob = task({
  id: 'enrich-private-capture',
  retry: { maxAttempts: 3 },
  run: async (payload: { capture_id: string; workspace_id: string }) => {
    await logger.info('Enrich private capture stub', {
      capture_id: payload.capture_id,
      workspace_id: payload.workspace_id,
    })
    // TODO: implement enrichment pipeline
  },
})
