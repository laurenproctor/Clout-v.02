import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput, updateOutput, createOutputVersion } from '@/lib/domain/output'
import type { OutputContent } from '@/types/domain'

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
  const { content, title, status, approve } = body

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
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result.data)
}
