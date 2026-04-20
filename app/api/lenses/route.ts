import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses, createLens } from '@/lib/domain/lens'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await listLenses({ workspaceId: session.workspaceId })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result.data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, description, system_prompt, tags } = body

  if (!name?.trim() || !system_prompt?.trim()) {
    return NextResponse.json(
      { error: 'name and system_prompt are required' },
      { status: 400 }
    )
  }

  const result = await createLens({
    workspaceId: session.workspaceId,
    createdBy: session.userId,
    name: name.trim(),
    description: description?.trim() ?? undefined,
    systemPrompt: system_prompt.trim(),
    scope: 'workspace',
    tags: Array.isArray(tags) ? tags : [],
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result.data, { status: 201 })
}
