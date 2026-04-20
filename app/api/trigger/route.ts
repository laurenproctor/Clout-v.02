import { NextResponse } from 'next/server'
import '@/lib/trigger/jobs/transcribe'
import '@/lib/trigger/jobs/generate'
import '@/lib/trigger/jobs/enrich-private'
import '@/lib/trigger/jobs/dispatch-email'

// Trigger.dev webhook endpoint
// Trigger.dev v4 uses a separate CLI dev server; this route is a stub for local dev.
// In production, configure TRIGGER_SECRET_KEY and use the Trigger.dev dashboard.
export async function POST() {
  return NextResponse.json({ ok: true })
}
