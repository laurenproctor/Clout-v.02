import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { inferIntent } from '@/lib/assistant/inferIntent'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const text: string = body.text ?? ''
  const profileName: string | undefined = body.profileName

  if (!text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  const intent = await inferIntent(text, profileName)
  return NextResponse.json(intent)
}
