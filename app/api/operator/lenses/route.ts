import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

async function checkOperator(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('operator_role')
    .eq('id', session.userId)
    .single()
  return !!data?.operator_role
}

export async function GET() {
  const session = await getSession()
  if (!await checkOperator(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lenses')
    .select()
    .eq('scope', 'system')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!await checkOperator(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name?.trim() || !body.system_prompt?.trim()) {
    return NextResponse.json({ error: 'name and system_prompt required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lenses')
    .insert({
      scope: 'system',
      workspace_id: null,
      created_by: session!.userId,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      system_prompt: body.system_prompt.trim(),
      tags: body.tags ?? [],
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
