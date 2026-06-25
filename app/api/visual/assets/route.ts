import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const outputId = req.nextUrl.searchParams.get('outputId')
  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const supabase = await createClient()
  // NOTE: must use a wildcard select. The table has a column named `mode`, which
  // PostgREST parses as the SQL ordered-set aggregate mode() in an explicit
  // column list — Postgres then rejects it with "WITHIN GROUP is required for
  // ordered-set aggregate mode". Double-quoting the column in the select string
  // does not reliably disambiguate via supabase-js, so we select '*' (no
  // per-column parsing) and the client reads the fields it needs.
  const { data, error } = await supabase
    .from('visual_assets')
    .select('*')
    .eq('output_id', outputId)
    .eq('workspace_id', session.workspaceId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
