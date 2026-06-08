import { NextResponse } from 'next/server'
import '@/lib/trigger/jobs/cleanup-bluesky-oauth-states'
import '@/lib/trigger/jobs/compute-rollups'
import '@/lib/trigger/jobs/derive-feed-preferences'
import '@/lib/trigger/jobs/dispatch-email'
import '@/lib/trigger/jobs/enrich-private'
import '@/lib/trigger/jobs/generate'
import '@/lib/trigger/jobs/publish-scheduled'
import '@/lib/trigger/jobs/sync-analytics'
import '@/lib/trigger/jobs/transcribe'

// Trigger.dev webhook endpoint
// Trigger.dev v4 uses a separate CLI dev server; this route is a stub for local dev.
// In production, configure TRIGGER_SECRET_KEY and use the Trigger.dev dashboard.
export async function POST() {
  return NextResponse.json({ ok: true })
}
