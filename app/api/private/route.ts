import { NextRequest, NextResponse } from 'next/server'

// GET /api/private
// Returns private captures for the authenticated user (raw feed)
// Query params: tags, limit, offset
export async function GET(req: NextRequest) {
  // TODO: authenticate via Clerk
  // TODO: resolve workspace_id from user session
  // TODO: call getPrivateFeed from lib/domain/private
  return NextResponse.json({ message: 'not implemented' }, { status: 501 })
}

// POST /api/private
// Creates a private capture and dispatches the enrich-private Trigger.dev job
// Body: { source, raw_content?, source_url?, tags? }
export async function POST(req: NextRequest) {
  // TODO: authenticate via Clerk
  // TODO: validate body
  // TODO: insert capture with is_private = true via lib/domain/capture
  // TODO: dispatch enrichPrivateJob with { capture_id, workspace_id }
  return NextResponse.json({ message: 'not implemented' }, { status: 501 })
}
