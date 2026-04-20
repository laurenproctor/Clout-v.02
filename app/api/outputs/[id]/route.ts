import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput, updateOutput, createOutputVersion } from '@/lib/domain/output'
import type { OutputContent } from '@/types/domain'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await getOutput(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  if (result.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(result.data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await getOutput(id)
  if (!existing.ok || existing.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { content, title, status, approve, channel_id } = body

  if (content) {
    await createOutputVersion({
      outputId: id,
      content: existing.data.content,
      editedBy: session.userId,
      changeSummary: 'Manual edit',
    })
  }

  const result = await updateOutput({
    outputId: id,
    ...(content && { content: content as OutputContent }),
    ...(title !== undefined && { title }),
    ...(status && { status }),
    ...(approve && { status: 'approved', approvedBy: session.userId }),
    ...(channel_id !== undefined && { channelId: channel_id === null ? null : channel_id }),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Dispatch output_ready email when an output is approved
  if (approve) {
    const supabase = await createClient()
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', session.userId)
      .single()

    if (user) {
      const outputTitle = result.data.title ?? 'Untitled output'
      const outputBody = typeof result.data.content?.body === 'string'
        ? result.data.content.body
        : JSON.stringify(result.data.content)

      const { dispatchEmail } = await import('@/lib/trigger/jobs/dispatch-email')
      await dispatchEmail.trigger({
        type: 'output_ready',
        outputId: id,
        userId: session.userId,
        email: user.email,
        outputTitle,
        outputBody,
      })
    }
  }

  return NextResponse.json(result.data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await getOutput(id)
  if (!existing.ok || existing.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('outputs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
