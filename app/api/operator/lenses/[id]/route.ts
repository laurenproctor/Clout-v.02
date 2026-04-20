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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!await checkOperator(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lenses')
    .update({
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.system_prompt && { system_prompt: body.system_prompt }),
      ...(body.tags && { tags: body.tags }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('scope', 'system')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!await checkOperator(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  // Soft delete
  const { error } = await supabase
    .from('lenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('scope', 'system')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
