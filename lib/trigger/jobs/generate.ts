import { task, logger } from '@trigger.dev/sdk/v3'

// Job: run generation pipeline
// Triggered after a generation record is created with status='pending'
// Applies lens system_prompt + profile context to capture raw_content
// Calls Claude API, writes output back to generations + outputs tables
export const generateJob = task({
  id: 'generate-output',
  run: async (payload: { generation_id: string }) => {
    await logger.info('Generate job stub', { generation_id: payload.generation_id })
    // TODO: implement generation pipeline
    // 1. Load generation record (lens_id, profile_id, capture_id)
    // 2. Load lens system_prompt
    // 3. Load profile context (mental_models, philosophies, tone_notes)
    // 4. Load capture transcript/raw_content
    // 5. Call Claude API
    // 6. Write raw_response to generations
    // 7. Create output record with content JSONB
    // 8. Update generation status to 'complete'
  },
})
